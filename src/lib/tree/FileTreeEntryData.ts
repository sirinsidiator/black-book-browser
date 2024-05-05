import { get, writable, type Writable } from 'svelte/store';
import type FileTreeEntryDataProvider from './FileTreeEntryDataProvider';

export default class FileTreeEntryData<T extends FileTreeEntryDataProvider> {
    public readonly opened: Writable<boolean> = writable(false);
    public readonly checked: Writable<boolean> = writable(false);
    public readonly indeterminate: Writable<boolean> = writable(false);
    public readonly busy: Writable<boolean> = writable(false);
    public readonly failed: Writable<boolean> = writable(false);
    public readonly hasChildren: Writable<boolean> = writable(false);
    public readonly children: Writable<FileTreeEntryData<FileTreeEntryDataProvider>[]> = writable(
        []
    );
    private parent?: FileTreeEntryData<FileTreeEntryDataProvider>;
    private firstOpen = true;

    constructor(public readonly data: T) {
        this.hasChildren.set(data.hasChildren);
    }

    public get icon() {
        return this.data.icon;
    }
    public get label() {
        return this.data.label;
    }
    public get path() {
        return this.data.path;
    }

    public async toggleOpen() {
        this.opened.update((opened) => !opened);
        if (get(this.opened) && this.firstOpen) {
            this.firstOpen = false;
            this.busy.set(true);
            try {
                const children = await this.data.loadChildren();
                this.children.set(children);
                this.hasChildren.set(children.length > 0);
            } catch (e) {
                console.error('error loading children', e);
                this.failed.set(true);
            }
            this.busy.set(false);
        }
        return Promise.resolve();
    }

    public toggleChecked() {
        this.setChecked(!get(this.checked));
    }

    public setChecked(checked: boolean) {
        this.checked.set(checked);
        get(this.children).forEach((child) => {
            child.setChecked(checked);
        });
        this.indeterminate.set(false);
        this.parent?.updateIndeterminate();
    }

    public updateIndeterminate() {
        const children = get(this.children);
        const checkedCount = children.reduce((count, child) => {
            return count + (get(child.checked) ? 1 : 0);
        }, 0);
        const indeterminateCount = children.reduce((count, child) => {
            return count + (get(child.indeterminate) ? 1 : 0);
        }, 0);
        this.checked.set(checkedCount === children.length);
        this.indeterminate.set(!get(this.checked) && indeterminateCount + checkedCount > 0);
        this.parent?.updateIndeterminate();
    }
}
