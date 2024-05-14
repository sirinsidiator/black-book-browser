import type ContentEntry from '$lib/ContentEntry';
import { FileEntry } from '$lib/FileEntry';
import BackgroundService from '$lib/backend/BackgroundService';
import DDSHelper from '$lib/frontend/preview/loader/DDSHelper';
import BufferReader from '$lib/util/BufferReader';
import ImageViewer from '../ImagePreview.svelte';
import { ContentPreviewLoader, ContentPreviewLoaderFactory } from './ContentPreviewLoader';

export default abstract class ImageFilePreviewLoader implements ContentPreviewLoader {
    public readonly previewClass = ImageViewer;
    public readonly canSave = true;
    protected dataUrl?: string;

    constructor(private readonly file: FileEntry) {}

    public abstract prepare(): Promise<void>;

    protected async loadImageData() {
        return BackgroundService.getInstance().loadFileContent(this.file.file);
    }

    public getDataUrl() {
        if (!this.dataUrl) {
            throw new Error('Tried to get data url before preview was prepared');
        }
        return this.dataUrl;
    }

    public save() {
        const url = this.getDataUrl();
        const a = document.createElement('a');
        a.href = url;
        a.download = this.file.label.endsWith('.png') ? this.file.label : this.file.label + '.png';
        a.click();
    }
}

class DDSImagePreviewLoader extends ImageFilePreviewLoader {
    public async prepare(): Promise<void> {
        const data = await this.loadImageData();
        const canvas = new DDSHelper().createCanvas(data);
        this.dataUrl = canvas.toDataURL();
    }
}

class PNGImagePreviewLoader extends ImageFilePreviewLoader {
    public async prepare(): Promise<void> {
        const data = await this.loadImageData();

        const view = new BufferReader(data);
        view.skip(1);
        const header = view.readString(3);
        if (header !== 'PNG') {
            console.warn('Invalid PNG header', header);
            throw new Error('Invalid PNG data');
        }

        const blob = new Blob([data], { type: 'image/png' });

        this.dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject(new Error('Could not get data url from raw data'));
                }
            };
            reader.onerror = (error) => {
                console.warn('FileReader failed', error);
                reject(new Error('Error reading data url'));
            };
            reader.readAsDataURL(blob);
        });
    }
}

class DDSImagePreviewFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return content instanceof FileEntry && content.file.fileName.endsWith('.dds');
    }

    public create(content: ContentEntry) {
        return new DDSImagePreviewLoader(content as FileEntry);
    }
}

class PNGImagePreviewFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return content instanceof FileEntry && content.file.fileName.endsWith('.png');
    }

    public create(content: ContentEntry) {
        return new PNGImagePreviewLoader(content as FileEntry);
    }
}

ContentPreviewLoader.registerLoader(new DDSImagePreviewFactory());
ContentPreviewLoader.registerLoader(new PNGImagePreviewFactory());
