(function(module) {
	"use strict";

	var Comments = {};

	var db = require.main.require('./src/database'),
		meta = require.main.require('./src/meta'),
		posts = require.main.require('./src/posts'),
		topics = require.main.require('./src/topics'),
		user = require.main.require('./src/user'),
		groups = require.main.require('./src/groups'),
		fs = module.parent.require('fs'),
		path = module.parent.require('path'),
		async = module.parent.require('async'),
		winston = module.parent.require('winston');

	module.exports = Comments;

	Comments.getTopicIDByCommentID = function(commentID, callback) {
		db.getObjectField('blog-comments', commentID, function(err, tid) {
			callback(err, tid);
		});
	};

	Comments.getCommentData = function(req, res, callback) {
		var commentID = req.params.id,
			uid = req.user ? req.user.uid : 0;

		Comments.getTopicIDByCommentID(commentID, function(err, tid) {

			async.parallel({
				user: function(next) {
					user.getUserData(uid, next);
				},
				isAdministrator: function(next) {
					user.isAdministrator(uid, next);
				},
				isPublisher: function(next) {
					groups.isMember(uid, 'publishers', next);
				},
				category: function(next) {
					topics.getCategoryData(tid, next);
				},
				mainPost: function(next) {
					topics.getMainPost(tid, uid, next);
				}
			}, function(err, data) {
				var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
					url;

				hostUrls.forEach(function(hostUrl) {
					hostUrl = hostUrl.trim();
					if (hostUrl[hostUrl.length - 1] === '/') {
						hostUrl = hostUrl.substring(0, hostUrl.length - 1);
					}

					if (hostUrl === req.get('origin')) {
						url = req.get('origin');
					}
				});

				if (!url) {
					winston.warn('[nodebb-plugin-blog-comments] Origin (' + req.get('origin') + ') does not match hostUrls: ' + hostUrls.join(', '));
				}

				res.header("Access-Control-Allow-Origin", url);
				res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
				res.header("Access-Control-Allow-Credentials", "true");

				var top = true;
				var bottom = false;
				var compose_location = meta.config['blog-comments:compose-location'];
				if (compose_location == "bottom"){ bottom = true; top = false;}

				res.json({
					user: data.user,
					template: Comments.template,
					token: req.csrfToken(),
					isAdmin: !data.isAdministrator ? data.isPublisher : data.isAdministrator,
					isLoggedIn: !!uid,
					tid: tid,
					category: data.category,
					mainPost: data.mainPost ? data.mainPost[0] : null,
					atBottom: bottom,
					atTop: top
				});
			});
		});
	};

	Comments.publishArticle = function(req, res, callback) {
		var markdown = req.body.markdown,
			title = req.body.title,
			url = req.body.url,
			commentID = req.body.id,
			tags = req.body.tags,
			uid = req.user ? req.user.uid : 0,
			cid = JSON.parse(req.body.cid);

		if (cid === -1) {
			var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
				position = 0;

			hostUrls.forEach(function(hostUrl, i) {
				hostUrl = hostUrl.trim();
				if (hostUrl[hostUrl.length - 1] === '/') {
					hostUrl = hostUrl.substring(0, hostUrl.length - 1);
				}

				if (hostUrl === req.get('origin')) {
					position = i;
				}
			});

			cid = meta.config['blog-comments:cid'].toString() || '';
			cid = parseInt(cid.split(',')[position], 10) || parseInt(cid.split(',')[0], 10) || 1;
		}

		async.parallel({
			isAdministrator: function(next) {
				user.isAdministrator(uid, next);
			},
			isPublisher: function(next) {
				groups.isMember(uid, 'publishers', next);
			}
		}, function(err, userStatus) {
			if (!userStatus.isAdministrator && !userStatus.isPublisher) {
				return res.json({error: "Only Administrators or members of the publishers group can publish articles"});
			}

			topics.post({
				uid: uid,
				title: title,
				content: markdown,
				tags: tags ? JSON.parse(tags) : [],
				req: req,
				cid: cid
			}, function(err, result) {
				if (!err && result && result.postData && result.postData.tid) {
					posts.setPostField(result.postData.pid, 'blog-comments:url', url, function(err) {
						if (err) {
							return res.json({error: "Unable to post topic", result: result});		
						}
						
						db.setObjectField('blog-comments', commentID, result.postData.tid);
						res.redirect((req.header('Referer') || '/') + '#nodebb-comments');
					});
				} else {
					res.json({error: "Unable to post topic", result: result});
				}
			});
		});

	};

	Comments.addLinkbackToArticle = function(post, callback) {
		var hostUrls = (meta.config['blog-comments:url'] || '').split(','),
			position;

		posts.getPostField(post.pid, 'blog-comments:url', function(err, url) {
			if (url) {
				hostUrls.forEach(function(hostUrl, i) {
					if (url.indexOf(hostUrl.trim().replace(/^https?:\/\//, '')) !== -1) {
						position = i;
					}
				});

				var blogName = (meta.config['blog-comments:name'] || '');
				blogName = parseInt(blogName.split(',')[position], 10) || parseInt(blogName.split(',')[0], 10) || 1;

				post.profile.push({
					content: "Posted from <strong><a href="+ url +" target='blank'>" + blogName + "</a></strong>"
				});
			}

			callback(err, post);
		});
	};

	Comments.addAdminLink = function(custom_header, callback) {
		custom_header.plugins.push({
			"route": "/blog-comments",
			"icon": "fa-book",
			"name": "Blog Comments"
		});

		callback(null, custom_header);
	};

	function renderAdmin(req, res, callback) {
		res.render('comments/admin', {});
	}

	Comments.init = function(params, callback) {
		var app = params.router,
			middleware = params.middleware,
			controllers = params.controllers;
			
		fs.readFile(path.resolve(__dirname, './public/templates/comments/comments.tpl'), function (err, data) {
			Comments.template = data.toString();
		});

		app.get('/comments/get/:id/:pagination?', middleware.applyCSRF, Comments.getCommentData);
		app.post('/comments/reply', Comments.replyToComment);
		app.post('/comments/publish', Comments.publishArticle);

		app.get('/admin/blog-comments', middleware.admin.buildHeader, renderAdmin);
		app.get('/api/admin/blog-comments', renderAdmin);

		callback();
	};

}(module));
