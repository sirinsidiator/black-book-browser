import { folder } from 'ionicons/icons';
import { FileEntry } from './FileEntry';
import { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import BackgroundService from './backend/BackgroundService';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';
import { getFileSize } from './util/FileUtil';
import type { MnfFileData } from 'd:/projects/esoextract/black-book-browser/src/lib/mnf/MnfFileData';

export default class MnfArchiveEntry implements FileTreeEntryDataProvider {
    private _folderCount = 0;
    private _fileCount = 0;
    private _compressedSize = 0;
    private _decompressedSize = 0;
    private _fileList: string[] = ['loading...'];
    private files: MnfFileData[] = [];
    public readonly children: (MnfArchiveEntry | FolderEntry | FileEntry)[] = [];

    constructor(
        private gameInstall: GameInstallEntry,
        private _path: string
    ) {}

    public get icon(): string {
        return folder;
    }

    public get label(): string {
        return this._path.substring(this.gameInstall.path.length + 1);
    }

    public get path(): string {
        return this._path;
    }

    public get hasChildren(): boolean {
        return true;
    }

    public async loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
        await this.load();
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
        return this._folderCount;
    }

    public get fileCount() {
        return this._fileCount;
    }

    public get compressedSize() {
        return this._compressedSize;
    }

    public get decompressedSize() {
        return this._decompressedSize;
    }

    public get fileList() {
        return this._fileList.join('\n');
    }

    public async load() {
        console.log('Reading archive: ' + this.path);
        const size = await getFileSize(this.path);
        this.files = await BackgroundService.getInstance().readMnfArchive(this.path, size);
        console.log('Done reading archive: ' + this.path);
        this._folderCount = 0;
        this._fileCount = 0;
        this._compressedSize = 0;
        this._decompressedSize = 0;
        this._fileList.length = 0;
        this.files.forEach((file) => {
            this.buildTree(this, file);
            this._fileList.push(file.fileName);
        });
    }

    private buildTree(parent: MnfArchiveEntry | FolderEntry, file: MnfFileData) {
        file.fileName.split('/')?.forEach((label, index, array) => {
            if (label === '') return;
            if (index === array.length - 1) {
                this._fileCount++;
                this._compressedSize += file.compressedSize;
                this._decompressedSize += file.size;
                parent.children.push(new FileEntry(file, parent, label));
            } else {
                let child = parent.children.find((c) => c.label === label);
                if (!child) {
                    child = new FolderEntry(parent, label);
                    this._folderCount++;
                    parent.children.push(child);
                }
                if (!(child instanceof FileEntry)) {
                    parent = child;
                }
            }
        });
    }
}
