<script lang="ts">
    import type { GameInstallEntry } from '$lib/GameInstallEntry';
    import {
        buildOutline,
        calendarOutline,
        folderOpenOutline,
        pricetagOutline,
        settingsOutline,
        trashBinOutline
    } from 'ionicons/icons';
    import { createEventDispatcher } from 'svelte';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';

    const dispatch = createEventDispatcher();

    export let gameInstall: GameInstallEntry;

    function onRemove() {
        dispatch('remove', gameInstall);
    }
</script>

<ContentLayout>
    <svelte:fragment slot="buttons">
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button color="danger" on:click={onRemove}>
            <ion-icon slot="start" icon={trashBinOutline} />
            remove from list
        </ion-button>
    </svelte:fragment>

    <svelte:fragment slot="details">
        <DetailEntry icon={folderOpenOutline} label="game path">{gameInstall.path}</DetailEntry>
        <DetailEntry icon={pricetagOutline} label="version"
            >{gameInstall.version.version}</DetailEntry
        >
        <DetailEntry icon={calendarOutline} label="build date"
            >{gameInstall.version.buildDate}</DetailEntry
        >
        <DetailEntry icon={buildOutline} label="build number"
            >{gameInstall.version.buildNumber}</DetailEntry
        >
        {#each gameInstall.settings as entry}
            <DetailEntry icon={settingsOutline} label={entry[0]}>{entry[1]}</DetailEntry>
        {/each}
    </svelte:fragment>
</ContentLayout>
