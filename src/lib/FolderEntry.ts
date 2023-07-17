import { folder } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import { FileEntry } from './FileEntry';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';

export class FolderEntry implements FileBrowserEntryData {
    public readonly stateManager: StateManager;
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[] = [];
    public readonly opened: Writable<boolean> = writable(false);
    public readonly path: string;

    constructor(public readonly parent: FileBrowserEntryData, public readonly label: string) {
        if (parent instanceof FolderEntry) {
            this.path = parent.path + '/' + label;
        } else {
            this.path = '/' + label;
        }
        this.stateManager = parent.stateManager;
    }

    public get folderCount() {
        let count = 0;
        this.children.forEach((child) => {
            if (child instanceof FolderEntry) {
                count += child.folderCount + 1;
            }
        });
        return count;
    }

    public get fileCount() {
        let count = 0;
        this.children.forEach((child) => {
            if (child instanceof FileEntry) {
                count++;
            } else if (child instanceof FolderEntry) {
                count += child.fileCount;
            }
        });
        return count;
    }

    public get compressedSize() {
        let size = 0;
        this.children.forEach((child) => {
            if (child instanceof FileEntry || child instanceof FolderEntry) {
                size += child.compressedSize;
            }
        });
        return size;
    }

    public get decompressedSize() {
        let size = 0;
        this.children.forEach((child) => {
            if (child instanceof FileEntry || child instanceof FolderEntry) {
                size += child.decompressedSize;
            }
        });
        return size;
    }

    public get fileList() {
        const files: string[] = [];
        this.children.forEach((child) => {
            if (child instanceof FileEntry) {
                files.push(child.path);
            } else if (child instanceof FolderEntry) {
                files.push(...child.fileList.split('\n'));
            }
        });
        return files.join('\n');
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
