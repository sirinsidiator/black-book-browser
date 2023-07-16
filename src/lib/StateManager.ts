import { writable, type Writable } from 'svelte/store';
import type { GameInstallEntry } from './GameInstallEntry';

export interface FileBrowserEntryData {
    open: boolean;
    icon: string;
    label: string;
    children: FileBrowserEntryData[];
    select: () => void;
}

export interface GameVersionData {
    version: string;
    buildDate: string;
    buildNumber: string;
}

export default class StateManager {
    public readonly gameInstalls: Writable<Map<string, GameInstallEntry>> = writable(new Map());
    public readonly selectedContent: Writable<FileBrowserEntryData | null> = writable(null);
}
