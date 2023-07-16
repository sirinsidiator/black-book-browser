<script lang="ts">
    import { GameInstallEntry } from '$lib/GameInstallEntry';
    import MnfArchiveEntry from '$lib/MnfArchiveEntry';
    import type StateManager from '$lib/StateManager';
    import GameInstallInfo from './GameInstallInfo.svelte';
    import MnfArchiveInfo from './MnfArchiveInfo.svelte';

    export let manager: StateManager;
    const content = manager.selectedContent;
</script>

{#if $content instanceof GameInstallEntry}
    <GameInstallInfo gameInstall={$content} />
{:else if $content instanceof MnfArchiveEntry}
    <MnfArchiveInfo archive={$content} />
{:else}
    <p>Unsupported content type for {$content?.label}</p>
{/if}
