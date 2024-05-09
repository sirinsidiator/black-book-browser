import type { FieldData } from '../util/BufferReader.js';
import BufferReader from '../util/BufferReader.js';
import {
    basename,
    decompress,
    dirname,
    extractFile,
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
    current: number;
    total: number;
    error?: unknown;
}

export interface ExtractFilesResult {
    success: number;
    failed: number;
    total: number;
}

export default class MnfArchive {
    public readonly fileSize: number;
    archiveFiles: Map<number, MnfArchiveFile>;
    fileEntries: Map<number, MnfEntry>;
    mnfEntries: Map<number, MnfEntry>;
    fileTableEntry?: MnfEntry;
    fileTable?: ZOSFileTable | null;
    // searchHelper: SearchHelper;

    constructor(
        public readonly path: string,
        public readonly file: BufferReader,
        public readonly data: FieldData
    ) {
        this.fileSize = file.getSize();
        this.archiveFiles = new Map();
        this.fileEntries = new Map();
        this.mnfEntries = new Map();
        // this.searchHelper = new SearchHelper(path);
    }

    async getContent(entry?: MnfEntry): Promise<Uint8Array> {
        if (!entry) {
            throw new Error('No entry provided');
        }

        const archiveFile = await this.getArchiveFile(entry);
        const named = entry.data.named;
        const compressionType = named['compressionType'].value as number;

        if (compressionType === 0) {
            return await archiveFile.loadContent(entry);
        } else {
            return await decompress(
                archiveFile.path,
                named['offset'].value as number,
                named['compressedSize'].value as number,
                named['fileSize'].value as number
            );
        }
    }

    async getFileTableContent(): Promise<Uint8Array> {
        return this.getContent(this.fileTableEntry);
    }

    async getArchiveFile(entry: MnfEntry): Promise<MnfArchiveFile> {
        const named = entry.data.named;
        const archiveNumber = named['archiveNumber'].value as number;
        if (!this.archiveFiles.has(archiveNumber)) {
            const prefix = await basename(this.path, '.mnf');
            const archiveName = prefix + ('0000' + archiveNumber).substr(-4) + '.dat';
            const archivePath = await resolve(await dirname(this.path), archiveName);
            const archivePrefix = await basename(archivePath, '.dat');
            const size = await getFileSize(archivePath);
            this.archiveFiles.set(
                archiveNumber,
                new MnfArchiveFile(archivePath, archivePrefix, size)
            );
        }
        return this.archiveFiles.get(archiveNumber) as MnfArchiveFile;
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
        let success = 0;
        let failed = 0;
        const total = request.files.length;
        const targetFolder = await resolve(request.targetFolder);
        const activeJobs: Set<Promise<void>> = new Set();
        const MAX_CONCURRENT = 200;
        for (let i = 0; i < total; ++i) {
            const file = request.files[i];
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
            const archiveFile = await this.getArchiveFile(fileEntry);

            if (activeJobs.size >= MAX_CONCURRENT) {
                await Promise.any(activeJobs);
            }

            const job = extractFile(target, archiveFile, fileEntry, request.decompressFiles)
                .then(
                    (result) => {
                        if (result) {
                            success++;
                        } else {
                            failed++;
                        }
                        onprogress({
                            current: success + failed,
                            total
                        });
                    },
                    (error) => {
                        console.warn(
                            'Failed to extract file',
                            fileEntry.fileName,
                            error,
                            file,
                            fileEntry
                        );
                        failed++;
                        onprogress({
                            current: success + failed,
                            total,
                            error
                        });
                    }
                )
                .finally(() => {
                    activeJobs.delete(job);
                });
            activeJobs.add(job);
        }
        await Promise.all(activeJobs);
        onprogress({
            current: request.files.length,
            total
        });
        return {
            success,
            failed,
            total: request.files.length
        };
    }

    async finalize() {
        if (this.fileTableEntry) {
            const zosftReader = new ZOSFileTableReader();
            const fileTable = (this.fileTable = await zosftReader.read(this));

            if (fileTable) {
                const noMnfEntryList: ZOSFileTableEntry[] = [];
                fileTable.forEach((tableEntry: ZOSFileTableEntry) => {
                    const fileEntry = this.fileEntries.get(tableEntry.getFileNumber());
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
                        fileEntry.fileName = tableEntry.fileName ?? 'unknown';
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

        // this.mnfEntries.forEach((entry: MnfEntry) => {
        //     this.searchHelper.addEntry(entry);
        // });
    }
}
