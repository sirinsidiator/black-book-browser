// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type FileSearchEntry from '$lib/FileSearchEntry.js';
import type { FolderStats } from '$lib/FolderEntry.js';
import fuzzysort from 'fuzzysort';
import type { FieldData } from '../util/BufferReader.js';
import BufferReader from '../util/BufferReader.js';
import {
    basename,
    decompress,
    dirname,
    extractFiles,
    getExtractFileProgress,
    getFileSize,
    resolve
} from '../util/FileUtil.js';
import type ZOSFileTable from '../zosft/ZOSFileTable.js';
import type ZOSFileTableEntry from '../zosft/ZOSFileTableEntry.js';
import ZOSFileTableReader from '../zosft/ZOSFileTableReader.js';
import MnfArchiveFile from './MnfArchiveFile.js';
import type MnfEntry from './MnfEntry.js';
import type { MnfFileData } from './MnfFileData.js';

export interface ExtractFilesRequest {
    archivePath: string;
    targetFolder: string;
    rootPath: string;
    preserveParents: boolean;
    decompressFiles: boolean;
    files: MnfFileData[];
}

export interface ExtractFilesProgress {
    done: number;
    errors: string[];
}

export interface ExtractFilesResult {
    success: number;
    failed: number;
    total: number;
    errors: string[];
}

export default class MnfArchive {
    public readonly fileSize: number;
    archiveFiles: Map<number, MnfArchiveFile>;
    fileEntries: Map<number, MnfEntry>;
    mnfEntries: Map<number, MnfEntry>;
    fileTableEntry?: MnfEntry;
    fileTable?: ZOSFileTable | null;
    private searchEntries?: FileSearchEntry[];

    constructor(
        public readonly path: string,
        public readonly file: BufferReader,
        public readonly data: FieldData
    ) {
        this.fileSize = file.getSize();
        this.archiveFiles = new Map();
        this.fileEntries = new Map();
        this.mnfEntries = new Map();
    }

    async initArchiveFiles(numArchiveFiles: number) {
        for (let i = 0; i < numArchiveFiles; i++) {
            const prefix = await basename(this.path, '.mnf');
            const archiveName = prefix + i.toString().padStart(4, '0') + '.dat';
            const archivePath = await resolve(await dirname(this.path), archiveName);
            const archivePrefix = await basename(archivePath, '.dat');
            const size = await getFileSize(archivePath);
            this.archiveFiles.set(i, new MnfArchiveFile(archivePath, archivePrefix, size));
        }
    }

    async getContent(entry?: MnfEntry): Promise<Uint8Array> {
        if (!entry) {
            throw new Error('No entry provided');
        }

        const archiveFile = this.getArchiveFile(entry);

        if (entry.compressionType === 0) {
            return await archiveFile.loadContent(entry);
        } else {
            if (
                entry.offset === undefined ||
                entry.compressedSize === undefined ||
                entry.fileSize === undefined
            ) {
                throw new Error('Entry offset, compressed size or file size is not defined');
            }
            return await decompress(
                archiveFile.path,
                entry.offset,
                entry.compressedSize,
                entry.fileSize
            );
        }
    }

    async getFileTableContent(): Promise<Uint8Array> {
        return this.getContent(this.fileTableEntry);
    }

    getArchiveFile(entry: MnfEntry): MnfArchiveFile {
        const archiveNumber = entry.archiveNumber;
        const file = this.archiveFiles.get(archiveNumber ?? -1);
        if (!file) {
            console.warn('Archive file not found for', entry);
            throw new Error('Archive file not found');
        }
        return file;
    }

    getMnfEntriesForFolder(path: string): MnfEntry[] {
        if (path !== '/') {
            path += '/';
        }
        const entries: MnfEntry[] = [];
        this.mnfEntries.forEach((entry: MnfEntry) => {
            if (entry.fileName?.startsWith(path)) {
                entries.push(entry);
            }
        });
        return entries;
    }

