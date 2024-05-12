<script lang="ts">
    import type { FolderEntry } from '$lib/FolderEntry';
    import type { MnfFileData } from '$lib/mnf/MnfFileData';
    import VirtualList from 'svelte-virtual-list-ce';

    export let folder: FolderEntry;

    function getDirParts(item: unknown) {
        const path = (item as MnfFileData).fileName;
        const parts = path.split('/');
        parts.pop(); // remove file name
        return parts;
    }

    function getFileName(item: unknown) {
        const path = (item as MnfFileData).fileName;
        const parts = path.split('/');
        const fullFileName = parts.pop();
        const fileNameParts = fullFileName!.split('.', 2);
        return fileNameParts[0];
    }

    function getFileExtension(item: unknown) {
        const path = (item as MnfFileData).fileName;
        const parts = path.split('/');
        const fullFileName = parts.pop();
        const fileNameParts = fullFileName!.split('.', 2);
        return fileNameParts[1];
    }
</script>

<VirtualList items={folder.mnfFiles} itemHeight={20} let:item>
    <div class="entry">
        {#each getDirParts(item) as part}{part}<span class="sep">/</span>{/each}<span class="name"
            >{getFileName(item)}</span
        ><span class="ext">.{getFileExtension(item)}</span>
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
