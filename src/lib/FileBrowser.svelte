<script lang="ts">
    import { open } from '@tauri-apps/api/dialog';
    import { add } from 'ionicons/icons';
    import FileTree from '$lib/tree/FileTree.svelte';
    import type StateManager from './StateManager';
    import type GameInstallEntry from './GameInstallEntry';
    import FileTreeEntryData from './tree/FileTreeEntryData';

    export let manager: StateManager;

    const gameInstalls = manager.gameInstallManager.gameInstalls;
    console.log($gameInstalls);

    async function addFolder() {
        const selected = await open({
            directory: true
        });

        if (typeof selected === 'string') {
            manager.gameInstallManager.add(selected).catch(console.error);
        }
    }

    function createTreeEntry(data: GameInstallEntry) {
        return new FileTreeEntryData(data.path, data.name, data.icon, data.path, data);
    }
</script>

<ion-content class="ion-padding">
    {#await manager.gameInstallManager.initialize()}
        <div class="status">
            <p>Loading...</p>
            <ion-progress-bar type="indeterminate" />
        </div>
    {:then}
        <FileTree entries={$gameInstalls.values().map(createTreeEntry)} />
    
        <ion-fab slot="fixed" vertical="bottom" horizontal="center">
            <!-- eslint-disable-next-line svelte/valid-compile -->
            <ion-fab-button on:click={addFolder}>
                <ion-icon icon={add} />
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
