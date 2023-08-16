<script lang="ts">
    import type { ImageFilePreview } from '$lib/FileEntry';

    export let image: ImageFilePreview;
</script>

<div class="image-viewer">
    <img src={image.getDataUrl()} alt="content" />
</div>

<style>
    .image-viewer {
        background-color: #333;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
    }

    .image-viewer img {
        max-width: 100%;
        max-height: 100%;
    }
</style>
