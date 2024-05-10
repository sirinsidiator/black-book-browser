import { folder } from 'ionicons/icons';
import { FileEntry } from './FileEntry';
import type MnfArchiveEntry from './MnfArchiveEntry';
import type { ContentEntry } from './StateManager';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import BackgroundService from './backend/BackgroundService';

export interface FolderStats {
    folderCount: number;
    compressedSize: number;
    decompressedSize: number;
}

export class FolderEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly icon = folder;
    public readonly children: (FileEntry | FolderEntry)[] = [];
    private _folderCount = 0;
    private _compressedSize = 0;
    private _decompressedSize = 0;
    private _fileList = '';
    private loaded = false;
    private statsLoaded = false;

    constructor(
        public readonly archive: MnfArchiveEntry,
        public readonly label: string,
        private readonly files: MnfFileData[],
        public readonly parent?: FolderEntry,
        private level = 1
    ) {}

    public get path(): string {
        const parent = this.parent;
        if (!parent) {
            return '/';
        }
        return parent.path + this.label + '/';
    }

    public get hasChildren(): boolean {
        return this.files.length > 0;
    }

    public get mnfFiles() {
        return this.files;
    }

    public async initStats() {
        if (!this.statsLoaded) {
            this.statsLoaded = true;
            const stats = await BackgroundService.getInstance().getFolderStats(
                this.archive.path,
                this.path
            );
            this._folderCount = stats.folderCount;
            this._compressedSize = stats.compressedSize;
            this._decompressedSize = stats.decompressedSize;
            this._fileList = this.files.map((file) => file.fileName).join('\n');
        }
        return this;
    }

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        if (!this.loaded) {
            this.loaded = true;
            const folders: { [key: string]: MnfFileData[] } = {};
            for (const file of this.files) {
                const parts = file.fileName.split('/');
                const label = parts[this.level];
                if (this.level === parts.length - 1) {
                    this.children.push(new FileEntry(file, this, label));
                } else {
                    if (!folders[label]) {
                        folders[label] = [];
                    }
                    folders[label].push(file);
                }
            }

            for (const label in folders) {
                const folder = new FolderEntry(
                    this.archive,
                    label,
                    folders[label],
                    this,
                    this.level + 1
                );
                this.children.push(folder);
            }

            this.children.sort((a, b) => {
                if (a instanceof FolderEntry && b instanceof FileEntry) {
                    return -1;
                } else if (a instanceof FileEntry && b instanceof FolderEntry) {
                    return 1;
                } else {
                    return a.label.localeCompare(b.label);
                }
            });
        }

        return Promise.resolve(this.children);
    }

    public get folderCount() {
        return this._folderCount;
    }

    public get fileCount() {
        return this.files.length;
    }

    public get compressedSize() {
        return this._compressedSize;
    }

    public get decompressedSize() {
        return this._decompressedSize;
    }

    public get fileList() {
        return this._fileList;
    }

    public async getFileEntry(path: string): Promise<FileEntry | undefined> {
        if (!path.startsWith(this.path)) {
            return;
        }

        if (!this.loaded) {
            await this.loadChildren();
        }

        for (const child of this.children) {
            if (child instanceof FolderEntry) {
                const file = await child.getFileEntry(path);
                if (file) {
                    return file;
                }
            } else if (child.path === path) {
                return child;
            }
        }
    }
}
