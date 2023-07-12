import { execSync } from 'child_process';
import * as fs from 'fs';
import * as zlib from 'zlib';

const BYTE_UNIT = ['bytes', 'kB', 'MB', 'GB', 'TB'];
export function formatFileSize(size: number, showBytes = true): string {
    let converted = size;
    let prefix = 0;
    while (converted >= 1024 && prefix < BYTE_UNIT.length) {
        converted /= 1024;
        prefix++;
    }
    let convertedString = converted.toLocaleString(undefined, { maximumFractionDigits: 1 }) + ' ' + BYTE_UNIT[prefix];
    if (showBytes) {
        convertedString += ' (' + size.toLocaleString() + ' bytes)'
    }
    return convertedString;
}

interface DiskSpaceCache {
    [index: string]: number
}
let diskSpaceCache: DiskSpaceCache;
let lastDiskSpaceCacheRefresh = 0;
const DISK_SPACE_REFRESH_THRESHOLD = 10000; //ms
function refreshDiskSpaceCacheIfNeeded() {
    if (Date.now() - lastDiskSpaceCacheRefresh < DISK_SPACE_REFRESH_THRESHOLD) {
        return;
    }

    try {
        let output = execSync('wmic logicaldisk get freespace,caption').toString('utf8');
        let lines = output.trim().split('\n');
        diskSpaceCache = {};
        for (let i = 1; i < lines.length; ++i) {
            let matches = lines[i].match(/([A-Z]):\s+(\d+)/);
            if (matches) {
                diskSpaceCache[matches[1]] = parseInt(matches[2]);
            }
        }
        lastDiskSpaceCacheRefresh = Date.now();
    } catch (err) {
        console.error('refreshDiskSpaceCache failed:', err);
    }
}

export function getFreeDiskSpace(drive: string): number {
    if (drive && drive.charAt(1) === ':') {
        refreshDiskSpaceCacheIfNeeded();
        let free = diskSpaceCache[drive.charAt(0).toUpperCase()];
        if (typeof (free) === 'number') {
            return free;
        }
        console.warn('no disk space data for drive', drive);
    } else {
        console.warn('invalid drive passed to hasEnoughDiskSpace', drive);
    }
    return -1;
}

export async function inflate(buffer: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        zlib.inflate(buffer, (err: Error, result: Buffer) => {
            if (!err) {
                resolve(result);
            } else {
                reject(err);
            }
        });
    });
}

export async function writeFile(path: string, content: Buffer, silent = false) {
    return new Promise((resolve, reject) => {
        fs.writeFile(path, content, err => {
            if (err) {
                reject(err);
            } else {
                if (!silent) {
                    console.log('finished writing to', path);
                }
                resolve();
            }
        })
    });
}

export async function requestSave(fileName: string, content: Buffer) {
    let saveDialog = $('<input type="file" />');
    saveDialog.prop("nwsaveas", fileName);
    saveDialog.on('change', async () => {
        let path = saveDialog.val() as string;
        if (path && path !== '') {
            writeFile(path, content);
        }
    })
    saveDialog.trigger('click');
}

export async function readFile(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.readFile(path, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        })
    });
}

export function getFileSize(path: string): number {
    let stats = fs.statSync(path);
    return stats.size;
}

async function openFile(path: string): Promise<number> {
    return new Promise((resolve, reject) => {
        fs.open(path, 'r', (err, fs) => {
            if (err) {
                reject(err);
            } else {
                resolve(fs);
            }
        })
    });
}

async function closeFile(fd: number): Promise<void> {
    return new Promise((resolve, reject) => {
        fs.close(fd, err => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        })
    });
}

async function readFromFile(fd: number, offset: number, length: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        fs.read(fd, new Buffer(length), 0, length, offset, (err, bytesRead, buffer) => {
            if (err) {
                reject(err);
            } else {
                if (bytesRead < length) {
                    console.warn('requested to read', length, 'bytes, but only got', bytesRead, 'bytes');
                }
                resolve(buffer);
            }
        })
    });
}

export async function readPartialFile(path: string, offset: number, length: number): Promise<Buffer> {
    let fd = -1;
    try {
        fd = await openFile(path);
        return await readFromFile(fd, offset, length);
    } catch (err) {
        console.warn('failed to read file', path, err);
    } finally {
        if (fd >= 0) {
            await closeFile(fd);
        }
    }
}

export function mkdir(path: string) {
    path = path.replace(/(\\|\/)+/g, '\\');
    if (path === '') {
        console.warn('called mkdir for empty path');
        return;
    }
    try {
        fs.mkdirSync(path);
    } catch (err) {
        if (err.code === 'ENOENT') {
            // parent path does not exist
            mkdir(path.substring(0, path.lastIndexOf('\\')));
            mkdir(path);
        } else if (err.code === 'EEXIST') {
            // path already exists
            return;
        } else {
            console.warn(err, err.code);
            return;
        }
    }
}