    getMnfEntry(path: string): MnfEntry | null {
        console.warn('getMnfEntry not implemented', path);
        // return this.searchHelper.getByPath(path);
        return null;
    }

    async extractFiles(
        request: ExtractFilesRequest,
        onprogress: (progress: ExtractFilesProgress) => void
    ): Promise<ExtractFilesResult> {
        const targetFolder = await resolve(request.targetFolder);
        const files: {
            target: string;
            archiveFile: MnfArchiveFile;
            fileEntry: MnfEntry;
        }[] = [];
        for (const file of request.files) {
            const fileEntry = this.mnfEntries.get(file.fileNumber);
            if (!fileEntry) {
                console.warn('file entry not found for', file);
                continue;
            }
            if (!fileEntry.fileName) {
                console.warn('file entry has no name', fileEntry);
                continue;
            }
            const target =
                targetFolder + '/' + fileEntry.fileName.substring(request.rootPath.length);
            const archiveFile = this.getArchiveFile(fileEntry);
            files.push({ target, archiveFile, fileEntry });
        }

        onprogress({
            done: 0,
            errors: []
        });
        const handle = setInterval(() => {
            getExtractFileProgress().then((progress) => {
                onprogress(progress);
            }, console.error);
        }, 200);
        const result = await extractFiles(files, request.decompressFiles);
        clearInterval(handle);

        // make sure we got all errors
        const progress = await getExtractFileProgress();
        onprogress(progress);
        return result;
    }

    async finalize() {
        if (this.fileTableEntry) {
            const zosftReader = new ZOSFileTableReader();
            const fileTable = (this.fileTable = await zosftReader.read(this));

            if (fileTable) {
                const noMnfEntryList: ZOSFileTableEntry[] = [];
                fileTable.forEach((tableEntry: ZOSFileTableEntry) => {
                    const fileEntry = this.fileEntries.get(tableEntry.fileNumber);
                    if (!fileEntry) {
                        noMnfEntryList.push(tableEntry);
                    } else if (fileEntry.tableEntry) {
                        console.warn(
                            'Mnf entry already has a zosft entry associated',
                            fileEntry,
                            tableEntry
                        );
                    } else {
                        tableEntry.fileEntry = fileEntry;
                        fileEntry.fileName = tableEntry.fileName;
                        fileEntry.tableEntry = tableEntry;
                    }
                });
                console.warn(
                    'Found',
                    noMnfEntryList.length,
                    'entries without mnf entry',
                    noMnfEntryList
                );
            } else {
                console.warn('file table is null');
            }
            this.fileTableEntry.fileName = '/filetable.zosft';
        } else {
            console.warn('no file table detected in', this.path);
        }
    }

    getSearchEntries(): FileSearchEntry[] {
        if (!this.searchEntries) {
            const searchEntries: FileSearchEntry[] = [];
            this.mnfEntries.forEach((entry: MnfEntry) => {
                if (entry.fileName) {
                    searchEntries.push({
                        archive: this.path,
                        file: entry.fileName,
                        data: fuzzysort.prepare(entry.fileName)
                    });
                }
            });
            this.searchEntries = searchEntries;
        }
        return this.searchEntries;
    }

    getFolderStats(folderPath: string): FolderStats {
        let compressedSize = 0;
        let decompressedSize = 0;
        const folders = new Set<string>();
        for (const file of this.mnfEntries.values()) {
            if (file.fileName?.startsWith(folderPath)) {
                compressedSize += file.compressedSize ?? 0;
                decompressedSize += file.fileSize ?? 0;
                const parts = file.fileName.slice(folderPath.length).split('/');
                parts.pop(); // Remove file name
                let path = '';
                for (const part of parts) {
                    path += '/' + part;
                    folders.add(path);
                }
            }
        }
        return {
            folderCount: folders.size,
            compressedSize,
            decompressedSize
        };
    }
}
