import { document } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import type MnfEntry from './mnf/MnfEntry';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';
import DDSHelper from './frontend/DDSHelper';

abstract class FilePreview {}

class TextureFilePreview implements FilePreview {
    constructor(public readonly canvas: HTMLCanvasElement) {
        console.log('TextureFilePreview', canvas);
    }

    public getDataUrl() {
        return this.canvas.toDataURL();
    }
}

export class FileEntry implements FileBrowserEntryData {
    public readonly stateManager: StateManager;
    public readonly icon = document;
    public readonly children: FileBrowserEntryData[] = [];
    public readonly opened: Writable<boolean> = writable(false);

    constructor(
        public readonly mnfEntry: MnfEntry,
        public readonly parent: FileBrowserEntryData,
        public readonly label: string
    ) {
        this.stateManager = parent.stateManager;
    }

    public select() {
        console.log('select file:', this.label, this);
        this.stateManager.setActiveContent(this);
    }

    public toggleOpen() {
        /* noop */
    }

    public async getPreviewLoader(): Promise<FilePreview | null> {
        if (this.mnfEntry.fileName?.endsWith('.dds')) {
            console.log('getPreviewLoader', this.mnfEntry.fileName);
            const data = await this.mnfEntry.archive.getContent(this.mnfEntry);
            if (data) {
                const canvas = new DDSHelper().createCanvas(data);
                if (canvas) {
                    console.log('getPreviewLoader', canvas);
                    return new TextureFilePreview(canvas);
                }
            }
        }
        return null;
    }
}
