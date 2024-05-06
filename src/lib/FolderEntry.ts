import { folder } from 'ionicons/icons';
import { FileEntry } from './FileEntry';
import type MnfArchiveEntry from './MnfArchiveEntry';
import type { ContentEntry } from './StateManager';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class FolderEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly icon = folder;
    public readonly children: (FileEntry | FolderEntry)[] = [];
    private files: MnfFileData[] = [];
    private _folderCount = 0;
    private _compressedSize = 0;
    private _decompressedSize = 0;
    private _fileList = '';
    private loaded = false;

    constructor(
        public readonly archive: MnfArchiveEntry,
        public readonly label: string,
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

    public setFiles(files: MnfFileData[]) {
        this.files = files;
        this._folderCount = this.countFolders();
        if (this.parent) {
            this._folderCount--;
        }
        this._compressedSize = files.reduce((size, file) => size + file.compressedSize, 0);
        this._decompressedSize = files.reduce((size, file) => size + file.size, 0);
        this._fileList = files.map((file) => file.fileName).join('\n');
    }

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        if (!this.loaded) {
            this.loaded = true;
            const folders: { [key: string]: MnfFileData[] } = {};
            this.files.forEach((file) => {
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
            });

            Object.keys(folders).forEach((label) => {
                const folder = new FolderEntry(this.archive, label, this, this.level + 1);
                folder.setFiles(folders[label]);
                this.children.push(folder);
            });

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

    private countFolders(files: MnfFileData[] = this.files, level = 1) {
        const folders: { [key: string]: MnfFileData[] } = {};
        files.forEach((file) => {
            const parts = file.fileName.split('/');
            const label = parts[level];
            if (level === parts.length - 1) {
                return;
            }
            if (!folders[label]) {
                folders[label] = [];
            }
            folders[label].push(file);
        });
        let count = 0;
        Object.keys(folders).forEach((label) => {
            count += 1 + this.countFolders(folders[label], level + 1);
        });
        return count;
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
}
