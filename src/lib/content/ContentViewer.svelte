<script lang="ts">
    import { FileEntry } from '$lib/FileEntry';
    import { FolderEntry } from '$lib/FolderEntry';
    import { GameInstallEntry } from '$lib/GameInstallEntry';
    import MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import type StateManager from '$lib/StateManager';
    import FileInfo from './FileInfo.svelte';
    import FolderInfo from './FolderInfo.svelte';
    import GameInstallInfo from './GameInstallInfo.svelte';
    import MnfArchiveInfo from './MnfArchiveInfo.svelte';

    export let manager: StateManager;
    const content = manager.selectedContent;

    function onExplore(event: CustomEvent<GameInstallEntry>) {
        console.log('explore', event.detail);
    }

    function onRemove(event: CustomEvent<GameInstallEntry>) {
        console.log('remove', event.detail);
        manager.gameInstallManager.remove(event.detail.path);
        manager.selectedContent.set(null);
    }
</script>

{#if $content == null}
    <ion-text color="dark" class="welcome">
        Knowledge is only as wicked as the one who wields it.<br />
        Forsaking learning in fear of its misuse is the ultimate sin.<br />
        It is an unforgivable folly.<br />
    </ion-text>
{:else}
    <ion-card>
        <ion-card-header>
            <ion-card-title color="dark">{$content.label}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
            {#if $content instanceof GameInstallEntry}
                <GameInstallInfo
                    gameInstall={$content}
                    on:explore={onExplore}
                    on:remove={onRemove}
                />
            {:else if $content instanceof MnfArchiveEntry}
                <MnfArchiveInfo archive={$content} />
            {:else if $content instanceof FolderEntry}
                <FolderInfo folder={$content} />
            {:else if $content instanceof FileEntry}
                <FileInfo file={$content} />
            {:else}
                <p>Unsupported content type</p>
            {/if}
        </ion-card-content>
    </ion-card>
{/if}

<style>
    ion-card {
        margin: 0;
        height: 100vh;
        overflow: auto;
    }

    .welcome {
        display: flex;
        height: 100%;
        justify-content: center;
        align-items: center;
        text-align: center;
        font-size: 1.6em;
        font-style: italic;
        font-family: serif;
    }
</style>
