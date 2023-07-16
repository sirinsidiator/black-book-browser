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

    constructor(private gameInstall: GameInstallEntry, public readonly path: string) {
        this.stateManager = gameInstall.stateManager;
        this.label = path.substring(gameInstall.path.length + 1);
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
                    archive.fileEntries.forEach((entry) => this.buildTree(this, entry));
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
                parent.children.push(new FileEntry(entry, parent, label));
            } else {
                let child = parent.children.find((c) => c.label === label);
                if (!child) {
                    child = new FolderEntry(parent, label);
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
