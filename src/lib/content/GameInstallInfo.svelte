<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { GameInstallEntry } from '$lib/GameInstallEntry';
    import { openPath } from '@tauri-apps/plugin-opener';
    import {
        buildOutline,
        calendarOutline,
        folderOpenOutline,
        pricetagOutline,
        settingsOutline,
        trashBinOutline,
        warning
    } from 'ionicons/icons';
    import ContentLayout from './ContentLayout.svelte';
    import DetailEntry from './DetailEntry.svelte';

    interface Props {
        gameInstall: GameInstallEntry;
        onremove: (gameInstall: GameInstallEntry) => void;
    }

    let { gameInstall, onremove }: Props = $props();

    function remove() {
        onremove(gameInstall);
    }

    async function explore() {
        const path = gameInstall.path;
        await openPath(path);
    }
</script>

<ContentLayout>
    {#snippet buttons()}
        <ion-button color="danger" onclick={remove}>
            <ion-icon slot="start" icon={trashBinOutline}></ion-icon>
            remove from list
        </ion-button>

        <ion-button color="primary" onclick={explore}>
            <ion-icon slot="start" icon={folderOpenOutline}></ion-icon>
            open folder
        </ion-button>
    {/snippet}

    {#snippet details()}
        {#if gameInstall.failedToLoad}
            <ion-text class="warning" color="warning">
                <ion-icon icon={warning} color="warning"></ion-icon> Failed to scan for MNF files. The game
                install may be broken or inaccessible.</ion-text
            >
        {/if}

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
        {#each gameInstall.settings as entry (entry[0])}
            <DetailEntry icon={settingsOutline} label={entry[0]}>{entry[1]}</DetailEntry>
        {/each}
    {/snippet}
</ContentLayout>

<style>
    .warning {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 1.1rem;
        padding: 1rem;
        border-radius: 5px;
        border: 1px solid var(--ion-color-warning-tint);
    }
</style>
