import { invoke } from '@tauri-apps/api/core';
import { readTextFile } from '@tauri-apps/plugin-fs';
import { get, writable, type Writable } from 'svelte/store';
import type FileSearchEntry from './FileSearchEntry';
import { GameInstallEntry } from './GameInstallEntry';
import BackgroundService from './backend/BackgroundService';
import { basename, resolve } from './util/FileUtil';

export interface GameVersionData {
    version: string;
    buildDate: string;
    buildNumber: string;
}

const STORAGE_KEY_PATHS = 'gameinstalls';
const BUILD_INFO_FILE = 'depot/_databuild/databuild.stamp';
const APP_SETTINGS_FILE = 'game/client/AppSettings.txt';
const DUMMY_BUILD_DATA: GameVersionData = {
    version: '-',
    buildDate: '-',
    buildNumber: '-'
};

export default class GameInstallManager {
    public readonly gameInstalls: Writable<Map<string, GameInstallEntry>> = writable(
        new Map<string, GameInstallEntry>()
    );
    public readonly searchTerm: Writable<string> = writable('');
    public readonly searchResults: Writable<Fuzzysort.KeysResults<FileSearchEntry> | null> =
        writable(null);
    public readonly searchDuration: Writable<number> = writable(0);
    public readonly searching: Writable<boolean> = writable(false);
    private searchCache = new Map<string, WeakRef<Fuzzysort.KeysResults<FileSearchEntry>>>();
    private initPromise?: Promise<void>;

    public async initialize() {
        if (!(this.initPromise instanceof Promise)) {
            this.initPromise = this.load();
        }
        return this.initPromise;
    }

    private async load() {
        const gameInstalls = get(this.gameInstalls);
        let storedPaths: string[] = JSON.parse(
            localStorage.getItem(STORAGE_KEY_PATHS) ?? '[]'
        ) as string[];
        if (!Array.isArray(storedPaths)) {
            console.warn(
                'Invalid stored paths:',
                storedPaths,
                localStorage.getItem(STORAGE_KEY_PATHS)
            );
            storedPaths = [];
        }
        console.log('loaded paths:', storedPaths);

        for (const path of storedPaths) {
            const gameInstall = await this.createGameInstall(path);
            gameInstalls.set(path, gameInstall);
        }
        this.save();
    }

    private async createGameInstall(path: string): Promise<GameInstallEntry> {
        const version = await this.findGameVersion(path);
        const settings = await this.findAppSettings(path);
        const mnfFiles = await this.findMnfFiles(path);
        const label = await basename(path);
        return new GameInstallEntry(this, label, path, version, settings, mnfFiles);
    }

    public async add(path: string): Promise<GameInstallEntry | null> {
        const gameInstalls = get(this.gameInstalls);
        if (!gameInstalls.has(path)) {
            console.log('add install path:', path);
            const gameInstall = await this.createGameInstall(path);
            gameInstalls.set(path, gameInstall);
            this.save();
            return gameInstall;
        }
        console.log('install path already added:', path);
        return null;
    }

    public remove(path: string): boolean {
        const gameInstalls = get(this.gameInstalls);
        if (gameInstalls.has(path)) {
            console.log('remove install path:', path);
            gameInstalls.delete(path);
            this.save();
            return true;
        }
        console.log('install path was already removed:', path);
        return false;
    }

    private save() {
        const gameInstalls = get(this.gameInstalls);
        const paths = Array.from(gameInstalls.keys());
        localStorage.setItem(STORAGE_KEY_PATHS, JSON.stringify(paths));
        this.gameInstalls.set(gameInstalls);
    }

    async findMnfFiles(path: string): Promise<string[]> {
        return invoke('find_mnf_files_in_dir', { path });
    }

    async findGameVersion(path: string): Promise<GameVersionData> {
        let buildData = '';
        try {
            const file = await resolve(path, BUILD_INFO_FILE);
            buildData = await readTextFile(file);
        } catch (err) {
            console.warn('Could not load build data', err);
        }
        const lines = buildData.split('\n');
        if (lines.length > 2) {
            return {
                version: lines[2].trim(),
                buildDate: lines[1].trim(),
                buildNumber: lines[0].trim()
            };
        }
        return DUMMY_BUILD_DATA;
    }

    async findAppSettings(path: string): Promise<Map<string, string>> {
        let settingsData = '';
        try {
            const file = await resolve(path, APP_SETTINGS_FILE);
            settingsData = await readTextFile(file);
        } catch (err) {
            console.warn('Could not load app settings', err);
        }
        const lines = settingsData.split('\r\n');
        const settings: Map<string, string> = new Map();
        const regex = /^SET\s+(\S+)\s+"([^"]+)"$/;
        console.log('settings:', lines);
        for (const line of lines) {
            const match = line.match(regex);
            if (match) {
                settings.set(match[1], match[2]);
            }
        }
        console.log('parsed settings:', settings);
        return settings;
    }

    public async submitFileSearch(searchTerm: string) {
        if (searchTerm === '') {
            this.clearFileSearch();
            return;
        }

        const start = performance.now();
        const ref = this.searchCache.get(searchTerm);
        let result = ref?.deref();
        if (!result) {
            this.searching.set(true);
            result = await BackgroundService.getInstance().searchFiles(searchTerm);
            this.searchCache.set(searchTerm, new WeakRef(result));
            this.searching.set(false);
        }
        this.searchResults.set(result);
        this.searchTerm.set(searchTerm);
        this.searchDuration.set(performance.now() - start);
    }

    public clearFileSearch() {
        this.searchResults.set(null);
        this.searchTerm.set('');
    }

    public clearFileSearchCache() {
        this.searchResults.set(null);
        this.searchDuration.set(0);
        this.searchCache.clear();
        this.submitFileSearch(get(this.searchTerm)).catch(console.error);
    }

    public getGameInstallForArchive(path: string): GameInstallEntry | undefined {
        const gameInstalls = get(this.gameInstalls);
        for (const gameInstall of gameInstalls.values()) {
            if (path.startsWith(gameInstall.path + '\\')) {
                return gameInstall;
            }
        }
    }
}
