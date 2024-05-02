import { get, writable, type Writable } from 'svelte/store';

export default class FileTreeEntryData {
    public readonly opened: Writable<boolean> = writable(false);
    public readonly checked: Writable<boolean> = writable(false);
    public readonly indeterminate: Writable<boolean> = writable(false);
    public readonly busy: Writable<boolean> = writable(false);
    public readonly failed: Writable<boolean> = writable(false);
    public readonly children: FileTreeEntryData[] = [];
    private parent?: FileTreeEntryData;
    private firstOpen = true;

    constructor(
        public readonly id: number,
        public readonly icon: string,
        public readonly label: string,
        public readonly path: string,
        public readonly data: unknown,
    ) {}

    public async select(toggleOpen = false) {
        // TODO emit event
        if (toggleOpen) {
            return this.toggleOpen();
        }
        return Promise.resolve();
    }

    public async toggleOpen() {
        this.opened.update((opened) => !opened);
        if (get(this.opened) && this.firstOpen) {
            this.firstOpen = false;
        }
        return Promise.resolve();
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
