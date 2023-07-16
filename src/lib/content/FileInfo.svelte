<script lang="ts">
    import { FileEntry, ImageFilePreview, TextFilePreview } from '$lib/FileEntry';
    import 'highlight.js/styles/base16/classic-dark.css';

    export let file: FileEntry;

    $: previewLoader = file.getPreviewLoader();
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<ion-list>
    <ion-item>
        <ion-label>file path</ion-label>
        <ion-input value={file.path} />
    </ion-item>
</ion-list>

<ion-card>
    <ion-card-content>
        <div class="preview">
            {#await previewLoader}
                loading...
            {:then preview}
                {#if preview instanceof ImageFilePreview}
                    <img src={preview.getDataUrl()} />
                {:else if preview instanceof TextFilePreview}
                    <pre><code class="hljs language-{preview.language}"
                            >{@html preview.getText()}</code
                        ></pre>
                {:else}
                    no preview available
                {/if}
            {/await}
        </div>
    </ion-card-content>
</ion-card>
