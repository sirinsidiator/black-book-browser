import * as ooz from 'node-ooz';
import { basename, dirname, resolve, sep } from 'path';
import FileTreeNodeType from '../frontend/FileTreeEntryType.js';
import { FieldData } from '../util/BufferReader.js';
import { mkdir, writeFile } from '../util/FileUtil.js';
import ZOSFileTable from '../zosft/ZOSFileTable.js';
import ZOSFileTableEntry from '../zosft/ZOSFileTableEntry.js';
import ZOSFileTableReader from '../zosft/ZOSFileTableReader.js';
import MnfArchiveFile from './MnfArchiveFile.js';
import MnfEntry from './MnfEntry.js';

export default class MnfArchive {
    path: string;
    fileSize: number;
    data: FieldData;
    archiveFiles: Map<number, MnfArchiveFile>;
    fileEntries: Map<number, MnfEntry>;
    mnfEntries: Map<number, MnfEntry>;
    mnfEntryLookup: Map<string, MnfEntry>;
    fileTableEntry: MnfEntry;
    fileTable: ZOSFileTable;

    constructor(path: string) {
        this.path = path;
        this.archiveFiles = new Map();
        this.fileEntries = new Map();
        this.mnfEntries = new Map();
        this.mnfEntryLookup = new Map();
    }

    async getContent(entry: MnfEntry, decompress = true): Promise<Buffer> {
        let archiveFile = this.getArchiveFile(entry);

        let named = entry.data.named;
        let offset = named['offset'].value as number;
        let compressionType = named['compressionType'].value as number;
        let fileSize = named['fileSize'].value as number;
        let compressedSize = named['compressedSize'].value as number;

        if (compressionType === 0 || !decompress) {
            return await archiveFile.loadContent(entry);
        } else {
            let decompressedBuffer = await ooz.decompress(archiveFile.path, offset, compressedSize, fileSize);
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

    getArchiveFile(entry: MnfEntry): MnfArchiveFile {
        let named = entry.data.named;
        let archiveNumber = named['archiveNumber'].value as number;
        if (!this.archiveFiles.has(archiveNumber)) {
            let prefix = basename(this.path, '.mnf');
            let archiveName = prefix + ('0000' + archiveNumber).substr(-4) + '.dat';
            let archivePath = dirname(this.path) + sep + archiveName;
            this.archiveFiles.set(archiveNumber, new MnfArchiveFile(archivePath));
        }
        return this.archiveFiles.get(archiveNumber);
    }

    getMnfEntriesForFolder(path: string): MnfEntry[] {
        if (path !== '/') {
            path += '/';
        }
        let entries: MnfEntry[] = [];
        this.mnfEntries.forEach((entry: MnfEntry) => {
            if (entry.fileName.startsWith(path)) {
                entries.push(entry);
            }
        });
        return entries;
    }

    getMnfEntry(path: string): MnfEntry {
        return this.mnfEntryLookup.get(path);
    }

    async extractFile(fileEntry: MnfEntry, targetFolder: string, root = '', decompress = true) {
        if (!fileEntry.fileName.startsWith(root)) {
            console.warn('root mismatch for', fileEntry);
            throw new Error('The file root does not match the arguments');
        }

        let target = resolve(targetFolder, fileEntry.fileName.substring(root.length + 1));
        mkdir(dirname(target));
        let content = await this.getContent(fileEntry, decompress);
        await writeFile(target, content, true);
    }

    async finalize() {
        if (this.fileTableEntry) {
            let zosftReader = new ZOSFileTableReader();
            let fileTable = this.fileTable = await zosftReader.read(this);

            if (fileTable) {
                fileTable.forEach((tableEntry: ZOSFileTableEntry) => {
                    let fileEntry = this.fileEntries.get(tableEntry.getFileNumber());
                    if (!fileEntry) {
                        console.warn('No mnf entry for', tableEntry.fileName, tableEntry);
                    } else if (fileEntry.tableEntry) {
                        console.warn('Mnf entry already has a zosft entry associated', fileEntry, tableEntry);
                    } else {
                        tableEntry.fileEntry = fileEntry;
                        fileEntry.fileName = tableEntry.fileName;
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
            this.mnfEntryLookup.set(entry.fileName, entry);
        });
    }

    getDirectoryEntries(folder: string, withIds = true): JSTreeNodeSettings[] {
        let entries: JSTreeNodeSettings[] = [];
        let prefix = folder === '/' ? '/' : folder + '/';
        let ids: any = {};
        this.mnfEntries.forEach((mnfEntry: MnfEntry) => {
            if (mnfEntry.fileName.startsWith(prefix)) {
                let dir = dirname(mnfEntry.fileName);
                dir = dir.substr(prefix.length);
                let end = dir.indexOf('/');
                if (end > 0) {
                    dir = dir.substring(0, end);
                }
                let id = prefix + dir;
                if (!ids[id] && id !== prefix) {
                    let entry: JSTreeNodeSettings = {
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
                    let entry: JSTreeNodeSettings = {
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
        let entries: JSTreeNodeSettings[] = [];
        let fileEntry = this.mnfEntryLookup.get(file);
        if (fileEntry) {
            entries.push({
                id: file,
                parent: dirname(file),
                text: basename(fileEntry.fileName),
                data: {
                    type: FileTreeNodeType.FILE
                },
                type: 'file'
            });
        }
        return entries;
    }

}
