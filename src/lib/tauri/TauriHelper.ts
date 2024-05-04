import BackgroundWorker from '$lib/backend/BackgroundWorker';
import BackgroundTauriHelper from './BackgroundTauriHelper';
import type BaseTauriHelper from './BaseTauriHelper';
import ForegroundTauriHelper from './ForegroundTauriHelper';

export default abstract class TauriHelper {
    private static instance: BaseTauriHelper;

    public static getInstance(): BaseTauriHelper {
        if (!this.instance) {
            if (BackgroundWorker.isWorker()) {
                this.instance = new BackgroundTauriHelper();
            } else {
                this.instance = new ForegroundTauriHelper();
            }
        }
        return this.instance;
    }

    private constructor() { }
}
