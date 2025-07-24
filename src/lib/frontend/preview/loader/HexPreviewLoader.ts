// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type ContentEntry from '$lib/ContentEntry';
import { FileEntry } from '$lib/FileEntry';
import BackgroundService from '$lib/backend/BackgroundService';
import BufferReader from '$lib/util/BufferReader';
import HexPreview from '../HexPreview.svelte';
import { ContentPreviewLoader, ContentPreviewLoaderFactory } from './ContentPreviewLoader';

export class HexPreviewLoader implements ContentPreviewLoader {
    public readonly previewClass = HexPreview;
    public readonly canSave = false;
    private _view?: BufferReader;

    constructor(public readonly file: FileEntry) {}

    public get view() {
        return this._view;
    }

    public prepare() {
        return Promise.resolve();
    }

    public save() {
        // Do nothing
    }

    public async load() {
        const fileData = this.file.file;
        const data = await BackgroundService.getInstance().loadFileContent(fileData);
        this._view = new BufferReader(data);
        return this;
    }
}

class HexPreviewLoaderFactory extends ContentPreviewLoaderFactory {
    public supports(content: ContentEntry) {
        return content instanceof FileEntry;
    }

    public create(content: ContentEntry) {
        return new HexPreviewLoader(content as FileEntry);
    }
}
ContentPreviewLoader.registerLoader(new HexPreviewLoaderFactory());
