<script lang="ts">
    import { caretForwardOutline, warningOutline } from 'ionicons/icons';
    import { createEventDispatcher } from 'svelte';
    import FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    export let data: FileTreeEntryData<FileTreeEntryDataProvider>;
    export let selected: FileTreeEntryData<FileTreeEntryDataProvider>;
    export let level = 0;
    export let checkable = false;

    const opened = data.opened;
    const checked = data.checked;
    const indeterminate = data.indeterminate;
    const busy = data.busy;
    const failed = data.failed;
    const children = data.children;
    const hasChildren = data.hasChildren;

    async function onToggleOpen() {
        await data.toggleOpen();
    }

    function onToggleChecked() {
        data.toggleChecked();
    }

    const dispatch = createEventDispatcher();
    function onSelect() {
        dispatch('select', data);
    }
</script>

<div class="entry" style="--level: {level}">
    {#if $hasChildren}
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button
            class="caret"
            class:open={$opened}
            class:hidden={$failed}
            fill="clear"
            size="small"
            color="medium"
            expand="block"
            disabled={$failed ? true : false}
            on:click={onToggleOpen}
        >
            <ion-icon icon={caretForwardOutline} />
        </ion-button>
    {/if}

    {#if checkable}
        <ion-checkbox
            checked={$checked}
            indeterminate={$indeterminate}
            on:ionChange={onToggleChecked}
        />
    {/if}

    <!-- eslint-disable-next-line svelte/valid-compile -->
    <ion-button
        class="content"
        class:selected={selected === data}
        class:no-caret={!$hasChildren}
        fill="clear"
        size="small"
        color={$failed ? 'danger' : 'medium'}
        on:click={onSelect}
        on:dblclick={onToggleOpen}
    >
        {#if $busy}
            <ion-spinner class="busyIcon" color="medium" />
        {:else if $failed}
            <ion-icon class="typeIcon" icon={warningOutline} />
        {:else}
            <ion-icon class="typeIcon" icon={data.icon} />
        {/if}
        <ion-text>{data.label}</ion-text>
    </ion-button>
</div>

{#if $hasChildren}
    <div class="children" class:open={$opened}>
        {#if !$busy}
            {#each $children as child}
                <svelte:self data={child} level={level + 1} {checkable} {selected} on:select />
            {/each}
        {/if}
    </div>
{/if}

<style>
    .entry {
        display: flex;
        align-items: center;
        padding-left: calc(var(--level) * 1.2em);
    }

    ion-text {
        font-size: 0.95rem;
        width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0.1rem;
    }

    .typeIcon,
    .busyIcon {
        height: 18px;
        width: 18px;
        margin: 0 3px;
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

    .content.no-caret {
        margin-left: 27.2px;
    }

    .children {
        max-height: 0;
        transition: max-height 0.2s ease-in-out;
        overflow: hidden;
        flex: 0 0 auto;
    }

    .children.open {
        max-height: max-content;
    }
</style>
