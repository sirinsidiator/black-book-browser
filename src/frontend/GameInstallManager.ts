import { readdirSync, readFileSync, statSync } from "fs";
import { resolve } from "path";

interface InstallPathSet { [key: string]: boolean; }
interface GameVersionData {
    version: string
    buildDate: string
    buildNumber: string
}

const STORAGE_KEY_LAST_ADDED = 'gameinstall.last';
const STORAGE_KEY_PATHS = 'gameinstall.paths';
const BUILD_INFO_FILE = 'depot/_databuild/databuild.stamp';
const DUMMY_BUILD_DATA = {
    version: '-',
    buildDate: '-',
    buildNumber: '-'
}

export default class GameInstallManager {
    paths: InstallPathSet;
    lastAdded: string;

    constructor() {
        this.paths = JSON.parse(localStorage.getItem(STORAGE_KEY_PATHS) || '{}');
        this.lastAdded = localStorage.getItem(STORAGE_KEY_LAST_ADDED) || process.cwd();
    }

    add(path: string): boolean {
        if (!this.paths[path]) {
            console.log('add install path:', path);
            this.paths[path] = true;
            this.save();

            this.lastAdded = path;
            localStorage.setItem(STORAGE_KEY_LAST_ADDED, path);
            return true;
        }
        console.log('install path already added:', path);
        return false;
    }

    remove(path: string): boolean {
        console.log('remove install path:', path);
        if (!!this.paths[path]) {
            delete this.paths[path];
            this.save();
            return true;
        }
        console.log('install path was already removed:', path);
        return false;
    }

    save() {
        localStorage.setItem(STORAGE_KEY_PATHS, JSON.stringify(this.paths));
    }

    getPaths(): string[] {
        return Object.keys(this.paths);
    }

    getLastAddedPath(): string {
        return this.lastAdded;
    }

    findMnfFiles(path: string): string[] {
        let dirList = [path];
        let mnfList = [];
        let i, baseDir, files, file, fileStats;

        while (dirList.length > 0) {
            baseDir = dirList.shift();
            files = readdirSync(baseDir);
            for (i = 0; i < files.length; ++i) {
                file = baseDir + '\\' + files[i];
                fileStats = statSync(file);
                if (fileStats.isDirectory()) {
                    dirList.push(file);
                } else if (file.endsWith('.mnf')) {
                    mnfList.push(file);
                }
            }
        }

        return mnfList;
    }

    findGameVersion(path: string): GameVersionData {
        let buildData = '';
        try {
            let file = resolve(path, BUILD_INFO_FILE);
            buildData = readFileSync(file, 'utf8');
        } catch (err) {
            console.warn('Could not load build data', err);
        }
        let lines = buildData.split('\n');
        if (lines.length > 2) {
            return {
                version: lines[2].trim(),
                buildDate: lines[1].trim(),
                buildNumber: lines[0].trim()
            };
        }
        return DUMMY_BUILD_DATA;
    }

}
