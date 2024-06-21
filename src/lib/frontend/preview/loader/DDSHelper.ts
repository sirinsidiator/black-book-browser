// SPDX-FileCopyrightText: 2024 sirinsidiator
//
// SPDX-License-Identifier: GPL-3.0-or-later

import BufferReader from '$lib/util/BufferReader';

const ALPHA = 0xff;
const BLOCK_HEIGHT = 4;
const BLOCK_WIDTH = 4;
const COLOR_CANNELS = 4;

const DDS_MAGIC = 0x20534444;

const DDSD_CAPS = 0x1;
const DDSD_HEIGHT = 0x2;
const DDSD_WIDTH = 0x4;
const DDSD_PITCH = 0x8;
const DDSD_PIXELFORMAT = 0x1000;
const DDSD_MIPMAPCOUNT = 0x20000;
const DDSD_LINEARSIZE = 0x80000;
const DDSD_DEPTH = 0x800000;

const DDPF_ALPHAPIXELS = 0x1;
const DDPF_ALPHA = 0x2;
const DDPF_FOURCC = 0x4;
const DDPF_RGB = 0x40;
const DDPF_YUV = 0x200;
const DDPF_LUMINANCE = 0x20000;

function headerFlagsToDebugString(flags: number, ...affected: number[]): string {
    const result = [];
    if (flags & DDSD_CAPS && affected.includes(DDSD_CAPS)) {
        result.push('DDSD_CAPS');
    }
    if (flags & DDSD_HEIGHT && affected.includes(DDSD_HEIGHT)) {
        result.push('DDSD_HEIGHT');
    }
    if (flags & DDSD_WIDTH && affected.includes(DDSD_WIDTH)) {
        result.push('DDSD_WIDTH');
    }
    if (flags & DDSD_PITCH && affected.includes(DDSD_PITCH)) {
        result.push('DDSD_PITCH');
    }
    if (flags & DDSD_PIXELFORMAT && affected.includes(DDSD_PIXELFORMAT)) {
        result.push('DDSD_PIXELFORMAT');
    }
    if (flags & DDSD_MIPMAPCOUNT && affected.includes(DDSD_MIPMAPCOUNT)) {
        result.push('DDSD_MIPMAPCOUNT');
    }
    if (flags & DDSD_LINEARSIZE && affected.includes(DDSD_LINEARSIZE)) {
        result.push('DDSD_LINEARSIZE');
    }
    if (flags & DDSD_DEPTH && affected.includes(DDSD_DEPTH)) {
        result.push('DDSD_DEPTH');
    }
    return result.join(' | ');
}

function pixelFormatFlagsToDebugString(flags: number): string {
    const result = [];
    if (flags & DDPF_ALPHAPIXELS) {
        result.push('DDPF_ALPHAPIXELS');
    }
    if (flags & DDPF_ALPHA) {
        result.push('DDPF_ALPHA');
    }
    if (flags & DDPF_FOURCC) {
        result.push('DDPF_FOURCC');
    }
    if (flags & DDPF_RGB) {
        result.push('DDPF_RGB');
    }
    if (flags & DDPF_YUV) {
        result.push('DDPF_YUV');
    }
    if (flags & DDPF_LUMINANCE) {
        result.push('DDPF_LUMINANCE');
    }
    return result.join(' | ');
}

// adapted from https://learn.microsoft.com/en-gb/windows/win32/direct3ddds/dds-pixelformat
export default class DDSHelper {
    createCanvas(data: Uint8Array): HTMLCanvasElement {
        const imageData = this.parse(data);

        const canvas = document.createElement('canvas');
        canvas.width = imageData.width;
        canvas.height = imageData.height;

        const context = canvas.getContext('2d');
        context?.putImageData(imageData, 0, 0);

        return canvas;
    }

