<script lang="ts">
    import { open } from '@tauri-apps/api/dialog';
    import { add } from 'ionicons/icons';
    import FileTree from '$lib/tree/FileTree.svelte';
    import type StateManager from './StateManager';

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
</script>

<ion-content class="ion-padding">
    <FileTree entries={Array.from($gameInstalls)} />

    <ion-fab slot="fixed" vertical="bottom" horizontal="center">
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-fab-button on:click={addFolder}>
            <ion-icon icon={add} />
        </ion-fab-button>
    </ion-fab>
</ion-content>
