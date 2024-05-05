import { fileTrayFull } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import type { ContentEntry } from './StateManager';
import BackgroundService from './backend/BackgroundService';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import { getFileSize } from './util/FileUtil';
import type { MnfFileData } from 'd:/projects/esoextract/black-book-browser/src/lib/mnf/MnfFileData';

export default class MnfArchiveEntry implements FileTreeEntryDataProvider, ContentEntry {
    private files: MnfFileData[] = [];
    public readonly root: Writable<FolderEntry | null> = writable(null);
    public readonly busy: Writable<boolean> = writable(false);
    public readonly loaded: Writable<boolean> = writable(false);

    constructor(
        private gameInstall: GameInstallEntry,
        private _path: string
    ) {}

    public get icon(): string {
        return fileTrayFull;
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
        this.busy.set(true);
        console.log('Reading archive: ' + this.path);
        const size = await getFileSize(this.path);
        this.files = await BackgroundService.getInstance().readMnfArchive(this.path, size);
        console.log('Done reading archive: ' + this.path);
        const rootFolder = new FolderEntry(this, '');
        rootFolder.setFiles(this.files);
        this.root.set(rootFolder);
        // this.files.forEach((file) => {
        //     this.buildTree(this, file);
        // });
        this.loaded.set(true);

        const children = await rootFolder.loadChildren();
        // children.sort((a, b) => {
        //     if (a.data instanceof FolderEntry && b.data instanceof FileEntry) {
        //         return -1;
        //     } else if (a.data instanceof FileEntry && b.data instanceof FolderEntry) {
        //         return 1;
        //     } else {
        //         return a.data.label.localeCompare(b.data.label);
        //     }
        // });
        this.busy.set(false);
        return Promise.resolve(children);
    }

    // private buildTree(parent: MnfArchiveEntry | FolderEntry, file: MnfFileData) {
    // file.fileName.split('/')?.forEach((label, index, array) => {
    //     if (label === '') return;
    //     if (index === array.length - 1) {
    //         parent.children.push(new FileEntry(file, parent, label));
    //     } else {
    //         let child = parent.children.find((c) => c.label === label);
    //         if (!child) {
    //             child = new FolderEntry(parent, label);
    //             parent.children.push(child);
    //         }
    //         if (!(child instanceof FileEntry)) {
    //             parent = child;
    //         }
    //     }
    // });
    // }
}
