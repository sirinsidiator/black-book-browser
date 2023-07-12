import { basename, dirname } from "path";
import type MnfEntry from "../mnf/MnfEntry";

export interface SearchResult {
    type: SearchResultType;
    archivePath: string;
    path: string;
    entry?: MnfEntry;
}

export enum SearchResultType {
    DIRECTORY, FILE
}

export default class SearchHelper {
    archivePath: string;
    pathLookup: Map<string, MnfEntry>;
    directories: Set<string>;
    files: Map<string, MnfEntry[]>;

    constructor(archivePath: string) {
        this.archivePath = archivePath;
        this.pathLookup = new Map();
        this.directories = new Set();
        this.files = new Map();
    }

    addEntry(entry: MnfEntry) {
        const path = entry.fileName as string;
        this.pathLookup.set(path, entry);

        let directory = dirname(path);
        while (directory !== '/') {
            this.directories.add(directory);
            directory = dirname(directory);
        }

        const file = basename(path);
        const entries = this.files.get(file) || [];
        entries.push(entry);
        this.files.set(file, entries);
    }

    getByPath(path: string): MnfEntry {
        return this.pathLookup.get(path)!;
    }

    search(input: string | RegExp): SearchResult[] {
        let isMatch: (name: string) => boolean;
        if (input instanceof RegExp) {
            isMatch = name => input.test(name);
        } else {
            isMatch = name => name.indexOf(input) >= 0;
        }

        const results: SearchResult[] = [];
        this.directories.forEach(directory => {
            if (isMatch(directory)) {
                results.push({
                    type: SearchResultType.DIRECTORY,
                    archivePath: this.archivePath,
                    path: directory,
                });
            }
        });

        this.files.forEach((entries, file) => {
            if (isMatch(file)) {
                entries.forEach(entry => {
                    results.push({
                        type: SearchResultType.FILE,
                        archivePath: this.archivePath,
                        path: entry.fileName as string,
                        entry: entry,
                    });
                });
            }
        });

        return results;
    }

}