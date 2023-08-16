<script lang="ts">
    import { caretForwardOutline } from 'ionicons/icons';
    import FileTreeEntryData from './FileTreeEntryData';
    import { createEventDispatcher } from 'svelte';

    export let data: FileTreeEntryData;
    export let level = 0;
    export let checkable = false;

    const opened = data.opened;
    const checked = data.checked;
    const indeterminate = data.indeterminate;
    const busy = data.busy;
    const failed = data.failed;
    // const selectedContent = data.stateManager.selectedContent;

    const dispatch = createEventDispatcher();
    function onToggleOpen() {
        dispatch('toggleOpen', { id: data.id });
    }

    function onToggleChecked() {
        dispatch('toggleChecked', { id: data.id });
    }

    function onSelect(toggleOpen = false) {
        dispatch('select', { id: data.id, toggleOpen });
    }
</script>

<div class="entry" style="--level: {level}">
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
        class:selected={$selectedContent === data}
        fill="clear"
        size="small"
        color={$failed ? 'danger' : 'medium'}
        on:click={() => onSelect()}
        on:dblclick={() => onSelect(true)}
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
    {#if !$busy}
        {#each data.children as child}
            <svelte:self data={child} level={level + 1} {checkable} />
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
