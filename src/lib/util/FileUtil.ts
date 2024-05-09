import type { ExtractFilesProgress, ExtractFilesResult } from '$lib/mnf/MnfArchive';
import type MnfArchiveFile from '$lib/mnf/MnfArchiveFile';
import type MnfEntry from '$lib/mnf/MnfEntry';
import TauriHelper from '$lib/tauri/TauriHelper';

const BYTE_UNIT = ['bytes', 'kB', 'MB', 'GB', 'TB'];
export function formatFileSize(size: number, showBytes = true): string {
    let converted = size;
    let prefix = 0;
    while (converted >= 1024 && prefix < BYTE_UNIT.length) {
        converted /= 1024;
        prefix++;
    }
    let convertedString =
        converted.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + BYTE_UNIT[prefix];
    if (showBytes) {
        convertedString += ' (' + size.toLocaleString() + ' bytes)';
    }
    return convertedString;
}

// interface DiskSpaceCache {
//     [index: string]: number;
// }
// let diskSpaceCache: DiskSpaceCache;
// let lastDiskSpaceCacheRefresh = 0;
// const DISK_SPACE_REFRESH_THRESHOLD = 10000; //ms
// function refreshDiskSpaceCacheIfNeeded() {
//     if (Date.now() - lastDiskSpaceCacheRefresh < DISK_SPACE_REFRESH_THRESHOLD) {
//         return;
//     }

//     // try {
//     //     let output = execSync('wmic logicaldisk get freespace,caption').toString('utf8');
//     //     let lines = output.trim().split('\n');
//     //     diskSpaceCache = {};
//     //     for (let i = 1; i < lines.length; ++i) {
//     //         let matches = lines[i].match(/([A-Z]):\s+(\d+)/);
//     //         if (matches) {
//     //             diskSpaceCache[matches[1]] = parseInt(matches[2]);
//     //         }
//     //     }
//     lastDiskSpaceCacheRefresh = Date.now();
//     // } catch (err) {
//     //     console.error('refreshDiskSpaceCache failed:', err);
//     // }
// }

export function getFreeDiskSpace(drive: string): number {
    console.log('getFreeDiskSpace', drive);
    // if (drive && drive.charAt(1) === ':') {
    //     refreshDiskSpaceCacheIfNeeded();
    //     let free = diskSpaceCache[drive.charAt(0).toUpperCase()];
    //     if (typeof (free) === 'number') {
    //         return free;
    //     }
    //     console.warn('no disk space data for drive', drive);
    // } else {
    //     console.warn('invalid drive passed to hasEnoughDiskSpace', drive);
    // }
    return -1;
}

export async function inflate(buffer: Uint8Array): Promise<Uint8Array> {
    const url = TauriHelper.getInstance().getInflateUrl();
    const response = await fetch(url, {
        method: 'POST',
        body: buffer
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export async function writeFile(path: string, content: Uint8Array, silent = false) {
    return new Promise((resolve, reject) => {
        console.log('writing to', path, content.length, silent);
        reject(new Error('not implemented'));
        // fs.writeFile(path, content, err => {
        //     if (err) {
        //         reject(err);
        //     } else {
        //         if (!silent) {
        //             console.log('finished writing to', path);
        //         }
        //         resolve();
        //     }
        // })
    });
}

export async function requestSave(fileName: string, content: Buffer) {
    console.log('requestSave', fileName, content.length);
    return Promise.reject(new Error('not implemented'));
    // let saveDialog = $('<input type="file" />');
    // saveDialog.prop("nwsaveas", fileName);
    // saveDialog.on('change', async () => {
    //     let path = saveDialog.val() as string;
    //     if (path && path !== '') {
    //         writeFile(path, content);
    //     }
    // })
    // saveDialog.trigger('click');
}

export async function getFileSize(path: string): Promise<number> {
    const meta = await TauriHelper.getInstance().getFileMetadata(path);
    return meta.size;
}

export async function readPartialFile(
    path: string,
    offset: number,
    length: number
): Promise<Uint8Array> {
    const url = TauriHelper.getInstance().getReadPartialFileUrl();
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ path, offset, length })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export async function extractFiles(
    files: {
        target: string;
        archiveFile: MnfArchiveFile;
        fileEntry: MnfEntry;
    }[],
    decompress: boolean
): Promise<ExtractFilesResult> {
    const url = TauriHelper.getInstance().getExtractUrl();
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(
            files.map((file) => ({
                targetPath: file.target,
                archivePath: file.archiveFile.path,
                offset: file.fileEntry.data.named['offset'].value as number,
                compressedSize: file.fileEntry.data.named['compressedSize'].value as number,
                fileSize: file.fileEntry.data.named['fileSize'].value as number,
                compressionType: !decompress
                    ? 0
                    : (file.fileEntry.data.named['compressionType'].value as number)
            }))
        )
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    return response.json() as Promise<ExtractFilesResult>;
}

export async function getExtractFileProgress(): Promise<ExtractFilesProgress> {
    const url = TauriHelper.getInstance().getExtractProgressUrl();
    const response = await fetch(url);
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    return response.json() as Promise<ExtractFilesProgress>;
}

export async function decompress(
    path: string,
    offset: number,
    compressedSize: number,
    fileSize: number
): Promise<Uint8Array> {
    const url = TauriHelper.getInstance().getDecompressUrl();
    const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify({ path, offset, compressedSize, fileSize })
    });
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
    }
    const content = await response.arrayBuffer();
    return new Uint8Array(content);
}

export function mkdir(path: string) {
    console.log('mkdir', path);
    return Promise.reject(new Error('not implemented'));
    // path = path.replace(/(\\|\/)+/g, '\\');
    // if (path === '') {
    //     console.warn('called mkdir for empty path');
    //     return;
    // }
    // try {
    //     fs.mkdirSync(path);
    // } catch (err) {
    //     if (err.code === 'ENOENT') {
    //         // parent path does not exist
    //         mkdir(path.substring(0, path.lastIndexOf('\\')));
    //         mkdir(path);
    //     } else if (err.code === 'EEXIST') {
    //         // path already exists
    //         return;
    //     } else {
    //         console.warn(err, err.code);
    //         return;
    //     }
    // }
}

export function basename(path: string, ext?: string): Promise<string> {
    return TauriHelper.getInstance().getBasename(path, ext);
}

export function dirname(path: string): Promise<string> {
    return TauriHelper.getInstance().getDirname(path);
}

export function resolve(...paths: string[]) {
    return TauriHelper.getInstance().resolve(...paths);
}
