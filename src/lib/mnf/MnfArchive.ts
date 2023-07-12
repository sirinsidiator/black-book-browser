import { invoke } from '@tauri-apps/api/tauri';
import { basename, dirname, resolve, sep } from 'path';
import FileTreeNodeType from '../frontend/FileTreeEntryType.js';
import type { FieldData } from '../util/BufferReader.js';
import { mkdir, writeFile } from '../util/FileUtil.js';
import SearchHelper from '../util/SearchHelper.js';
import type ZOSFileTable from '../zosft/ZOSFileTable.js';
import type ZOSFileTableEntry from '../zosft/ZOSFileTableEntry.js';
import ZOSFileTableReader from '../zosft/ZOSFileTableReader.js';
import MnfArchiveFile from './MnfArchiveFile.js';
import type MnfEntry from './MnfEntry.js';

export default class MnfArchive {
    path: string;
    fileSize?: number;
    data?: FieldData;
    archiveFiles: Map<number, MnfArchiveFile>;
    fileEntries: Map<number, MnfEntry>;
    mnfEntries: Map<number, MnfEntry>;
    fileTableEntry?: MnfEntry;
    fileTable?: ZOSFileTable | null;
    searchHelper: SearchHelper;

    constructor(path: string) {
        this.path = path;
        this.archiveFiles = new Map();
        this.fileEntries = new Map();
        this.mnfEntries = new Map();
        this.searchHelper = new SearchHelper(path);
    }

    async getContent(entry?: MnfEntry, decompress = true): Promise<Buffer> {
        if (!entry) {
            throw new Error('No entry provided');
        }

        const archiveFile = this.getArchiveFile(entry);
        if (!archiveFile) {
            throw new Error('No archive file found for entry ' + entry.fileName);
        }

        const named = entry.data.named;
        const offset = named['offset'].value as number;
        const compressionType = named['compressionType'].value as number;
        const fileSize = named['fileSize'].value as number;
        const compressedSize = named['compressedSize'].value as number;

        if (compressionType === 0 || !decompress) {
            return await archiveFile.loadContent(entry);
        } else {
            const decompressedBuffer = await invoke('decompress', { path: archiveFile.path, offset, compressedSize, fileSize }) as Buffer;
            let cursor = 0;
            if (decompressedBuffer.length >= 16 && decompressedBuffer.readUInt32BE(cursor) === 0) {
                // has some strange header which we skip for now (seen in game.mnf related archives)
                cursor += 4;
                cursor += decompressedBuffer.readUInt32BE(cursor);
                cursor += 4;
                cursor += decompressedBuffer.readUInt32BE(cursor);
                cursor += 4;
            }
            return decompressedBuffer.slice(cursor);
        }
    }

    async getFileTableContent(): Promise<Buffer> {
        return this.getContent(this.fileTableEntry);
    }

    getArchiveFile(entry: MnfEntry): MnfArchiveFile | undefined {
        const named = entry.data.named;
        const archiveNumber = named['archiveNumber'].value as number;
        if (!this.archiveFiles.has(archiveNumber)) {
            const prefix = basename(this.path, '.mnf');
            const archiveName = prefix + ('0000' + archiveNumber).substr(-4) + '.dat';
            const archivePath = dirname(this.path) + sep + archiveName;
            this.archiveFiles.set(archiveNumber, new MnfArchiveFile(archivePath));
        }
        return this.archiveFiles.get(archiveNumber);
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

    getMnfEntry(path: string): MnfEntry {
        return this.searchHelper.getByPath(path);
    }

    async extractFile(fileEntry: MnfEntry, targetFolder: string, root = '', decompress = true) {
        if (!fileEntry.fileName?.startsWith(root)) {
            console.warn('root mismatch for', fileEntry);
            throw new Error('The file root does not match the arguments');
        }

        if (root === fileEntry.fileName) {
            root = dirname(root);
        }

        const target = resolve(targetFolder, fileEntry.fileName.substring(root.length + 1));
        mkdir(dirname(target));
        const content = await this.getContent(fileEntry, decompress);
        await writeFile(target, content, true);
    }

    async finalize() {
        if (this.fileTableEntry) {
            const zosftReader = new ZOSFileTableReader();
            const fileTable = this.fileTable = await zosftReader.read(this);

            if (fileTable) {
                fileTable.forEach((tableEntry: ZOSFileTableEntry) => {
                    const fileEntry = this.fileEntries.get(tableEntry.getFileNumber());
                    if (!fileEntry) {
                        console.warn('No mnf entry for', tableEntry.fileName, tableEntry);
                    } else if (fileEntry.tableEntry) {
                        console.warn('Mnf entry already has a zosft entry associated', fileEntry, tableEntry);
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

        this.mnfEntries.forEach((entry: MnfEntry) => {
            this.searchHelper.addEntry(entry);
        });
    }

    getDirectoryEntries(folder: string, withIds = true): JSTreeNodeSettings[] {
        const entries: JSTreeNodeSettings[] = [];
        const prefix = folder === '/' ? '/' : folder + '/';
        const ids: any = {};
        this.mnfEntries.forEach((mnfEntry: MnfEntry) => {
            if (mnfEntry.fileName?.startsWith(prefix)) {
                let dir = dirname(mnfEntry.fileName);
                dir = dir.substr(prefix.length);
                const end = dir.indexOf('/');
                if (end > 0) {
                    dir = dir.substring(0, end);
                }
                const id = prefix + dir;
                if (!ids[id] && id !== prefix) {
                    const entry: JSTreeNodeSettings = {
                        text: basename(id),
                        data: {
                            type: FileTreeNodeType.FOLDER,
                            path: id,
                            archivePath: this.path
                        },
                        children: true
                    }
                    entries.push(entry);
                    if (withIds) {
                        entry.id = id;
                        entry.parent = folder;
                    }
                    ids[id] = true;
                }

                if (dirname(mnfEntry.fileName) === folder) {
                    const entry: JSTreeNodeSettings = {
                        text: basename(mnfEntry.fileName),
                        data: {
                            type: FileTreeNodeType.FILE,
                            path: mnfEntry.fileName,
                            archivePath: this.path,
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
        });
        return entries;
    }

    getFileEntry(file: string): JSTreeNodeSettings[] {
        const entries: JSTreeNodeSettings[] = [];
        const fileEntry = this.searchHelper.getByPath(file);
        if (fileEntry) {
            entries.push({
                id: file,
                parent: dirname(file),
                text: basename(fileEntry.fileName ?? ''),
                data: {
                    type: FileTreeNodeType.FILE
                },
                type: 'file'
            });
        }
        return entries;
    }

}
