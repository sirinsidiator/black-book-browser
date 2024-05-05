import { writable, type Writable } from 'svelte/store';
import GameInstallManager from './GameInstallManager';

export interface ContentEntry {
    label: string;
}

export default class StateManager {
    public readonly selectedContent: Writable<ContentEntry | null> = writable(null);
    public readonly gameInstallManager: GameInstallManager;

    constructor() {
        this.gameInstallManager = new GameInstallManager();
    }

    public setActiveContent(content: ContentEntry | null) {
        this.selectedContent.set(content);
    }
}
