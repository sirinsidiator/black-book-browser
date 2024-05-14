<script lang="ts">
    import { informationCircleOutline } from 'ionicons/icons';
    import ContentPreviewText from './ContentPreviewText.svelte';
    import type { ContentPreviewLoader } from './loader/ContentPreviewLoader';

    // eslint-disable-next-line svelte/valid-compile
    export let loader: Promise<ContentPreviewLoader>;
</script>

<ContentPreviewText icon={informationCircleOutline}>no preview available</ContentPreviewText>
