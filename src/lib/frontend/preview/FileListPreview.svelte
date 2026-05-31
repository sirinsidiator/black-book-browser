<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import SvelteVirtualList from '@humanspeak/svelte-virtual-list';
    import type FileListPreviewLoader from './loader/FileListPreviewLoader';

    interface Props {
        loader: FileListPreviewLoader;
    }

    let { loader }: Props = $props();
</script>

<SvelteVirtualList items={loader.getFileList()} defaultEstimatedItemHeight={20}>
    {#snippet renderItem(item)}
        {@const path = loader.getPathParts(item)}
        <div class="entry">
            {#each path.directoryParts as part (part)}{part}<span class="sep">/</span>{/each}<span
                class="name">{path.fileName}</span
            ><span class="ext">.{path.extension}</span>
        </div>
    {/snippet}
</SvelteVirtualList>

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
