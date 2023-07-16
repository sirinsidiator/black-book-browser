import { folder } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';

export class FolderEntry implements FileBrowserEntryData {
    public readonly stateManager: StateManager;
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[] = [];
    public readonly opened: Writable<boolean> = writable(false);

    constructor(public readonly parent: FileBrowserEntryData, public readonly label: string) {
        this.stateManager = parent.stateManager;
    }

    public select(toggleOpen = false) {
        console.log('select folder:', this.label, this);
        this.stateManager.setActiveContent(this);
        if (toggleOpen) {
            this.toggleOpen();
        }
    }

    public toggleOpen() {
        this.children.sort(byTypeAndName);
        this.opened.update((opened) => !opened);
    }
}

function byTypeAndName(a: FileBrowserEntryData, b: FileBrowserEntryData) {
    if (a.icon === b.icon) {
        return a.label.localeCompare(b.label);
    } else {
        return a.icon === folder ? -1 : 1;
    }
}
