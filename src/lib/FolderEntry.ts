import { folder } from 'ionicons/icons';
import FileBrowserEntryData, { FileBrowserEntryDataTypeOrder } from './FileBrowserEntryData';
import { FileEntry } from './FileEntry';

export class FolderEntry extends FileBrowserEntryData {
    constructor(
        parent: FileBrowserEntryData,
        public readonly label: string
    ) {
        super(
            parent.stateManager,
            FileBrowserEntryDataTypeOrder.Folder,
            folder,
            label,
            parent instanceof FolderEntry ? parent.path + '/' + label : '/' + label,
            parent
        );
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
