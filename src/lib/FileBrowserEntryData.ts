import { get, writable, type Writable } from 'svelte/store';
import type StateManager from './StateManager';

export enum FileBrowserEntryDataTypeOrder {
    Folder = 0,
    File = 1,
    Archive = 2,
    GameInstall = 3
}

export default abstract class FileBrowserEntryData {
    public readonly opened: Writable<boolean> = writable(false);
    public readonly checked: Writable<boolean> = writable(false);
    public readonly indeterminate: Writable<boolean> = writable(false);
    public readonly busy: Writable<boolean> = writable(false);
    public readonly failed: Writable<boolean> = writable(false);
    public readonly children: FileBrowserEntryData[] = [];
    private firstOpen = true;

    constructor(
        public readonly stateManager: StateManager,
        private readonly typeOrder: number,
        public readonly icon: string,
        public readonly label: string,
        public readonly path: string,
        public readonly parent?: FileBrowserEntryData
    ) {}

    public async select(toggleOpen = false) {
        this.stateManager.setActiveContent(this);
        if (toggleOpen) {
            this.toggleOpen();
        }
    }

    public async toggleOpen() {
        this.opened.update((opened) => !opened);
        if (get(this.opened) && this.firstOpen) {
            this.firstOpen = false;
            this.children.sort(this.byTypeAndName);
        }
    }

    private byTypeAndName(a: FileBrowserEntryData, b: FileBrowserEntryData) {
        if (a.typeOrder === b.typeOrder) {
            return a.label.localeCompare(b.label);
        } else {
            return a.typeOrder - b.typeOrder;
        }
    }

    public toggleChecked() {
        this.setChecked(!get(this.checked));
    }

    public setChecked(checked: boolean) {
        this.checked.set(checked);
        this.children.forEach((child) => {
            child.setChecked(checked);
        });
        this.indeterminate.set(false);
        this.parent?.updateIndeterminate();
    }

    public updateIndeterminate() {
        const checkedCount = this.children.reduce((count, child) => {
            return count + (get(child.checked) ? 1 : 0);
        }, 0);
        const indeterminateCount = this.children.reduce((count, child) => {
            return count + (get(child.indeterminate) ? 1 : 0);
        }, 0);
        this.checked.set(checkedCount === this.children.length);
        this.indeterminate.set(!get(this.checked) && indeterminateCount + checkedCount > 0);
        this.parent?.updateIndeterminate();
    }
}