    parse(data: Uint8Array): ImageData {
        const view = new BufferReader(data);
        const magic = view.readUInt32();
        if (magic !== DDS_MAGIC) {
            console.warn('Invalid magic number in DDS header', magic, view);
            throw new Error('Invalid magic number in DDS header');
        }

        console.log('read DDS header', data);

        const headerSize = view.readUInt32();
        if (headerSize !== 124) {
            console.warn('Invalid header size in DDS header', headerSize, view);
            throw new Error('Invalid header size in DDS header');
        }

        const headerFlags = view.readUInt32();

        const height = view.readUInt32();
        const width = view.readUInt32();
        const pitchOrLinearSize = view.readUInt32();
        const depth = view.readUInt32();
        const mipMapCount = view.readUInt32();
        view.skip(11 * 4); // reserved1

        const pixelFormatSize = view.readUInt32();
        const pixelFormatFlags = view.readUInt32();
        const fourCC = view.readString(4);

        const rgbBitCount = view.readUInt32();
        const rBitMask = view.readUInt32();
        const gBitMask = view.readUInt32();
        const bBitMask = view.readUInt32();
        const aBitMask = view.readUInt32();

        const caps = view.readUInt32();
        const caps2 = view.readUInt32();
        const caps3 = view.readUInt32();
        const caps4 = view.readUInt32();
        view.skip(4); // reserved2

        const header = {
            size: headerSize,
            flags: headerFlags,
            height,
            width,
            pitchOrLinearSize,
            depth,
            mipMapCount,
            pixelFormat: {
                size: pixelFormatSize,
                flags: pixelFormatFlags,
                fourCC,
                RGBBitCount: rgbBitCount,
                RBitMask: rBitMask,
                GBitMask: gBitMask,
                BBitMask: bBitMask,
                ABitMask: aBitMask
            },
            caps,
            caps2,
            caps3,
            caps4
        };

        if (
            !(headerFlags & DDSD_CAPS) ||
            !(headerFlags & DDSD_HEIGHT) ||
            !(headerFlags & DDSD_WIDTH) ||
            !(headerFlags & DDSD_PIXELFORMAT)
        ) {
            console.warn(
                'Invalid header flags in DDS header',
                headerFlagsToDebugString(
                    headerFlags,
                    DDSD_CAPS,
                    DDSD_HEIGHT,
                    DDSD_WIDTH,
                    DDSD_PIXELFORMAT
                ),
                view,
                header
            );
            throw new Error('Invalid header flags in DDS header');
        }

        if (headerFlags & DDSD_MIPMAPCOUNT || headerFlags & DDSD_DEPTH) {
            console.warn(
                'Ignore unsupported header flags in DDS header:',
                headerFlagsToDebugString(headerFlags, DDSD_MIPMAPCOUNT, DDSD_DEPTH),
                view,
                header
            );
        }

        let pixelData: Uint8ClampedArray;
        if (pixelFormatFlags === DDPF_FOURCC) {
            if (pixelFormatSize !== 32) {
                console.warn(
                    'Invalid pixel format size in DDS header',
                    pixelFormatSize,
                    view,
                    header
                );
                throw new Error('Invalid pixel format size in DDS header');
            }
            switch (header.pixelFormat.fourCC) {
                case 'DXT1':
                    pixelData = this.decompressDXT1(view, header.width, header.height);
                    break;
                case 'DXT3':
                    pixelData = this.decompressDXT3(view, header.width, header.height);
                    break;
                case 'DXT5':
                    pixelData = this.decompressDXT5(view, header.width, header.height);
                    break;
                default:
                    console.warn(
                        'Unsupported FourCC code',
                        header.pixelFormat.fourCC,
                        view,
                        header
                    );
                    throw new Error('Unsupported FourCC code');
            }
        } else if (pixelFormatFlags === (DDPF_RGB | DDPF_ALPHAPIXELS)) {
            pixelData = this.readA8R8G8B8(view, header.width, header.height);
        } else {
            console.warn(
                'Unsupported pixel format flags',
                pixelFormatFlagsToDebugString(pixelFormatFlags),
                view,
                header
            );
            throw new Error('Unsupported pixel format flags');
        }

        return new ImageData(pixelData, header.width, header.height);
    }

    readA8R8G8B8(view: BufferReader, width: number, height: number): Uint8ClampedArray {
        const pixelData = new Uint8ClampedArray(width * height * 4);
        for (let i = 0; i < pixelData.length; i += 4) {
            pixelData[i + 0] = view.readUInt8();
            pixelData[i + 1] = view.readUInt8();
            pixelData[i + 2] = view.readUInt8();
            pixelData[i + 3] = view.readUInt8();
        }
        return pixelData;
    }

    // 64 bit contain 16 pixels
    // 2x 16-bit RGB 5:6:5 color
    // 4x4 2-bit lookup table
    decompressDXT1(view: BufferReader, width: number, height: number): Uint8ClampedArray {
        const output: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4);
        const rawColor: number[] = [];
        let rawLookup: number;
        const color: number[][] = [];

        const bytesPerBlock = 8;
        const blockCount = view.getRemainingSize() / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            rawColor[0] = view.readUInt16(true);
            rawColor[1] = view.readUInt16(true);
            rawLookup = view.readUInt32(true);

            for (let j = 0; j < 2; ++j) {
                color[j] = this.unpackColor(rawColor[j]);
            }
            color[2] = [];
            color[3] = [];

            for (let j = 0; j < 4; ++j) {
                if (rawColor[0] > rawColor[1]) {
                    color[2][j] = ~~((2 * color[0][j] + color[1][j]) / 3);
                    color[3][j] = ~~((color[0][j] + 2 * color[1][j]) / 3);
                } else {
                    color[2][j] = ~~((color[0][j] + color[1][j]) / 2);
                    color[3][j] = 0;
                }
            }

