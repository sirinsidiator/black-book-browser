import { writable, type Writable } from 'svelte/store';
import type { GameInstallEntry } from './GameInstallEntry';
import { goto } from '$app/navigation';

export interface FileBrowserEntryData {
    stateManager: StateManager;
    opened: Writable<boolean>;
    icon: string;
    label: string;
    path: string;
    children: FileBrowserEntryData[];
    select: (toggleOpen?: boolean) => void;
    toggleOpen: () => void;
}

export interface GameVersionData {
    version: string;
    buildDate: string;
    buildNumber: string;
}

export default class StateManager {
    public readonly gameInstalls: Writable<Map<string, GameInstallEntry>> = writable(new Map());
    public readonly selectedContent: Writable<FileBrowserEntryData | null> = writable(null);

    public setActiveContent(content: FileBrowserEntryData | null) {
        this.selectedContent.set(content);
        goto('/content');
    }
}
