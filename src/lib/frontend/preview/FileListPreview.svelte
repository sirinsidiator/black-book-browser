<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import VirtualList from 'svelte-virtual-list-ce';
    import type FileListPreviewLoader from './loader/FileListPreviewLoader';

    export let loader: FileListPreviewLoader;
</script>

<VirtualList items={loader.getFileList()} itemHeight={20} let:item>
    {@const path = loader.getPathParts(item)}
    <div class="entry">
        {#each path.directoryParts as part (part)}{part}<span class="sep">/</span>{/each}<span
            class="name">{path.fileName}</span
        ><span class="ext">.{path.extension}</span>
    </div>
</VirtualList>

<style>
    .entry {
        margin-left: 5px;
        font-size: 1.1em;
        height: 20px;
    }

    .sep {
        color: rgb(177, 177, 46);
    }

    .name {
        color: rgb(100, 160, 230);
    }

    .ext {
        color: rgb(87, 177, 132);
    }
</style>
