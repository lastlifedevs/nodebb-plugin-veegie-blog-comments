# NodeBB Blog Comments - Simple Topic Link

A heavily-simplified fork of [nodebb-plugin-blog-comments](https://github.com/psychobunny/nodebb-plugin-blog-comments/) by [Andrew Rodrigues](https://github.com/psychobunny), replacing the comment thread display with a link to the created NodeBB topic. Only supports Ghost as of now, though it should be simple enough to adapt to Wordpress or a general PHP blog if you need to.

### Ghost Installation

Paste this any where in `yourtheme/post.hbs`, somewhere between `{{#post}}` and `{{/post}}`.

```html
<div id="nodebb"></div>
<!-- Use the nbb-post-header div to include any content you want to include that isn't part of the Ghost API post endpoint "html" field. It can also be left empty. This example adds the feature image, if one exists. -->
<div id="nbb-post-header" class="display-none"> 
    {{#if feature_image}}
	<div>
		<img src="{{../post.feature_image}}" alt="{{../post.title}}" />
	</div>
	{{/if}}
</div>
<div id="nbb-post-html" class="display-none"></div>
```
Then place the following script inside a {{#contentfor "scripts"}} block in your post.hbs template. All you have to edit is line 3 (`nbb.url`) - put the URL to your NodeBB forum's home page here.

```html
<script type="text/javascript">
var nbb = {};
nbb.url = '//your.nodebb.com'; // EDIT THIS
nbb.cid = 1;	// OPTIONAL. Forces a Category ID in NodeBB.
				//  Omit it to fallback to specified IDs in the admin panel.

(function() {
nbb.articleID = '{{../post.id}}'; nbb.title = '{{../post.title}}';
nbb.tags = [{{#../post.tags}}"{{name}}",{{/../post.tags}}];
nbb.script = document.createElement('script'); nbb.script.type = 'text/javascript'; nbb.script.async = true;
nbb.script.src = nbb.url + '/plugins/nodebb-plugin-veegie-blog-comments/lib/ghost.js';
(document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(nbb.script);
})();
$.get(ghost.url.api('posts/'+nbb.articleID, {absolute_urls: true})).done(function (data){
    document.getElementById('nbb-post-html').innerHTML = data.posts[0].html.replace('http://' + document.location.host, 'https://' + document.location.host);
}).fail(function  (err){
	console.log(err);
});
</script>
```

The corresponding {{{block "scripts"}}} definition will have to be placed at a point where jQuery has already been loaded. `default.hbs` is probably a good place for this.

As the latest version of Ghost no longer provides a Markdown template helper, nor a Markdown field from its `post` API endpoint, this fork uses the `html` field instead.

We retrieve the HTML content via the Ghost API using AJAX rather than through the Handlebars helper. We do this because, while you can retrieve the raw HTML of a post, there is currently no way to specify the use of absolute URLs for any embedded content using the Handlebars helper. As such, images and other uploaded content will not display properly. Using the API with the `absolute_urls` option alleviates this. Then we do a `.replace` to ensure that all embedded content from the same site is done using https, as the default is http for some reason.

The post's HTML is then parsed using [Turndown](https://github.com/domchristie/turndown) to generate the Markdown used in the resulting forum post. Of course, this process isn't perfect (embedded tweets in the new Ghost editor become block-quotes, for example), and may require some tweaks for your specific blog/forum.

### Publishing

Head over to the article that you'd like to publish. The code will detect if you're both an administrator of your blog and NodeBB (so ensure that you're logged into both) and will display a publish button if so.

You may also create a `publishers` group in NodeBB to allow a group of regular users to have publish rights.


### Multiple blogs

You may use a comma-separated entry of blogs in the ACP to support publishing from a network of separate blogs to your forum. You can also choose to put each blog in its own dedicated category, or place them all into one category.
