import { document } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';
import type MnfEntry from './mnf/MnfEntry';

export class FileEntry implements FileBrowserEntryData {
    public readonly stateManager: StateManager;
    public readonly icon = document;
    public readonly children: FileBrowserEntryData[] = [];
    public readonly opened: Writable<boolean> = writable(false);

    constructor(
        public readonly mnfEntry: MnfEntry,
        public readonly parent: FileBrowserEntryData,
        public readonly label: string
    ) {
        this.stateManager = parent.stateManager;
    }

    public select() {
        console.log('select file:', this.label, this);
        this.stateManager.setActiveContent(this);
    }

    public toggleOpen() {
        /* noop */
    }
}
