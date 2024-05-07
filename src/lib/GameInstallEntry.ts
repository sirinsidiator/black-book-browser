import { folder } from 'ionicons/icons';
import type GameInstallManager from './GameInstallManager';
import type { GameVersionData } from './GameInstallManager';
import MnfArchiveEntry from './MnfArchiveEntry';
import type { ContentEntry } from './StateManager';
import type { MnfFileData } from './mnf/MnfFileData';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class GameInstallEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly icon = folder;
    public readonly hasChildren = true;
    public readonly fileTreeEntry: FileTreeEntryData<this>;
    private readonly mnfArchiveEntries = new Map<string, MnfArchiveEntry>();
    private files: MnfFileData[] = [];

    public constructor(
        private readonly manager: GameInstallManager,
        public readonly label: string,
        public readonly path: string,
        public readonly version: GameVersionData,
        public readonly settings: Map<string, string>,
        private readonly archiveFiles: string[]
    ) {
        this.fileTreeEntry = new FileTreeEntryData(this);
        this.fileTreeEntry.toggleOpen().catch(console.error);
    }

    public get mnfFiles(): MnfFileData[] {
        return this.files;
    }

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        this.archiveFiles.forEach((file) => {
            const entry = new MnfArchiveEntry(this, file);
            this.mnfArchiveEntries.set(file, entry);
        });
        return Promise.resolve(Array.from(this.mnfArchiveEntries.values()));
    }

    public addFiles(files: MnfFileData[]) {
        this.files = this.files.concat(files);
        this.manager.clearFileSearchCache();
    }

    public getMnfArchiveEntry(path: string) {
        return this.mnfArchiveEntries.get(path);
    }
}
