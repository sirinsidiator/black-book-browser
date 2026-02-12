<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { isIgnoredPath } from '$lib/content/ignoredFilesFilterHelper';
    import { caretForwardOutline, warningOutline } from 'ionicons/icons';
    import FileTreeEntryData from './FileTreeEntryData';
    import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

    interface Props {
        data: FileTreeEntryData<FileTreeEntryDataProvider>;
        selected: FileTreeEntryData<FileTreeEntryDataProvider> | undefined;
        checkable: boolean;
        levelOffset: number;
        ignorePattern?: string | undefined;
        onopen: (data: FileTreeEntryData<FileTreeEntryDataProvider>) => void;
        onchange: (data: FileTreeEntryData<FileTreeEntryDataProvider>) => void;
        onselect: (data: FileTreeEntryData<FileTreeEntryDataProvider>) => void;
    }

    let {
        data,
        selected,
        checkable,
        levelOffset,
        ignorePattern,
        onopen,
        onchange,
        onselect
    }: Props = $props();

    let opened = $derived(data.opened);
    let checked = $derived(data.checked);
    let indeterminate = $derived(data.indeterminate);
    let busy = $derived(data.busy);
    let failed = $derived(data.failed);
    let hasChildren = $derived(data.hasChildren);
    let ignored = $derived(!$hasChildren && isIgnoredPath(data.path, ignorePattern));

    function toggleOpen() {
        onopen(data);
    }

    function toggleChecked() {
        onchange(data);
    }

    function select() {
        onselect(data);
    }
</script>

<div class="entry" style="--level: {levelOffset + data.level}">
    <ion-button
        class="caret"
        class:open={$opened}
        class:hidden={$failed || !$hasChildren}
        fill="clear"
        size="small"
        color="medium"
        expand="block"
        disabled={$failed ? true : false}
        onclick={toggleOpen}
    >
        <ion-icon icon={caretForwardOutline}></ion-icon>
    </ion-button>

    {#if checkable}
        <ion-checkbox
            checked={!ignored && $checked}
            indeterminate={!ignored && $indeterminate}
            disabled={ignored}
            onionChange={toggleChecked}
        ></ion-checkbox>
    {/if}

    <ion-button
        class="content"
        class:selected={selected === data}
        class:ignored
        fill="clear"
        size="small"
        color={$failed ? 'danger' : 'medium'}
        disabled={ignored}
        onclick={select}
        ondblClick={toggleOpen}
    >
        {#if $busy}
            <ion-spinner class="busyIcon" color="medium"></ion-spinner>
        {:else if $failed}
            <ion-icon class="typeIcon" icon={warningOutline}></ion-icon>
        {:else}
            <ion-icon class="typeIcon" icon={data.icon}></ion-icon>
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
