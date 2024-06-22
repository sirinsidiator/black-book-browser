import { path } from '@tauri-apps/api';
import { writable, type Writable } from 'svelte/store';

const TARGET_FOLDER_KEY = 'extract-target-folder';
const PRESERVE_PARENTS_KEY = 'extract-preserve-parents';
const DECOMPRESS_FILES_KEY = 'extract-decompress-files';

export default class ExtractionOptions {
    public readonly targetFolder: Writable<string> = writable('');
    public readonly preserveParents: Writable<boolean> = writable(true);
    public readonly decompressFiles: Writable<boolean> = writable(true);

    constructor() {
        const folder = localStorage.getItem(TARGET_FOLDER_KEY);
        if (!folder) {
            path.desktopDir().then((desktopDir) => this.targetFolder.set(desktopDir));
        } else {
            this.targetFolder.set(folder);
        }
        this.preserveParents.set(localStorage.getItem(PRESERVE_PARENTS_KEY) !== 'false');
        this.decompressFiles.set(localStorage.getItem(DECOMPRESS_FILES_KEY) !== 'false');

        this.targetFolder.subscribe((value) => localStorage.setItem(TARGET_FOLDER_KEY, value));
        this.preserveParents.subscribe((value) =>
            localStorage.setItem(PRESERVE_PARENTS_KEY, value.toString())
        );
        this.decompressFiles.subscribe((value) =>
            localStorage.setItem(DECOMPRESS_FILES_KEY, value.toString())
        );
    }
}
