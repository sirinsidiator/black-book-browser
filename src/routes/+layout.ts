// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import StateManager from '$lib/StateManager';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load = (() => {
    return {
        stateManager: new StateManager()
    };
}) satisfies LayoutLoad;
