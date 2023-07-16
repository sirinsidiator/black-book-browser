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

{#if $content instanceof GameInstallEntry}
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
