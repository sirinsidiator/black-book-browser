import { folder } from 'ionicons/icons';
import FileBrowserEntryData, { FileBrowserEntryDataTypeOrder } from './FileBrowserEntryData';
import type { GameVersionData } from './GameInstallManager';
import MnfArchiveEntry from './MnfArchiveEntry';
import type StateManager from './StateManager';

export class GameInstallEntry extends FileBrowserEntryData {
    constructor(
        path: string,
        public readonly version: GameVersionData,
        public readonly mnfFiles: string[],
        stateManager: StateManager
    ) {
        super(stateManager, FileBrowserEntryDataTypeOrder.GameInstall, folder, path, path);
        this.children.push(...mnfFiles.map((file) => new MnfArchiveEntry(this, file)));
        this.opened.set(true);
    }
}
