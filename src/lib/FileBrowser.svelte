<script lang="ts">
    import { open } from '@tauri-apps/api/dialog';
    import { add } from 'ionicons/icons';
    import FileBrowserEntry from './FileBrowserEntry.svelte';
    import type StateManager from './StateManager';
    import GameInstallManager from './frontend/GameInstallManager';

    export let manager: StateManager;
    const gameInstallManager = new GameInstallManager(manager);

    const gameInstalls = manager.gameInstalls;

    async function addFolder() {
        const selected = await open({
            directory: true
        });

        if (typeof selected === 'string') {
            gameInstallManager.add(selected);
        }
    }
</script>

<div class="filetree">
    {#await gameInstallManager.initialize()}
        loading
    {:then}
        {#each Array.from($gameInstalls.values()) as data}
            <FileBrowserEntry {data} />
        {/each}
    {/await}
</div>

<ion-content class="ion-padding">
    <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <ion-fab-button on:click={addFolder}>
            <ion-icon icon={add} />
        </ion-fab-button>
    </ion-fab>
</ion-content>

<style>
    .filetree {
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        height: 100%;
        padding: 0.5rem;
    }
</style>
