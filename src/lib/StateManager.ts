import { goto } from '$app/navigation';
import { writable, type Writable } from 'svelte/store';
import type FileBrowserEntryData from './FileBrowserEntryData';
import type { GameInstallEntry } from './GameInstallEntry';

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
