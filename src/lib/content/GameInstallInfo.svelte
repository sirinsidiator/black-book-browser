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

    const dispatch = createEventDispatcher();

    export let gameInstall: GameInstallEntry;

    function onRemove() {
        dispatch('remove', gameInstall);
    }
</script>

<!-- eslint-disable-next-line svelte/valid-compile -->
<ion-button color="danger" on:click={onRemove}>
    <ion-icon slot="start" icon={trashBinOutline} />
    remove from list
</ion-button>
<ion-list>
    <ion-item>
        <ion-icon icon={folderOpenOutline} />
        <ion-label class="label">game path</ion-label>
        <ion-label>{gameInstall.path}</ion-label>
    </ion-item>
    <ion-item>
        <ion-icon icon={pricetagOutline} />
        <ion-label class="label">version</ion-label>
        <ion-label>{gameInstall.version.version}</ion-label>
    </ion-item>
    <ion-item>
        <ion-icon icon={calendarOutline} />
        <ion-label class="label">build date</ion-label>
        <ion-label>{gameInstall.version.buildDate}</ion-label>
    </ion-item>
    <ion-item>
        <ion-icon icon={buildOutline} />
        <ion-label class="label">build number</ion-label>
        <ion-label>{gameInstall.version.buildNumber}</ion-label>
    </ion-item>
    {#each gameInstall.settings as entry}
        <ion-item>
            <ion-icon icon={settingsOutline} />
            <ion-label class="label">{entry[0]}</ion-label>
            <ion-label>{entry[1]}</ion-label>
        </ion-item>
    {/each}
</ion-list>

<style>
    .label {
        margin-left: 15px;
        flex: 0 0 200px;
        font-weight: bold;
    }
</style>
