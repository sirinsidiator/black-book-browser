<script lang="ts">
    import { GameInstallEntry } from '$lib/GameInstallEntry';
    import MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import type StateManager from '$lib/StateManager';
    import GameInstallInfo from './GameInstallInfo.svelte';
    import MnfArchiveInfo from './MnfArchiveInfo.svelte';
    import { FolderEntry } from '$lib/FolderEntry.ts';
    import { FileEntry } from '$lib/FileEntry.ts';
    import FolderInfo from './FolderInfo.svelte';
    import FileInfo from './FileInfo.svelte';

    export let manager: StateManager;
    const content = manager.selectedContent;
</script>

{#if $content == null}
    <ion-text color="dark" class="welcome">
        Knowledge is only as wicked as the one who wields it.<br />
        Forsaking learning in fear of its misuse is the ultimate sin.<br />
        It is an unforgivable folly.<br />
    </ion-text>
{:else if $content instanceof GameInstallEntry}
    <GameInstallInfo gameInstall={$content} />
{:else if $content instanceof MnfArchiveEntry}
    <MnfArchiveInfo archive={$content} />
{:else if $content instanceof FolderEntry}
    <FolderInfo folder={$content} />
{:else if $content instanceof FileEntry}
    <FileInfo file={$content} />
{:else}
    <p>Unsupported content type for {$content?.label}</p>
{/if}

<style>
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
