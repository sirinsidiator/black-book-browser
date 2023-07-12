<script lang="ts">
	import start from '$lib/esoextract';
	start();
</script>

<div id="left">
	<ul>
		<li><a href="#filetree">Browse</a></li>
		<li class="searchtab">
			<a href="#filesearch" draggable="false">
				<input id="filesearchinput" type="text" placeholder="Search file..." />
				<button class="regexButton" title="Toggle Regular Expression">.*</button>
				<button class="clearButton" title="Clear Search">X</button>
			</a>
		</li>
	</ul>
	<div id="filetree" />
	<div id="filesearch" />
</div>
<div id="right">
	<div id="contentview" style="display: none">
		<ul>
			<li style="display: none"><a href="#welcome">Welcome</a></li>
			<li><a href="#content">Content</a></li>
			<li><a href="#debug">Debug</a></li>
			<li class="patreonbutton">
				<a href="#patrons"><img alt="Patreon" src="images/patreon.png" /></a>
			</li>

			<li class="right"><a id="remove" href="#remove">Remove Folder</a></li>
			<li class="right"><a id="scan" href="#scan">Scan Archive</a></li>
			<li class="right"><a id="extract" href="#extract">Extract Files</a></li>
			<li class="right"><a id="save" href="#save">Save Preview</a></li>
		</ul>
		<div id="welcome">
			Knowledge is only as wicked as the one who wields it.<br />
			Forsaking learning in fear of its misuse is the ultimate sin.<br />
			It is an unforgivable folly.<br />
		</div>
		<div id="content" />
		<div id="debug" />
		<div id="patrons">
			<h1>Patrons</h1>
			<div id="activeList" />
			<div>Thank you for your continued support!</div>
			<div id="formerContainer">
				<h3>Former Patrons</h3>
				<div id="formerList" />
			</div>
			<button id="becomePatron"><img alt="Become A Patron" src="images/patron_button.png" /></button
			>
		</div>
	</div>
</div>

<div id="dialog">
	<div class="page1">
		<fieldset>
			<legend>Options</legend>
			<div class="options">
				<div class="line">
					<label for="extractTarget">Extract to:</label>
					<input type="text" name="target" id="extractTarget" />
					<button id="selectExtractTarget">Change</button>
					<input type="file" name="targetSource" id="extractTargetSource" />
				</div>
				<div class="line">
					<div id="extractPreserveLabel" class="checkboxLabel">Preserve parent folders:</div>
					<label for="extractPreserve" id="extractPreserveBox" class="checkboxButton">On</label>
					<input type="checkbox" name="preserve" id="extractPreserve" checked />
				</div>
				<div class="line">
					<div id="extractDecompressedLabel" class="checkboxLabel">Decompress files:</div>
					<label for="extractDecompressed" id="extractDecompressedBox" class="checkboxButton"
						>On</label
					>
					<input type="checkbox" name="decompressed" id="extractDecompressed" checked />
				</div>
			</div>
		</fieldset>
		<fieldset>
			<legend>Files</legend>
			<div class="filetree" />
		</fieldset>
		<div class="stats" />
	</div>
	<div class="page2">
		<div class="progress">
			<div class="progresslabel" />
		</div>
		<textarea class="log" readonly />
	</div>
</div>

