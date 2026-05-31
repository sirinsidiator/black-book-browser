// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import GameInstallManager from './GameInstallManager';
import type FileTreeEntryDataProvider from './tree/FileTreeEntryDataProvider';

export default class StateManager {
    public selectedContent: FileTreeEntryDataProvider | null = $state(null);
    public extractDialogOpen = $state(false);
    public readonly gameInstallManager: GameInstallManager;

    constructor() {
        this.gameInstallManager = new GameInstallManager();
    }
}
