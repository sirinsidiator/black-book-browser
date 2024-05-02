<script lang="ts">
    import FileBrowser from '$lib/FileBrowser.svelte';
    import type { PageData } from './$types';

    export let data: PageData;
</script>

<ion-tab tab="browse">
    <ion-content>
        <FileBrowser manager={data.stateManager} />
    </ion-content>
</ion-tab>
