import type ContentEntry from '$lib/ContentEntry';
import { FolderEntry } from '$lib/FolderEntry';
import MnfArchiveEntry from '$lib/MnfArchiveEntry';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import { get } from 'svelte/store';
import FileListPreview from '../FileListPreview.svelte';
import { ContentPreviewLoader, ContentPreviewLoaderFactory } from './ContentPreviewLoader';

interface PathParts {
    directoryParts: string[];
    fileName: string;
    extension: string;
}

export default class FileListPreviewLoader implements ContentPreviewLoader {
    public readonly previewClass = FileListPreview;
    public readonly canSave = true;

    constructor(public readonly folder: FolderEntry) {}

    public async prepare(): Promise<void> {}

    public save(): void {
        const folder = this.folder;
        const file = new Blob([folder.fileList], { type: 'text/plain' });
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        const archivePrefix = folder.archive.label.split('\\').pop()?.split('.').shift();
        a.download = archivePrefix + folder.path.replaceAll('/', '_') + 'filelist.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    public getFileList(): MnfFileData[] {
        return this.folder.mnfFiles;
    }

    public getPathParts(item: unknown): PathParts {
        const path = (item as MnfFileData).fileName;
        const parts = path.split('/');
        const fullFileName = parts.pop();
        const fileNameParts = fullFileName!.split('.', 2);
        return {
            directoryParts: parts,
            fileName: fileNameParts[0],
            extension: fileNameParts[1]
        };
    }
}

class FileListPreviewLoaderFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return content instanceof FolderEntry || content instanceof MnfArchiveEntry;
    }

    public create(content: ContentEntry) {
        let folder: FolderEntry;
        if (content instanceof MnfArchiveEntry) {
            folder = get(content.root) as FolderEntry;
        } else {
            folder = content as FolderEntry;
        }
        return new FileListPreviewLoader(folder);
    }
}
ContentPreviewLoader.registerLoader(new FileListPreviewLoaderFactory());
