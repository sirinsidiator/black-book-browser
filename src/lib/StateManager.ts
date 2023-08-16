import { writable, type Writable } from 'svelte/store';
import type FileBrowserEntryData from './FileBrowserEntryData';
import GameInstallManager from './GameInstallManager';

export default class StateManager {
    public readonly selectedContent: Writable<FileBrowserEntryData | null> = writable(null);
    public readonly gameInstallManager: GameInstallManager;

    constructor() {
        this.gameInstallManager = new GameInstallManager(this);
    }

    public setActiveContent(content: FileBrowserEntryData | null) {
        this.selectedContent.set(content);
    }
}
