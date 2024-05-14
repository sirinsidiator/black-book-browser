<script lang="ts">
    import ContentPreview from '$lib/frontend/preview/ContentPreview.svelte';
    import type { ContentPreviewLoader } from '$lib/frontend/preview/loader/ContentPreviewLoader';

    export let preview: Promise<ContentPreviewLoader> | undefined = undefined;
</script>

<div class="container">
    <div class="buttons">
        <slot name="buttons"></slot>
    </div>

    <ion-list class="details">
        <slot name="details"></slot>
    </ion-list>

    {#if preview}
        <div class="preview">
            <ContentPreview {preview} />
        </div>
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 56px - 13px);
    }

    .buttons,
    .details {
        flex-shrink: 0;
    }

    .preview {
        flex-grow: 1;
        margin: 15px 10px;
        overflow: auto;
        background: var(--ion-background-color);
    }
</style>
