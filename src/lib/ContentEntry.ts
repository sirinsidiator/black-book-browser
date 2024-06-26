// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import { ContentPreviewLoader } from './frontend/preview/loader/ContentPreviewLoader';

export default abstract class ContentEntry {
    public abstract readonly label: string;
    private previewCache?: WeakRef<ContentPreviewLoader>;

    public async getPreviewLoader(): Promise<ContentPreviewLoader> {
        let preview = this.previewCache?.deref();
        if (!preview) {
            preview = await ContentPreviewLoader.load(this);
            this.previewCache = new WeakRef(preview);
        }
        return preview;
    }
}
