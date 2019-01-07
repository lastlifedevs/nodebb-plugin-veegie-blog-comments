<!-- IF tid -->
	<a href="{relative_path}/topic/{tid}">Discuss this post on the Last Life Forum</a>
<!-- ELSE -->
	<!-- IF isAdmin -->
	<form action="{relative_path}/comments/publish" method="post">
		<button class="btn btn-primary">Publish this post to NodeBB</button>
		<input type="hidden" name="markdown" id="nodebb-content-markdown" />
		<input type="hidden" name="title" id="nodebb-content-title" />
		<input type="hidden" name="cid" id="nodebb-content-cid" />
		<input type="hidden" name="tags" id="nodebb-content-tags" />
		<input type="hidden" name="id" value="{article_id}" />
		<input type="hidden" name="url" value="{redirect_url}" />
		<input type="hidden" name="_csrf" value="{token}" />
	</form>
	<!-- ENDIF isAdmin -->
<!-- ENDIF tid -->
