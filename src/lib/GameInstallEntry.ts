import { folder } from 'ionicons/icons';
import type { GameVersionData } from './GameInstallManager';
import MnfArchiveEntry from './MnfArchiveEntry';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class GameInstallEntry implements FileTreeEntryDataProvider {
    public constructor(
        private readonly _path: string,
        public readonly version: GameVersionData,
        public readonly mnfFiles: string[]
    ) {}

    public get icon(): string {
        return folder;
    }

    public get label(): string {
        return this._path;
    }

    public get path(): string {
        return this._path;
    }

    public get hasChildren(): boolean {
        return true;
    }

    public loadChildren(): Promise<FileTreeEntryData<FileTreeEntryDataProvider>[]> {
        const children = this.mnfFiles.map(
            (file) => new FileTreeEntryData(new MnfArchiveEntry(this, file))
        );
        return Promise.resolve(children);
    }
}
