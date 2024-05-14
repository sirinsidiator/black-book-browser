<script lang="ts">
    import { warningOutline } from 'ionicons/icons';
    import ContentPreviewText from './ContentPreviewText.svelte';
    import { ContentPreviewLoader } from './loader/ContentPreviewLoader';
    // load all preview loaders so that they can register themselves
    import './loader/FileListPreviewLoader';
    import './loader/FontPreviewLoader';
    import './loader/ImageFilePreviewLoader';
    import './loader/TextFilePreviewLoader';

    export let preview: Promise<ContentPreviewLoader>;
</script>

{#await preview}
    <ContentPreviewText loading={true}>loading...</ContentPreviewText>
{:then loader}
    <svelte:component this={loader.previewClass} {loader} />
    <!--  eslint-disable-next-line @typescript-eslint/no-unused-vars -->
{:catch _}
    <ContentPreviewText icon={warningOutline} warning={true}
        >failed to load preview</ContentPreviewText
    >
{/await}