            const lookup = this.unpackLookup(rawLookup);
            const x = (blockIndex * BLOCK_WIDTH) % width;
            const y = ~~((blockIndex * BLOCK_WIDTH) / width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    const colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        const outputIndex = ((y + by) * width + x + bx) * COLOR_CANNELS + c;
                        output[outputIndex] = color[colorIndex][c];
                    }
                }
            }
        }

        return output;
    }

    // 128 bit contain 16 pixels
    // 64 bit alpha (4 per pixel)
    // 2x 16-bit RGB 5:6:5 color
    // 4x4 2-bit lookup table
    decompressDXT3(view: BufferReader, width: number, height: number): Uint8ClampedArray {
        const output: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4);
        const rawColor: number[] = [];
        let rawLookup: number;
        const color: number[][] = [];
        const alpha: number[] = [];

        const bytesPerBlock = 16;
        const blockCount = view.getRemainingSize() / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            for (let i = 0; i < 8; ++i) {
                const rawAlpha = view.readUInt8();
                const alpha1 = rawAlpha & 0x0f;
                const alpha2 = rawAlpha & 0xf0;
                alpha[i * 2 + 0] = alpha1 | (alpha1 << 4);
                alpha[i * 2 + 1] = alpha2 | (alpha2 >> 4);
            }
            rawColor[0] = view.readUInt16(true);
            rawColor[1] = view.readUInt16(true);
            rawLookup = view.readUInt32(true);

            for (let j = 0; j < 2; ++j) {
                color[j] = this.unpackColor(rawColor[j]);
            }
            color[2] = [];
            color[3] = [];

            for (let j = 0; j < 4; ++j) {
                color[2][j] = ~~((2 * color[0][j] + color[1][j]) / 3);
                color[3][j] = ~~((color[0][j] + 2 * color[1][j]) / 3);
            }

            const lookup = this.unpackLookup(rawLookup);
            const x = (blockIndex * BLOCK_WIDTH) % width;
            const y = ~~((blockIndex * BLOCK_WIDTH) / width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    const colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        const outputIndex = ((y + by) * width + x + bx) * COLOR_CANNELS + c;
                        if (c === 3) {
                            output[outputIndex] = alpha[by * BLOCK_WIDTH + bx];
                        } else {
                            output[outputIndex] = color[colorIndex][c];
                        }
                    }
                }
            }
        }
        return output;
    }

    // 128 bit contain 16 pixels
    // 2x 8-bit alpha value
    // 4x4 3-bit lookup
    // 2x 16-bit RGB 5:6:5 color
    // 4x4 2-bit lookup table
    decompressDXT5(view: BufferReader, width: number, height: number): Uint8ClampedArray {
        const output: Uint8ClampedArray = new Uint8ClampedArray(width * height * 4);
        const rawColor: number[] = [];
        let rawLookup: number;
        const color: number[][] = [];
        const alpha: number[] = [];

        const bytesPerBlock = 16;
        const blockCount = view.getRemainingSize() / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            alpha[0] = view.readUInt8();
            alpha[1] = view.readUInt8();

            if (alpha[0] > alpha[1]) {
                for (let i = 0; i < 6; ++i) {
                    alpha[2 + i] = ~~(((6 - i) * alpha[0] + (1 + i) * alpha[1]) / 7);
                }
            } else {
                for (let i = 0; i < 4; ++i) {
                    alpha[2 + i] = ~~(((4 - i) * alpha[0] + (1 + i) * alpha[1]) / 5);
                }
                alpha[6] = 0;
                alpha[7] = ALPHA;
            }

            const alphaLookup = [];
            for (let i = 0; i < 2; ++i) {
                const rawAlphaLookup = view.readUint(3, true);
                for (let j = 0; j < 8; ++j) {
                    const index = (rawAlphaLookup >> (3 * j)) & 0x7;
                    alphaLookup[i * 8 + j] = index;
                }
            }

            rawColor[0] = view.readUInt16(true);
            rawColor[1] = view.readUInt16(true);
            rawLookup = view.readUInt32(true);

            for (let j = 0; j < 2; ++j) {
                color[j] = this.unpackColor(rawColor[j]);
            }
            color[2] = [];
            color[3] = [];

            for (let j = 0; j < 4; ++j) {
                color[2][j] = ~~((2 * color[0][j] + color[1][j]) / 3);
                color[3][j] = ~~((color[0][j] + 2 * color[1][j]) / 3);
            }

            const lookup = this.unpackLookup(rawLookup);
            const x = (blockIndex * BLOCK_WIDTH) % width;
            const y = ~~((blockIndex * BLOCK_WIDTH) / width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    const colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    const alphaIndex = alphaLookup[by * BLOCK_WIDTH + bx];

                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        const outputIndex = ((y + by) * width + x + bx) * COLOR_CANNELS + c;
                        if (c === 3) {
                            output[outputIndex] = alpha[alphaIndex];
                        } else {
                            output[outputIndex] = color[colorIndex][c];
                        }
                    }
                }
            }
        }
        return output;
    }

    unpackColor(value: number): number[] {
        const red = (value >> 11) & 0x1f;
        const green = (value >> 5) & 0x3f;
        const blue = value & 0x1f;
        return [
            (red << 3) | (red >> 2),
            (green << 2) | (green >> 4),
            (blue << 3) | (blue >> 2),
            ALPHA
        ];
    }

    unpackLookup(value: number): number[] {
        const lookup = [];
        for (let i = 0; i < 16; ++i) {
            lookup.push((value >> (i * 2)) & 0x3);
        }
        return lookup;
    }
}
