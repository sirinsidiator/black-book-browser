import { writable, type Writable } from 'svelte/store';
import GameInstallManager from './GameInstallManager';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export default class StateManager {
    public readonly selectedContent: Writable<FileTreeEntryDataProvider | null> = writable(null);
    public readonly gameInstallManager: GameInstallManager;

    constructor() {
        this.gameInstallManager = new GameInstallManager();
    }
}
