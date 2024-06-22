<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { isIgnoredPath } from '$lib/content/ignoredFilesFilterHelper';
    import { caretForwardOutline, warningOutline } from 'ionicons/icons';
    import { createEventDispatcher } from 'svelte';
    import FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    export let data: FileTreeEntryData<FileTreeEntryDataProvider>;
    export let selected: FileTreeEntryData<FileTreeEntryDataProvider> | undefined = undefined;
    export let checkable = false;
    export let levelOffset = 0;
    export let ignorePattern: string | undefined = undefined;

    $: opened = data.opened;
    $: checked = data.checked;
    $: indeterminate = data.indeterminate;
    $: busy = data.busy;
    $: failed = data.failed;
    $: hasChildren = data.hasChildren;
    $: ignored = !$hasChildren && isIgnoredPath(data.path, ignorePattern);

    const dispatch = createEventDispatcher();
    function onToggleOpen() {
        dispatch('open', data);
    }

    function onToggleChecked() {
        dispatch('change', data);
    }

    function onSelect() {
        dispatch('select', data);
    }
</script>

<div class="entry" style="--level: {levelOffset + data.level}">
    <!-- eslint-disable-next-line svelte/valid-compile -->
    <ion-button
        class="caret"
        class:open={$opened}
        class:hidden={$failed || !$hasChildren}
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
            checked={!ignored && $checked}
            indeterminate={!ignored && $indeterminate}
            disabled={ignored}
            on:ionChange={onToggleChecked}
        />
    {/if}

    <!-- eslint-disable-next-line svelte/valid-compile -->
    <ion-button
        class="content"
        class:selected={selected === data}
        class:ignored
        fill="clear"
        size="small"
        color={$failed ? 'danger' : 'medium'}
        disabled={ignored}
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

<style>
    .entry {
        display: flex;
        align-items: center;
        padding-left: calc(var(--level) * 1.2em);
        height: 27px;
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
        flex-shrink: 0;
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

    .content.ignored {
        text-decoration: line-through;
    }
</style>
