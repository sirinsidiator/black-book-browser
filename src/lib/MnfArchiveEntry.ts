import { folder } from 'ionicons/icons';
import { get, writable, type Writable } from 'svelte/store';
import { FileEntry } from './FileEntry';
import { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import type MnfArchive from './mnf/MnfArchive';
import type MnfEntry from './mnf/MnfEntry';
import MnfReader from './mnf/MnfReader';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';

export default class MnfArchiveEntry implements FileBrowserEntryData {
    public readonly stateManager: StateManager;
    public readonly label: string;
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[] = [];
    public readonly busy: Writable<boolean> = writable(false);
    public readonly opened: Writable<boolean> = writable(false);
    public readonly error: Writable<Error | null> = writable(null);
    private archive?: MnfArchive;
    private _folderCount = 0;
    private _fileCount = 0;
    private _compressedSize = 0;
    private _decompressedSize = 0;
    private _fileList: string[] = ['loading...'];

    constructor(private gameInstall: GameInstallEntry, public readonly path: string) {
        this.stateManager = gameInstall.stateManager;
        this.label = path.substring(gameInstall.path.length + 1);
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

    public select(toggleOpen = false) {
        this.stateManager.setActiveContent(this);
        if (toggleOpen) {
            this.toggleOpen();
        } else {
            this.load();
        }
    }

    public toggleOpen() {
        this.load();
        this.opened.update((opened) => !opened);
    }

    public load() {
        if (!this.archive && !get(this.error) && !get(this.busy)) {
            this.busy.set(true);
            console.log('Reading archive: ' + this.path);
            const reader = new MnfReader();
            reader.read(this.path).then(
                (archive) => {
                    console.log('Done reading archive: ' + this.path);
                    this.archive = archive;
                    this._folderCount = 0;
                    this._fileCount = 0;
                    this._compressedSize = 0;
                    this._decompressedSize = 0;
                    this._fileList.length = 0;
                    archive.fileEntries.forEach((entry) => {
                        this.buildTree(this, entry);
                        this._fileList.push(entry.fileName ?? '');
                    });
                    this._fileList.sort();
                    this.busy.set(false);
                },
                (error) => {
                    this.error.set(error);
                    this.busy.set(false);
                }
            );
        }
    }

    private buildTree(parent: FileBrowserEntryData, entry: MnfEntry) {
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
                parent = child;
            }
        });

        this.children.sort(byTypeAndName);
    }
}

function byTypeAndName(a: FileBrowserEntryData, b: FileBrowserEntryData) {
    if (a.icon === b.icon) {
        return a.label.localeCompare(b.label);
    } else {
        return a.icon === folder ? -1 : 1;
    }
}
