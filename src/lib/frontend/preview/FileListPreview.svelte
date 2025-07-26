<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import VirtualList from '../component/VirtualList.svelte';
    import type FileListPreviewLoader from './loader/FileListPreviewLoader';

    interface Props {
        loader: FileListPreviewLoader;
    }

    let { loader }: Props = $props();
</script>

<VirtualList items={loader.getFileList()} itemHeight={20}>
    {#snippet children(data)}
        {@const path = loader.getPathParts(data)}
        <div class="entry">
            {#each path.directoryParts as part (part)}{part}<span class="sep">/</span>{/each}<span
                class="name">{path.fileName}</span
            ><span class="ext">.{path.extension}</span>
        </div>
    {/snippet}
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
