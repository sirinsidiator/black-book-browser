import type { FieldData } from '../util/BufferReader.js';
import BufferReader from '../util/BufferReader.js';
import {
    basename,
    decompress,
    dirname,
    getFileSize,
    mkdir,
    resolve,
    writeFile
} from '../util/FileUtil.js';
import type ZOSFileTable from '../zosft/ZOSFileTable.js';
import type ZOSFileTableEntry from '../zosft/ZOSFileTableEntry.js';
import ZOSFileTableReader from '../zosft/ZOSFileTableReader.js';
import MnfArchiveFile from './MnfArchiveFile.js';
import type MnfEntry from './MnfEntry.js';

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

    async getContent(entry?: MnfEntry, doDecompress = true): Promise<Uint8Array> {
        if (!entry) {
            throw new Error('No entry provided');
        }

        const archiveFile = await this.getArchiveFile(entry);
        const named = entry.data.named;
        const compressionType = named['compressionType'].value as number;

        if (compressionType === 0 || !doDecompress) {
            return await archiveFile.loadContent(entry);
        } else {
            const decompressedBuffer = await decompress(
                archiveFile.path,
                named['offset'].value as number,
                named['compressedSize'].value as number,
                named['fileSize'].value as number
            );

            console.log('decompressedBuffer', decompressedBuffer);
            const reader = new BufferReader(decompressedBuffer);
            if (reader.getSize() >= 16 && reader.readUInt32(false) === 0) {
                // has some strange header which we skip for now (seen in game.mnf related archives)
                reader.skip(reader.readUInt32(false));
                reader.skip(reader.readUInt32(false));
                return reader.readToEnd();
            } else {
                return decompressedBuffer;
            }
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

    async extractFile(fileEntry: MnfEntry, targetFolder: string, root = '', decompress = true) {
        if (!fileEntry.fileName?.startsWith(root)) {
            console.warn('root mismatch for', fileEntry);
            throw new Error('The file root does not match the arguments');
        }

        if (root === fileEntry.fileName) {
            root = await dirname(root);
        }

        const target = await resolve(targetFolder, fileEntry.fileName.substring(root.length + 1));
        await mkdir(await dirname(target));
        const content = await this.getContent(fileEntry, decompress);
        await writeFile(target, content, true);
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
