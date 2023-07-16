import { folder } from 'ionicons/icons';
import MnfArchiveEntry from './MnfArchiveEntry';
import type StateManager from './StateManager';
import type { FileBrowserEntryData, GameVersionData } from './StateManager';

export class GameInstallEntry implements FileBrowserEntryData {
    public readonly label: string;
    public readonly icon = folder;
    public readonly children: FileBrowserEntryData[];
    public open = true;

    constructor(
        public readonly path: string,
        public readonly version: GameVersionData,
        public readonly mnfFiles: string[],
        public readonly stateManager: StateManager
    ) {
        this.label = path;
        this.children = mnfFiles.map((file) => new MnfArchiveEntry(this, file));
    }

    public select() {
        console.log('select game install:', this.path, this);
        this.stateManager.selectedContent.set(this);
    }
}
