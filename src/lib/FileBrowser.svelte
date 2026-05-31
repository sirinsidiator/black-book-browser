<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import FileTree from '$lib/tree/FileTree.svelte';
    import { redirectKeydown } from '$lib/utils/common';
    import { open } from '@tauri-apps/plugin-dialog';
    import { add } from 'ionicons/icons';
    import type StateManager from './StateManager.svelte';
    import FileTreeEntryData from './tree/FileTreeEntryData';
    import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

    interface Props {
        manager: StateManager;
    }

    let { manager }: Props = $props();

    const gameInstalls = $derived(manager.gameInstallManager.gameInstalls);

    async function addFolder() {
        const selected = await open({
            directory: true
        });

        if (typeof selected === 'string') {
            const gameInstall = await manager.gameInstallManager.add(selected);
            if (gameInstall) {
                manager.selectedContent = gameInstall;
            }
        }
    }

    function onselect(entry: FileTreeEntryData<FileTreeEntryDataProvider>) {
        console.log('Selected entry:', entry);
        manager.selectedContent = entry.data;
    }

    let entries = $derived(
        Array.from($gameInstalls.values()).map((install) => install.fileTreeEntry)
    );
</script>

<ion-content>
    {#await manager.gameInstallManager.initialize()}
        <div class="status">
            <p>Loading...</p>
            <ion-progress-bar type="indeterminate"></ion-progress-bar>
        </div>
    {:then}
        {#if entries.length === 0}
            <div class="status">
                <p>No game installs found</p>
            </div>
        {:else}
            <FileTree
                {entries}
                selectedContent={manager.selectedContent}
                {onselect}
                keyboardNavigationTarget={manager.extractDialogOpen ? null : document.body}
            />
        {/if}

        <ion-fab slot="fixed" vertical="bottom" horizontal="end">
            <!-- svelte-ignore a11y_interactive_supports_focus -->
            <ion-fab-button
                role="button"
                onclick={addFolder}
                onkeydown={redirectKeydown(addFolder)}
            >
                <ion-icon icon={add}></ion-icon>
            </ion-fab-button>
        </ion-fab>
    {:catch}
        <div class="status">
            <p>Failed to initialize</p>
        </div>
    {/await}
</ion-content>

<style>
    .status {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
    }

    .status {
        text-align: center;
    }
</style>
