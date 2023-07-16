import { folder } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import MnfArchiveEntry from './MnfArchiveEntry';
import type StateManager from './StateManager';
import type { FileBrowserEntryData, GameVersionData } from './StateManager';

export class GameInstallEntry implements FileBrowserEntryData {
    public readonly label: string;
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[];
    public readonly opened: Writable<boolean> = writable(true);

    constructor(
        public readonly path: string,
        public readonly version: GameVersionData,
        public readonly mnfFiles: string[],
        public readonly stateManager: StateManager
    ) {
        this.label = path;
        this.children = mnfFiles.map((file) => new MnfArchiveEntry(this, file));
    }

    public select(toggleOpen = false) {
        console.log('select game install:', this.path, this);
        this.stateManager.setActiveContent(this);
        if (toggleOpen) {
            this.toggleOpen();
        }
    }

    public toggleOpen() {
        this.opened.update((opened) => !opened);
    }
}
