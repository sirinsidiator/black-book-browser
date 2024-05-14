import { document } from 'ionicons/icons';
import ContentEntry from './ContentEntry';
import type { FolderEntry } from './FolderEntry';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class FileEntry extends ContentEntry implements FileTreeEntryDataProvider {
    public readonly icon = document;
    public readonly path: string;
    public readonly hasChildren = false;

    constructor(
        public readonly file: MnfFileData,
        public readonly parent: FolderEntry,
        public readonly label: string
    ) {
        super();
        this.path = parent.path + label;
    }

    public get compressedSize() {
        return this.file.compressedSize;
    }

    public get decompressedSize() {
        return this.file.size;
    }

    public get mnfFiles() {
        return [this.file];
    }

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        return Promise.resolve([]);
    }
}
