import hljs, { type HighlightResult } from 'highlight.js';
import { document } from 'ionicons/icons';
import { writable, type Writable } from 'svelte/store';
import DDSHelper from './frontend/DDSHelper';
import type MnfEntry from './mnf/MnfEntry';
import type StateManager from './StateManager';
import type { FileBrowserEntryData } from './StateManager';
import BufferReader from './util/BufferReader';

abstract class FilePreview {}

export class ImageFilePreview implements FilePreview {
    constructor(public readonly canvas: HTMLCanvasElement) {
        console.log('ImageFilePreview', canvas);
    }

    public getDataUrl() {
        return this.canvas.toDataURL();
    }
}

export class TextFilePreview implements FilePreview {
    private result: HighlightResult;

    constructor(public readonly content: string, public readonly language: string) {
        console.log('TextFilePreview',  language);
        this.result = hljs.highlight(content, { language: language });
    }

    public getText() {
        return this.result.value;
    }
}

const EXT_TO_LANGUAGE: { [index: string]: string } = {
    '.lua': 'lua',
    '.txt': 'ini',
    '.xml': 'xml',
    '.hlsl': 'c++',
    '.fxh': 'c++',
    '.frag': 'c++',
    '.vert': 'c++',
    '.geom': 'c++',
    '.comp': 'c++',
};

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
        const extension =
            this.mnfEntry.fileName?.substr(this.mnfEntry.fileName.lastIndexOf('.')) ?? '';
        if (extension === '.dds') {
            console.log('getPreviewLoader', this.mnfEntry.fileName);
            const data = await this.mnfEntry.archive.getContent(this.mnfEntry);
            if (data) {
                const canvas = new DDSHelper().createCanvas(data);
                if (canvas) {
                    console.log('getPreviewLoader', canvas);
                    return new ImageFilePreview(canvas);
                }
            }
        } else if (EXT_TO_LANGUAGE[extension]) {
            console.log('getPreviewLoader', this.mnfEntry.fileName);
            const data = await this.mnfEntry.archive.getContent(this.mnfEntry);
            if (data) {
                const view = new BufferReader(data);
                return new TextFilePreview(view.readString(), EXT_TO_LANGUAGE[extension]);
            }
        }
        return null;
    }
}
