<!-- IF tid -->
	<a id="forumTopicLink" href="{relative_path}/topic/{tid}">Discuss this post on the forums</a>
<!-- ELSE -->
	<!-- IF isAdmin -->
	<form id="nbbPublishForm" action="{relative_path}/comments/publish" method="post">
		<button id="nbbPublishButton" class="btn btn-primary">Publish this post to NodeBB</button>
		<input type="hidden" name="html" id="nodebb-content-html" />
		<input type="hidden" name="articlePath" id="nodebb-content-articlePath" />
		<input type="hidden" name="title" id="nodebb-content-title" />
		<input type="hidden" name="cid" id="nodebb-content-cid" />
		<input type="hidden" name="tags" id="nodebb-content-tags" />
		<input type="hidden" name="id" value="{article_id}" />
		<input type="hidden" name="url" value="{redirect_url}" />
		<input type="hidden" name="_csrf" value="{token}" />
	</form>
	<!-- ENDIF isAdmin -->
<!-- ENDIF tid -->
