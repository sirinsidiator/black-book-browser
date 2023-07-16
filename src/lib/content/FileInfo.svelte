<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';

    export let file: FileEntry;

    $: previewLoader = file.getPreviewLoader();
</script>

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
                {#if preview === null}
                    no preview available
                {:else}
                    <img src={preview.getDataUrl()} />
                {/if}
            {/await}
        </div>
    </ion-card-content>
</ion-card>
