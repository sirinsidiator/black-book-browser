import { readDir, readTextFile, type FileEntry } from '@tauri-apps/api/fs';
import { get, writable, type Writable } from 'svelte/store';
import { GameInstallEntry } from './GameInstallEntry';
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
        return new GameInstallEntry(label, path, version, settings, mnfFiles);
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
        const mnfList: string[] = [];
        const files = await readDir(path, {
            recursive: true
        });
        this.filterMnfFiles(files, mnfList);
        return mnfList;
    }

    private filterMnfFiles(files: FileEntry[], mnfList: string[], depth = 0) {
        if (depth > 4) return;
        for (const file of files) {
            if (file.children) {
                this.filterMnfFiles(file.children, mnfList, depth + 1);
            } else if (file.name?.endsWith('.mnf')) {
                mnfList.push(file.path);
            }
        }
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
        console.log('parsed settings:', settings)
        return settings;
    }
}
