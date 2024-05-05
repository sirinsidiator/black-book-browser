import { folder } from 'ionicons/icons';
import type { GameVersionData } from './GameInstallManager';
import MnfArchiveEntry from './MnfArchiveEntry';
import type { ContentEntry } from './StateManager';
import FileTreeEntryData from './tree/FileTreeEntryData';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export class GameInstallEntry implements FileTreeEntryDataProvider, ContentEntry {
    public constructor(
        private readonly _label: string,
        private readonly _path: string,
        public readonly version: GameVersionData,
        public readonly settings: Map<string, string>,
        public readonly mnfFiles: string[]
    ) {}

    public get icon(): string {
        return folder;
    }

    public get label(): string {
        return this._label;
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

    // eslint-disable-next-line @typescript-eslint/require-await
    public async openExplorer(): Promise<void> {
        console.log('Open Explorer');
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async remove(): Promise<void> {
        console.log('Remove');
    }
}
