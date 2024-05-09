import BackgroundWorker from '$lib/backend/BackgroundWorker';
import type { FileInfo } from '@tauri-apps/plugin-fs';
import BaseTauriHelper from './BaseTauriHelper';

// function setupTauriInternals() {
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const window: any = {};

//     function uid() {
//         return crypto.getRandomValues(new Uint32Array(1))[0];
//     }

//     interface TauriIpcMessage {
//         cmd: string;
//         callback: number;
//         error: number;
//         payload: unknown;
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         options?: { headers?: any };
//     }

//     function processIpcMessage(message: unknown) {
//         if (
//             message instanceof ArrayBuffer ||
//             ArrayBuffer.isView(message) ||
//             Array.isArray(message)
//         ) {
//             return {
//                 contentType: 'application/octet-stream',
//                 data: message
//             };
//         } else {
//             const data = JSON.stringify(message, (_k, val) => {
//                 if (val instanceof Map) {
//                     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//                     const o: any = {};
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//                     val.forEach((v, k) => (o[k] = v));
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//                     return o;
//                 } else if (
//                     val instanceof Object &&
//                     '__TAURI_CHANNEL_MARKER__' in val &&
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//                     typeof val.id === 'number'
//                 ) {
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//                     return `__CHANNEL__:${val.id}`;
//                 } else {
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//                     return val;
//                 }
//             });

//             return {
//                 contentType: 'application/json',
//                 data
//             };
//         }
//     }

//     function sendIpcMessage(message: TauriIpcMessage) {
//         const { cmd, callback, error, payload, options } = message;

//         const { contentType, data } = processIpcMessage(payload);
//         fetch(__TAURI_INTERNALS__.convertFileSrc(cmd, 'ipc'), {
//             method: 'POST',
//             body: data as BodyInit,
//             headers: {
//                 'Content-Type': contentType,
//                 'Tauri-Callback': callback,
//                 'Tauri-Error': error,
//                 ...((options && options.headers) || {})
//             } as Record<string, string>
//         })
//             .then((response) => {
//                 const cb = response.ok ? callback : error;
//                 // we need to split here because on Android the content-type gets duplicated
//                 switch ((response.headers.get('content-type') || '').split(',')[0]) {
//                     case 'application/json':
//                         // eslint-disable-next-line @typescript-eslint/no-unsafe-return
//                         return response.json().then((r) => [cb, r]);
//                     case 'text/plain':
//                         return response.text().then((r) => [cb, r]);
//                     default:
//                         return response.arrayBuffer().then((r) => [cb, r]);
//                 }
//             })
//             .then(([cb, data]) => {
//                 // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//                 if (window[`_${cb}`]) {
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
//                     window[`_${cb}`](data);
//                 } else {
//                     console.warn(
//                         `[TAURI] Couldn't find callback id {cb} in window. This might happen when the app is reloaded while Rust is running an asynchronous operation.`
//                     );
//                 }
//             })
//             .catch((e) => {
//                 console.error('failed to send', e);
//             });
//     }

//     function convertFileSrc(filePath: string, protocol = 'asset') {
//         const path = encodeURIComponent(filePath);
//         return `http://${protocol}.localhost/${path}`;
//     }

//     function transformCallback(callback: (result: unknown) => void, once: boolean) {
//         const identifier = uid();
//         const prop = `_${identifier}`;

//         Object.defineProperty(window, prop, {
//             value: (result: unknown) => {
//                 if (once) {
//                     // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
//                     Reflect.deleteProperty(window, prop);
//                 }

//                 return callback && callback(result);
//             },
//             writable: false,
//             configurable: true
//         });

//         return identifier;
//     }

//     function invoke(cmd: string, payload = {}, options: { headers?: Record<string, string> }) {
//         return new Promise(function (resolve, reject) {
//             const callback = __TAURI_INTERNALS__.transformCallback(function (r) {
//                 resolve(r);
//                 // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//                 delete window[`_${error}`];
//             }, true);
//             const error = __TAURI_INTERNALS__.transformCallback(function (e) {
//                 reject(e);
//                 // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//                 delete window[`_${callback}`];
//             }, true);

//             sendIpcMessage({
//                 cmd,
//                 callback,
//                 error,
//                 payload,
//                 options
//             });
//         });
//     }

//     // adapted from tauri core source so we can use invoke directly in the worker
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
//     const __TAURI_INTERNALS__ = {
//         postMessage: sendIpcMessage,
//         convertFileSrc,
//         transformCallback,
//         ipc: sendIpcMessage,
//         invoke
//     };
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
//     window.__TAURI_INTERNALS__ = __TAURI_INTERNALS__;
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
//     (globalThis as any).window = window;
// }

// if (!globalThis.window) setupTauriInternals();

export default class BackgroundTauriHelper extends BaseTauriHelper {
    public getInflateUrl() {
        return BackgroundWorker.getInstance().config.inflateUrl;
    }

    public getReadPartialFileUrl() {
        return BackgroundWorker.getInstance().config.readPartialFileUrl;
    }

    public getDecompressUrl() {
        return BackgroundWorker.getInstance().config.decompressUrl;
    }

    public getExtractUrl() {
        return BackgroundWorker.getInstance().config.extractUrl;
    }

    public async getFileMetadata(path: string): Promise<FileInfo> {
        return BackgroundWorker.getInstance().getFileMetadata(path);
    }

    public async getBasename(path: string, ext?: string): Promise<string> {
        return BackgroundWorker.getInstance().getBasename(path, ext);
    }

    public async getDirname(path: string): Promise<string> {
        return BackgroundWorker.getInstance().getDirname(path);
    }

    public async resolve(...paths: string[]): Promise<string> {
        return BackgroundWorker.getInstance().resolvePath(...paths);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    public async getExtractionTargetFolder(): Promise<string> {
        const path = localStorage.getItem('extract-target-folder');
        if (!path) {
            console.warn('tried to get extraction target folder, but none was set');
            return '';
        }
        return path;
    }

    public setExtractionTargetFolder(folder: string) {
        console.warn('setExtractionTargetFolder not implemented in worker', folder);
    }
}
