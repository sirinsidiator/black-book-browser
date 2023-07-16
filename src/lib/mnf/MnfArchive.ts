import { basename, dirname, resolve, sep } from '@tauri-apps/api/path';
import FileTreeNodeType from '../frontend/FileTreeEntryType.js';
import BufferReader from '../util/BufferReader.js';
import type { FieldData } from '../util/BufferReader.js';
import { decompress, getFileSize, mkdir, writeFile } from '../util/FileUtil.js';
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
            const archivePath = (await dirname(this.path)) + sep + archiveName;
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
        mkdir(await dirname(target));
        const content = await this.getContent(fileEntry, decompress);
        await writeFile(target, content, true);
    }

    async finalize() {
        if (this.fileTableEntry) {
            const zosftReader = new ZOSFileTableReader();
            const fileTable = (this.fileTable = await zosftReader.read(this));

            if (fileTable) {
                fileTable.forEach((tableEntry: ZOSFileTableEntry) => {
                    const fileEntry = this.fileEntries.get(tableEntry.getFileNumber());
                    if (!fileEntry) {
                        console.warn('No mnf entry for', tableEntry.fileName, tableEntry);
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

    async getDirectoryEntries(folder: string, withIds = true): Promise<JSTreeNodeSettings[]> {
        const entries: JSTreeNodeSettings[] = [];
        const prefix = folder === '/' ? '/' : folder + '/';
        const ids: any = {};
        for (const mnfEntry of this.mnfEntries.values()) {
            if (mnfEntry.fileName?.startsWith(prefix)) {
                let dir = await dirname(mnfEntry.fileName);
                dir = dir.substr(prefix.length);
                const end = dir.indexOf('/');
                if (end > 0) {
                    dir = dir.substring(0, end);
                }
                const id = prefix + dir;
                if (!ids[id] && id !== prefix) {
                    const entry: JSTreeNodeSettings = {
                        text: await basename(id),
                        data: {
                            type: FileTreeNodeType.FOLDER,
                            path: id,
                            archivePath: this.path
                        },
                        children: true
                    };
                    entries.push(entry);
                    if (withIds) {
                        entry.id = id;
                        entry.parent = folder;
                    }
                    ids[id] = true;
                }

                if ((await dirname(mnfEntry.fileName)) === folder) {
                    const entry: JSTreeNodeSettings = {
                        text: await basename(mnfEntry.fileName),
                        data: {
                            type: FileTreeNodeType.FILE,
                            path: mnfEntry.fileName,
                            archivePath: this.path
                        },
                        type: 'file'
                    };
                    entries.push(entry);
                    if (withIds) {
                        entry.id = mnfEntry.fileName;
                        entry.parent = folder;
                    }
                }
            }
        }
        return entries;
    }

    getFileEntry(file: string): JSTreeNodeSettings[] {
        const entries: JSTreeNodeSettings[] = [];
        // const fileEntry = this.searchHelper.getByPath(file);
        // if (fileEntry) {
        //     entries.push({
        //         id: file,
        //         parent: dirname(file),
        //         text: basename(fileEntry.fileName ?? ''),
        //         data: {
        //             type: FileTreeNodeType.FILE
        //         },
        //         type: 'file'
        //     });
        // }
        return entries;
    }
}
