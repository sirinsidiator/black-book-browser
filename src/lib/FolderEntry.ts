import { folder } from 'ionicons/icons';
import { FileEntry } from './FileEntry';
import type MnfArchiveEntry from './MnfArchiveEntry';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class FolderEntry implements FileTreeEntryDataProvider {
    public readonly children: (FileEntry | FolderEntry)[] = [];

    constructor(
        private readonly _parent: MnfArchiveEntry | FolderEntry,
        private readonly _label: string
    ) {}

    public get icon(): string {
        return folder;
    }

    public get label(): string {
        return this._label;
    }

    public get path(): string {
        return parent instanceof FolderEntry ? parent.path + '/' + this._label : '/' + this._label;
    }

    public get hasChildren(): boolean {
        return this.children.length > 0;
    }

    public loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
        const children = this.children.map((child) => new FileTreeEntryData(child));
        children.sort((a, b) => {
            if (a.data instanceof FolderEntry && b.data instanceof FileEntry) {
                return -1;
            } else if (a.data instanceof FileEntry && b.data instanceof FolderEntry) {
                return 1;
            } else {
                return a.data.label.localeCompare(b.data.label);
            }
        });
        return Promise.resolve(children);
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
}
