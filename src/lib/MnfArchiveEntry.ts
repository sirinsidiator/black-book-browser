import { folder } from 'ionicons/icons';
import { get, writable, type Writable } from 'svelte/store';
import { FileEntry } from './FileEntry';
import { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import type MnfArchive from './mnf/MnfArchive';
import type MnfEntry from './mnf/MnfEntry';
import MnfReader from './mnf/MnfReader';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export default class MnfArchiveEntry implements FileTreeEntryDataProvider {
    public readonly busy: Writable<boolean> = writable(false);
    public readonly failed: Writable<boolean> = writable(false);
    public readonly error: Writable<Error | null> = writable(null);
    private archive?: MnfArchive;
    private _folderCount = 0;
    private _fileCount = 0;
    private _compressedSize = 0;
    private _decompressedSize = 0;
    private _fileList: string[] = ['loading...'];
    public readonly children: (MnfArchiveEntry | FolderEntry | FileEntry)[] = [];

    constructor(
        private gameInstall: GameInstallEntry,
        private _path: string
    ) {}

    public get icon(): string {
        return folder;
    }

    public get label(): string {
        return this._path.substring(this.gameInstall.path.length + 1);
    }

    public get path(): string {
        return this._path;
    }

    public get hasChildren(): boolean {
        return true;
    }

    public async loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
        await this.load();
        const children = this.children.map((child) => new FileTreeEntryData(child));
        children.sort((a, b) => {
            if (a.data instanceof FolderEntry && b.data instanceof FileEntry) {
                return -1;
            } else if (a.data instanceof FileEntry && b.data instanceof FolderEntry) {
                return 1;
            } else {
                return a.data.label.localeCompare(b.data.label);
            }
        });
        return Promise.resolve(children);
    }

    public get folderCount() {
        return this._folderCount;
    }

    public get fileCount() {
        return this._fileCount;
    }

    public get compressedSize() {
        return this._compressedSize;
    }

    public get decompressedSize() {
        return this._decompressedSize;
    }

    public get fileList() {
        return this._fileList.join('\n');
    }

    public async load() {
        if (!this.archive && !get(this.error)) {
            console.log('Reading archive: ' + this.path);
            this.busy.set(true);
            try {
                const reader = new MnfReader();
                this.archive = await reader.read(this.path);
                console.log('Done reading archive: ' + this.path);
                this._folderCount = 0;
                this._fileCount = 0;
                this._compressedSize = 0;
                this._decompressedSize = 0;
                this._fileList.length = 0;
                this.archive.fileEntries.forEach((entry) => {
                    this.buildTree(this, entry);
                    this._fileList.push(entry.fileName ?? '');
                });
                this._fileList.sort();
            } catch (error) {
                this.error.set(error as Error);
                this.failed.set(true);
            }
            this.busy.set(false);
        }
    }

    private buildTree(parent: MnfArchiveEntry | FolderEntry, entry: MnfEntry) {
        entry.fileName?.split('/')?.forEach((label, index, array) => {
            if (label === '') return;
            if (index === array.length - 1) {
                this._fileCount++;
                this._compressedSize += entry.data.named['compressedSize'].value as number;
                this._decompressedSize += entry.data.named['fileSize'].value as number;
                parent.children.push(new FileEntry(entry, parent, label));
            } else {
                let child = parent.children.find((c) => c.label === label);
                if (!child) {
                    child = new FolderEntry(parent, label);
                    this._folderCount++;
                    parent.children.push(child);
                }
                if (!(child instanceof FileEntry)) {
                    parent = child;
                }
            }
        });
    }
}
