<script lang="ts">
    import ContentViewer from '$lib/content/ContentViewer.svelte';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ion-tab tab="content">
    <ion-content>
        <ContentViewer manager={data.stateManager} />
    </ion-content>
</ion-tab>
