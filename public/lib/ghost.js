(function() {
	"use strict";
	
	var articlePath = window.location.protocol + '//' + window.location.host + window.location.pathname;

	var nodebbDiv;

	nodebbDiv = document.getElementById('nodebb');

	function newXHR() {
		try {
	        return XHR = new XMLHttpRequest();
	    } catch (e) {
	        try {
	            return XHR = new ActiveXObject("Microsoft.XMLHTTP");
	        } catch (e) {
	            return XHR = new ActiveXObject("Msxml2.XMLHTTP");
	        }
	    }
	}

	var XHR = newXHR(), pagination = 0;

	function normalizePost(post) {
		return post.replace(/href="\/(?=\w)/g, 'href="' + nbb.url + '/')
				.replace(/src="\/(?=\w)/g, 'src="' + nbb.url + '/');
	}

	XHR.onload = function() {
		if (XHR.status >= 200 && XHR.status < 400) {
			var data = JSON.parse(XHR.responseText), html;

			data.relative_path = nbb.url;
			data.redirect_url = articlePath;
			data.article_id = nbb.articleID;
			data.pagination = pagination;
		
			html = parse(data, data.template);
			nodebbDiv.innerHTML = normalizePost(html);

			if (data.tid) {
				if (data.user && data.user.uid) {
					var error = window.location.href.match(/error=[\S]*/);
					if (error) {
						if (error[0].indexOf('too-many-posts') !== -1) {
							error = 'Please wait before posting so soon.';
						} else if (error[0].indexOf('content-too-short') !== -1) {
							error = 'Please post a longer reply.';
						}

						document.getElementById('nodebb-error').innerHTML = error;
					}					
				}
			} else {
				if (data.isAdmin) {
					var html = document.getElementById('nbb-post-header').innerHTML;
					html += document.getElementById('nbb-post-html').innerHTML;

					document.getElementById('nodebb-content-title').value = nbb.title;
					document.getElementById('nodebb-content-html').value = html;
					document.getElementById('nodebb-content-articlePath').value = articlePath;
					document.getElementById('nodebb-content-cid').value = nbb.cid || -1;
					document.getElementById('nodebb-content-tags').value = JSON.stringify(nbb.tags);
				}
			}
		}
	};

	function reloadComments() {
		XHR.open('GET', nbb.url + '/comments/get/' + nbb.articleID + '/' + pagination, true);
		XHR.withCredentials = true;
		XHR.send();
	}

	reloadComments();

	var templates = {blocks: {}};
	function parse (data, template) {
		function replace(key, value, template) {
			var searchRegex = new RegExp('{' + key + '}', 'g');
			return template.replace(searchRegex, value);
		}

		function makeRegex(block) {
			return new RegExp("<!--[\\s]*BEGIN " + block + "[\\s]*-->[\\s\\S]*<!--[\\s]*END " + block + "[\\s]*-->", 'g');
		}

		function makeConditionalRegex(block) {
			return new RegExp("<!--[\\s]*IF " + block + "[\\s]*-->([\\s\\S]*?)<!--[\\s]*ENDIF " + block + "[\\s]*-->", 'g');
		}

		function getBlock(regex, block, template) {
			data = template.match(regex);
			if (data == null) return;

			if (block !== undefined) templates.blocks[block] = data[0];

			var begin = new RegExp("(\r\n)*<!-- BEGIN " + block + " -->(\r\n)*", "g"),
				end = new RegExp("(\r\n)*<!-- END " + block + " -->(\r\n)*", "g"),

			data = data[0]
				.replace(begin, "")
				.replace(end, "");

			return data;
		}

		function setBlock(regex, block, template) {
			return template.replace(regex, block);
		}

		var regex, block;

		return (function parse(data, namespace, template, blockInfo) {
			if (!data || data.length == 0) {
				template = '';
			}

			function checkConditional(key, value) {
				var conditional = makeConditionalRegex(key),
					matches = template.match(conditional);

				if (matches !== null) {
					for (var i = 0, ii = matches.length; i < ii; i++) {
						var conditionalBlock = matches[i].split(/<!-- ELSE -->/);

						var statement = new RegExp("(<!--[\\s]*IF " + key + "[\\s]*-->)|(<!--[\\s]*ENDIF " + key + "[\\s]*-->)", 'gi');

						if (conditionalBlock[1]) {
							// there is an else statement
							if (!value) {
								template = template.replace(matches[i], conditionalBlock[1].replace(statement, ''));
							} else {
								template = template.replace(matches[i], conditionalBlock[0].replace(statement, ''));
							}
						} else {
							// regular if statement
							if (!value) {
								template = template.replace(matches[i], '');
							} else {
								template = template.replace(matches[i], matches[i].replace(statement, ''));
							}
						}
					}
				}
			}

			for (var d in data) {
				if (data.hasOwnProperty(d)) {
					if (typeof data[d] === 'undefined') {
						continue;
					} else if (data[d] === null) {
						template = replace(namespace + d, '', template);
					} else if (data[d].constructor == Array) {
						checkConditional(namespace + d + '.length', data[d].length);
						checkConditional('!' + namespace + d + '.length', !data[d].length);

						namespace += d + '.';

						var regex = makeRegex(d),
							block = getBlock(regex, namespace.substring(0, namespace.length - 1), template);

						if (block == null) {
							namespace = namespace.replace(d + '.', '');
							continue;
						}

						var numblocks = data[d].length - 1,
							i = 0,
							result = "";

						do {
							result += parse(data[d][i], namespace, block, {iterator: i, total: numblocks});
						} while (i++ < numblocks);

						namespace = namespace.replace(d + '.', '');
						template = setBlock(regex, result, template);
					} else if (data[d] instanceof Object) {
						template = parse(data[d], d + '.', template);
					} else {
						var key = namespace + d,
							value = typeof data[d] === 'string' ? data[d].replace(/^\s+|\s+$/g, '') : data[d];

						checkConditional(key, value);
						checkConditional('!' + key, !value);

						if (blockInfo && blockInfo.iterator) {
							checkConditional('@first', blockInfo.iterator === 0);
							checkConditional('!@first', blockInfo.iterator !== 0);
							checkConditional('@last', blockInfo.iterator === blockInfo.total);
							checkConditional('!@last', blockInfo.iterator !== blockInfo.total);
						}

						template = replace(key, value, template);
					}
				}
			}

			if (namespace) {
				var regex = new RegExp("{" + namespace + "[\\s\\S]*?}", 'g');
				template = template.replace(regex, '');
				namespace = '';
			} else {
				// clean up all undefined conditionals
				template = template.replace(/<!-- ELSE -->/gi, 'ENDIF -->')
									.replace(/<!-- IF([^@]*?)ENDIF([^@]*?)-->/gi, '');
			}

			return template;

		})(data, "", template);
	}
}());
