// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type ContentEntry from '$lib/ContentEntry';
import { FolderEntry } from '$lib/FolderEntry';
import MnfArchiveEntry from '$lib/MnfArchiveEntry';
import type { MnfFileData } from '$lib/mnf/MnfFileData';
import { get } from 'svelte/store';
import FileListPreview from '../FileListPreview.svelte';
import {
    ContentPreviewLoader,
    ContentPreviewLoaderFactory,
    type ContentPreviewLoaderComponent
} from './ContentPreviewLoader';

interface PathParts {
    directoryParts: string[];
    fileName: string;
    extension: string;
}

export default class FileListPreviewLoader implements ContentPreviewLoader {
    public readonly component = FileListPreview as unknown as ContentPreviewLoaderComponent;
    public readonly canSave = true;

    constructor(public readonly folder: FolderEntry) {}

    public async prepare(): Promise<void> {
        // do nothing
    }

    public save(fileEnding?: string, suffix?: string): void {
        const folder = this.folder;
        let content = folder.fileList;
        console.log('save', fileEnding);
        if (fileEnding) {
            content = content
                .split('\n')
                .filter((line) => line.endsWith(fileEnding))
                .join('\n');
        }
        const file = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        const archivePrefix = folder.archive.label.split('\\').pop()?.split('.').shift() ?? '';
        a.download = archivePrefix + folder.path.replaceAll('/', '_') + (suffix ?? 'filelist.txt');
        a.click();
        URL.revokeObjectURL(url);
    }

    public getFileList(): MnfFileData[] {
        return this.folder.mnfFiles;
    }

    public getPathParts(item: unknown): PathParts {
        const path = (item as MnfFileData).fileName;
        const parts = path.split('/');
        const fullFileName = parts.pop() ?? path;
        const fileNameParts = fullFileName.split('.', 2);
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
            const root = get(content.root);
            if (!root) {
                throw new Error('MnfArchiveEntry root is not loaded');
            }
            folder = root;
        } else {
            folder = content as FolderEntry;
        }
        return new FileListPreviewLoader(folder);
    }
}
ContentPreviewLoader.registerLoader(new FileListPreviewLoaderFactory());
