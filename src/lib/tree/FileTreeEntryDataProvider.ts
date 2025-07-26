// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import type ContentEntry from '$lib/ContentEntry';
import type { MnfFileData } from '$lib/mnf/MnfFileData';

export default interface FileTreeEntryDataProvider extends ContentEntry {
    get icon(): string;
    get label(): string;
    get path(): string;
    get hasChildren(): boolean;
    get mnfFiles(): MnfFileData[];

    loadChildren(): Promise<FileTreeEntryDataProvider[]>;
}