<style>
	:global(html, body) {
		margin: 0;
		height: 100%;
		background-color: #202020;
		color: #f0f0f0;
		font-family: Verdana;
		font-size: 0.9em;
		overflow: hidden;
	}

	#left,
	#right {
		height: 100%;
		overflow: hidden;
	}

	#left {
		width: 500px;
		padding: 0;
		float: left;
		border-right: thick solid #666666;
	}

	:global(#left > .ui-tabs-panel) {
		width: 100%;
		height: calc(100% - 40px);
		overflow: hidden;
		background-color: #333333;
		padding: 0;
		margin: 0;
		position: absolute;
	}

	#filetree {
		z-index: 0;
	}

	#filesearch {
		z-index: 10;
	}

	:global(#filetree.hidden) {
		display: block !important;
	}

	:global(#left .jstree) {
		overflow: auto;
		height: calc(100% - 50px);
		width: 100%;
		margin: 0;
		padding: 0;
	}

	:global(.jstree-info) {
		width: 4px !important;
	}

	:global(#left > .ui-tabs-panel > button) {
		display: block;
		margin: 10px auto;
	}

	:global(#left > .ui-tabs-panel > button:disabled) {
		color: #666666;
	}

	:global(#left .jstree-anchor) {
		width: calc(100% - 30px);
	}

	:global(.truncate) {
		width: calc(100% - 35px);
		display: inline-flex;
	}

	:global(.truncate > span) {
		overflow: hidden;
		text-overflow: ellipsis;
		display: inline-block;
		max-width: fit-content;
		flex: 1 1 100px;
	}

	.searchtab {
		width: calc(100% - 100px);
		height: 31px;
	}

	.searchtab a {
		padding: 0 !important;
		height: 100%;
		width: 100%;
	}

	.searchtab button {
		position: absolute;
		top: 0;
		height: 31px;
		width: 31px;
		background: none;
		border: none;
		font-weight: bold;
		color: #eee;
		font-family: cursive;
		outline: none;
		cursor: pointer;
	}

	.searchtab .clearButton {
		right: 0;
	}

	.searchtab .regexButton {
		right: 32px;
	}

	:global(.searchtab button.active) {
		color: #7cd3ee;
	}

	.searchtab button:hover {
		color: #26b3f7;
	}

	#filesearchinput::placeholder {
		color: #eeeeee;
	}

	#filesearchinput {
		width: calc(100% - 80px);
		height: 100%;
		background: none;
		border: none;
		padding: 0 10px;
		color: #eeeeee;
		text-overflow: ellipsis;
		outline: none;
	}

	#welcome {
		display: flex;
		height: calc(100% - 100px);
		justify-content: center;
		align-items: center;
		text-align: center;
		font-size: 1.6em;
		font-style: italic;
		font-family: serif;
	}

	#contentview {
		height: 100%;
		padding: 0;
		border: none;
		background-color: transparent;
	}

	:global(#contentview li.ui-tabs-tab.right) {
		float: right;
	}

	:global(#contentview .selectionDetails) {
		list-style: none;
		width: 100%;
		height: 102px;
		padding: 0;
	}

	:global(#contentview .selectionDetails b) {
		display: inline-block;
		width: 175px;
	}

	#content {
		height: calc(100% - 100px);
	}

	:global(#content .preview, #content .textView) {
		display: flex;
		justify-content: center;
		align-items: center;
		height: calc(100% - 102px);
		background-color: #666666;
		overflow: auto;
	}

	:global(#contentview .CodeMirror) {
		height: 100%;
		width: 100%;
	}

	:global(#debug tr:nth-child(even), #contentview .selectionDetails li:nth-child(even)) {
		background-color: #292929;
	}

	:global(#debug tr:hover, #contentview .selectionDetails li:hover) {
		background-color: #333333;
	}

	:global(#debug table) {
		width: 100%;
	}

	:global(#debug td) {
		text-align: right;
		vertical-align: top;
	}

	:global(#debug td.text) {
		text-align: left;
	}

	:global(#debug ol) {
		margin: 0;
	}

	:global(#debug ol > li) {
		float: left;
		width: 110px;
		margin-right: 58px;
	}

	:global(#debug ul > li) {
		clear: left;
	}

	:global(.ui-progressbar) {
		position: relative;
	}

	:global(.ui-progressbar > .progresslabel) {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.ui-progressbar-value) {
		background-color: #0972a5;
	}

	#dialog .options > .line {
		display: flex;
		height: 30px;
	}

	#dialog .options label {
		width: 100px;
		line-height: 30px;
	}

	#dialog .options #selectExtractTarget {
		width: 80px;
		float: right;
		text-align: center;
		padding: 0;
	}

	#dialog .options #extractTarget {
		padding: 0 5px;
		width: 246px;
		background-color: #333;
		border: thin solid #444;
		color: #fff;
	}

	#dialog .options .checkboxLabel {
		width: 358px;
		line-height: 30px;
	}

	#dialog .options .checkboxButton {
		width: 80px;
		line-height: inherit;
	}

	#dialog .options input {
		width: 334px;
	}

	#dialog .options #extractTargetSource {
		display: none;
	}

	#dialog .page1 .filetree {
		height: 200px;
		width: 443px;
		overflow-y: auto;
	}

	#dialog .page1 fieldset {
		padding: 5px 10px 10px 10px;
		margin-bottom: 5px;
	}

	#dialog .page2 .log {
		width: calc(100% - 6px);
		height: 200px;
		white-space: pre;
		resize: none;
		background-color: #333;
		border: thin solid #444;
		color: #fff;
	}

	:global(.ui-dialog-buttonpane .status) {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		width: 80%;
		margin: 14px 0 0 10px;
	}

	:global(.ui-dialog-buttonpane .error) {
		margin: 14px 0 0 10px;
		color: #d02f2f;
		font-weight: bold;
	}

	.patreonbutton img {
		width: 20px;
		height: 20px;
	}
	.patreonbutton a {
		width: 32px;
		height: 32px;
		background-color: #666666;
		padding: 0 !important;
		display: flex;
		justify-content: center;
		align-items: center;
	}

	#patrons button {
		background: transparent;
		border: none;
		cursor: pointer;
		width: 200px;
		height: 47px;
		padding: 0;
		position: sticky;
		bottom: 20px;
		margin: 0 auto;
	}

	#patrons button img {
		width: 200px;
		height: 47px;
	}

	#patrons {
		height: calc(100% - 100px);
		overflow: auto;
		text-align: center;
	}

	#patrons h1 {
		text-align: center;
	}

	#patrons h3 {
		text-align: center;
	}

	#patrons div {
		margin-bottom: 10px;
		padding: 10px;
	}

	:global(#patrons span) {
		display: inline-block;
		margin: 5px 10px;
	}

	:global(#patrons span.emph0) {
		font-size: 1em;
	}

	:global(#patrons span.emph2) {
		font-size: 2em;
	}

	:global(#patrons span.emph1) {
		font-size: 1.5em;
	}
</style>
