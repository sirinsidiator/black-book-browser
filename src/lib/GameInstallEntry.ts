import { folder } from 'ionicons/icons';
import type { GameVersionData } from './GameInstallManager';
import MnfArchiveEntry from './MnfArchiveEntry';
import type { ContentEntry } from './StateManager';
import type { MnfFileData } from './mnf/MnfFileData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class GameInstallEntry implements FileTreeEntryDataProvider, ContentEntry {
    public readonly icon = folder;
    public readonly hasChildren = true;
    public readonly mnfFiles: MnfFileData[] = [];

    public constructor(
        public readonly label: string,
        public readonly path: string,
        public readonly version: GameVersionData,
        public readonly settings: Map<string, string>,
        private readonly archiveFiles: string[]
    ) {}

    public loadChildren(): Promise<FileTreeEntryDataProvider[]> {
        const children = this.archiveFiles.map((file) => new MnfArchiveEntry(this, file));
        return Promise.resolve(children);
    }
}
