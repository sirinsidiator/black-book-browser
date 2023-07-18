import { folder } from 'ionicons/icons';
import FileBrowserEntryData, { FileBrowserEntryDataTypeOrder } from './FileBrowserEntryData';
import MnfArchiveEntry from './MnfArchiveEntry';
import type StateManager from './StateManager';
import type { GameVersionData } from './StateManager';

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
