import StateManager from '../lib/StateManager';
import type { LayoutLoad } from './$types';

export const ssr = false;

export const load = (async () => {
    return {
        stateManager: new StateManager()
    };
}) satisfies LayoutLoad;