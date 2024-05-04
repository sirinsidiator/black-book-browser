import type { FileEntry } from '@tauri-apps/api/fs';
import { writable, type Writable } from 'svelte/store';
import type { FolderEntry } from './FolderEntry';
import type { GameInstallEntry } from './GameInstallEntry';
import GameInstallManager from './GameInstallManager';
import type MnfArchiveEntry from './MnfArchiveEntry';

export default class StateManager {
    public readonly selectedContent: Writable<
        GameInstallEntry | MnfArchiveEntry | FolderEntry | FileEntry | null
    > = writable(null);
    public readonly gameInstallManager: GameInstallManager;

    constructor() {
        this.gameInstallManager = new GameInstallManager();
    }

    public setActiveContent(
        content: GameInstallEntry | MnfArchiveEntry | FolderEntry | FileEntry | null
    ) {
        this.selectedContent.set(content);
    }
}
