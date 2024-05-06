import { fileTrayFull } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import type { ContentEntry } from './StateManager';
import BackgroundService from './backend/BackgroundService';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import { getFileSize } from './util/FileUtil';

export default class MnfArchiveEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly root: Writable<FolderEntry | null> = writable(null);
    public readonly busy: Writable<boolean> = writable(false);
    public readonly loaded: Writable<boolean> = writable(false);
    public readonly icon: string = fileTrayFull;
    public readonly hasChildren: boolean = true;
    public readonly mnfFiles: MnfFileData[] = [];
    private files: MnfFileData[] = [];

    constructor(
        private gameInstall: GameInstallEntry,
        private _path: string
    ) {}

    public get label(): string {
        return this._path.substring(this.gameInstall.path.length + 1);
    }

    public get path(): string {
        return this._path;
    }
    public async loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        this.busy.set(true);
        console.log('Reading archive: ' + this.path);
        const size = await getFileSize(this.path);
        this.files = await BackgroundService.getInstance().readMnfArchive(this.path, size);
        console.log('Done reading archive: ' + this.path);
        const rootFolder = new FolderEntry(this, '/');
        rootFolder.setFiles(this.files);
        this.root.set(rootFolder);
        this.loaded.set(true);

        const children = await rootFolder.loadChildren();
        this.busy.set(false);
        return Promise.resolve(children);
    }
}
