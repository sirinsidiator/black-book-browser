<script lang="ts">
    import { caretForwardOutline } from 'ionicons/icons';
    import { writable } from 'svelte/store';
    import { FileEntry } from './FileEntry';
    import MnfArchiveEntry from './MnfArchiveEntry';
    import type { FileBrowserEntryData } from './StateManager';

    export let data: FileBrowserEntryData;
    export let level = 0;

    const opened = data.opened;
    const busy = data instanceof MnfArchiveEntry ? data.busy : writable(false);
    const error = data instanceof MnfArchiveEntry ? data.error : writable(null);
    const selected = data.stateManager.selectedContent;
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="entry" style="--level: {level}">
    <ion-button
        class="caret"
        class:open={$opened}
        class:hidden={$error || data instanceof FileEntry ? true : false}
        fill="clear"
        size="small"
        color="medium"
        expand="block"
        disabled={$error ? true : false}
        on:click={() => data.toggleOpen()}
    >
        <ion-icon icon={caretForwardOutline} />
    </ion-button>

    <ion-button
        class="content"
        class:selected={$selected === data}
        fill="clear"
        size="small"
        color={$error ? 'danger' : 'medium'}
        on:click={() => data.select()}
        on:dblclick={() => data.select(true)}
    >
        {#if $busy}
            <ion-spinner class="busyIcon" color="medium" />
        {:else}
            <ion-icon class="typeIcon" icon={data.icon} />
        {/if}
        <ion-text>{data.label}</ion-text>
    </ion-button>
</div>

<div class="children" class:open={$opened}>
    {#if !$busy && $opened}
        {#each data.children as child}
            <svelte:self data={child} level={level + 1} />
        {/each}
    {/if}
</div>

<style>
    .entry {
        display: flex;
        align-items: center;
        padding-left: calc(var(--level) * 1.5rem);
    }

    ion-text {
        font-size: 1.05rem;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0.1rem;
    }

    .busyIcon {
        height: 1.4em;
        margin-right: 0.25rem;
        margin-left: 0.25rem;
    }

    .typeIcon {
        margin-right: 0.5rem;
        margin-left: 0.5rem;
    }

    .caret {
        aspect-ratio: 1 / 1;
        --padding-start: 0;
        --padding-end: 0;
        margin: 0;
    }

    .caret.hidden {
        visibility: hidden;
    }

    .caret.open ion-icon {
        transform: rotate(45deg);
    }

    .content {
        --padding-start: 0;
        --padding-end: 0;
        margin: 0;
        text-transform: none;
        overflow: hidden;
        width: 100%;
        text-align: start;
    }

    .content.selected {
        background-color: var(--ion-color-light-tint);
    }

    .children {
        max-height: 0;
        transition: max-height 0.2s ease-in-out;
        overflow: hidden;
        flex: 0 0 auto;
    }

    .children.open {
        max-height: 100vh;
    }
</style>
