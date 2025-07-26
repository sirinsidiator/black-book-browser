// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type ContentEntry from '$lib/ContentEntry';
import type { Component } from 'svelte';
import NoPreview from '../NoPreview.svelte';

export type ContentPreviewLoaderComponent = Component<{ loader: ContentPreviewLoader }>;

export abstract class ContentPreviewLoaderFactory {
    public abstract supports(content: ContentEntry): boolean;
    public abstract create(content: ContentEntry): ContentPreviewLoader;
}

export abstract class ContentPreviewLoader {
    private static loaders: ContentPreviewLoaderFactory[] = [];

    public static async load(content: ContentEntry) {
        const loaderFactory = this.loaders.find((loader) => loader.supports(content));
        if (!loaderFactory) {
            return new NoPreviewLoader();
        }
        const loader = loaderFactory.create(content);
        await loader.prepare();
        return loader;
    }

    public static registerLoader(loader: ContentPreviewLoaderFactory): void {
        this.loaders.push(loader);
    }

    public abstract readonly component: ContentPreviewLoaderComponent;
    public abstract readonly canSave: boolean;

    public abstract prepare(): Promise<void>;
    public abstract save(...options: unknown[]): void;
}

class NoPreviewLoader extends ContentPreviewLoader {
    public readonly component = NoPreview;
    public readonly canSave = false;

    public prepare() {
        return Promise.resolve();
    }

    public save() {
        // Do nothing
    }
}
