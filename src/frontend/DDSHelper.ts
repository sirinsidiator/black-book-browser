/// <reference path="../../node_modules/three/src/Three.d.ts" />
declare module THREE {
    export let DDSLoader: any;
    export const RGB_S3TC_DXT1_Format: number;
    export const RGBA_S3TC_DXT3_Format: number;
    export const RGBA_S3TC_DXT5_Format: number;
    export const RGB_ETC1_Format: number;
    export const RGBAFormat: number;
}

const ALPHA = 0xFF;
const BLOCK_HEIGHT = 4;
const BLOCK_WIDTH = 4;
const COLOR_CANNELS = 4;

export default class DDSHelper {

    loader: any;

    constructor() {
        this.loader = new THREE.DDSLoader();
    }

    createImage(data: Buffer): HTMLCanvasElement {
        // need to convert from the node.js Buffer to a ArrayBuffer
        let buffer = new ArrayBuffer(data.byteLength);
        let view = new Uint8Array(buffer);
        data.forEach((value, index) => view[index] = value);

        let texture = null;
        try {
            texture = this.loader.parse(buffer, false);
        } catch (err) {
            console.warn('Could not parse file', err);
            return null;
        }

        if (!texture || !texture.format || texture.mipmaps.length === 0) {
            console.warn('Invalid texture', texture);
            return null;
        }

        let canvas = document.createElement('canvas');
        canvas.width = texture.width;
        canvas.height = texture.height;

        let context = canvas.getContext('2d');
        let imageData = this.decompress(texture);
        context.putImageData(imageData, 0, 0);

        return canvas;
    }

    decompress(texture: any): ImageData {
        let mipmap = texture.mipmaps[0];
        let size = mipmap.width * mipmap.height * 4;
        let compressed: Uint8Array = mipmap.data;
        let data = new Uint8ClampedArray(size);

        switch (texture.format) {
            case THREE.RGB_S3TC_DXT1_Format:
                this.decompressDXT1(mipmap, data);
                break;
            case THREE.RGBA_S3TC_DXT3_Format:
                this.decompressDXT3(mipmap, data);
                break;
            case THREE.RGBA_S3TC_DXT5_Format:
                this.decompressDXT5(mipmap, data);
                break;
            case THREE.RGB_ETC1_Format:
                console.warn('RGB_ETC1_Format is not supported');
                break;
            case THREE.RGBAFormat:
                compressed.forEach((value, i) => {
                    data[i] = value;
                });
                break;
            default:
                console.warn('Unsupported DDS format', texture);
        }
        return new ImageData(data, mipmap.width, mipmap.height);
    }

    decompressDXT1(mipmap: any, output: Uint8ClampedArray) {
        // 64 bit contain 16 pixels
        // 2x 16-bit RGB 5:6:5 color
        // 4x4 2-bit lookup table
        let view = new Buffer(mipmap.data);
        let rawColor: number[] = [];
        let rawLookup: number;
        let color: number[][] = [];

        let bytesPerBlock = 8;
        let blockCount = view.byteLength / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            let offset = blockIndex * bytesPerBlock;
            rawColor[0] = view.readUInt16LE(offset + 0);
            rawColor[1] = view.readUInt16LE(offset + 2);
            rawLookup = view.readUInt32LE(offset + 4);

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

            let lookup = this.unpackLookup(rawLookup);
            let x = blockIndex * BLOCK_WIDTH % mipmap.width;
            let y = ~~(blockIndex * BLOCK_WIDTH / mipmap.width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    let colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        let outputIndex = ((y + by) * mipmap.width + x + bx) * COLOR_CANNELS + c;
                        output[outputIndex] = color[colorIndex][c];
                    }
                }
            }
        }
    }

    decompressDXT3(mipmap: any, output: Uint8ClampedArray) {
        // 128 bit contain 16 pixels
        // 64 bit alpha (4 per pixel)
        // 2x 16-bit RGB 5:6:5 color
        // 4x4 2-bit lookup table
        let view = new Buffer(mipmap.data);
        let rawColor: number[] = [];
        let rawLookup: number;
        let color: number[][] = [];
        let alpha: number[] = [];

        let bytesPerBlock = 16;
        let blockCount = view.byteLength / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            let offset = blockIndex * bytesPerBlock;
            for (let i = 0; i < 8; ++i) {
                let rawAlpha = view.readUInt8(offset + i);
                let alpha1 = rawAlpha & 0x0F;
                let alpha2 = rawAlpha & 0xF0;
                alpha[i * 2 + 0] = alpha1 | (alpha1 << 4);
                alpha[i * 2 + 1] = alpha2 | (alpha2 >> 4);
            }
            rawColor[0] = view.readUInt16LE(offset + 8);
            rawColor[1] = view.readUInt16LE(offset + 10);
            rawLookup = view.readUInt32LE(offset + 12);

            for (let j = 0; j < 2; ++j) {
                color[j] = this.unpackColor(rawColor[j]);
            }
            color[2] = [];
            color[3] = [];

            for (let j = 0; j < 4; ++j) {
                color[2][j] = ~~((2 * color[0][j] + color[1][j]) / 3);
                color[3][j] = ~~((color[0][j] + 2 * color[1][j]) / 3);
            }

            let lookup = this.unpackLookup(rawLookup);
            let x = blockIndex * BLOCK_WIDTH % mipmap.width;
            let y = ~~(blockIndex * BLOCK_WIDTH / mipmap.width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    let colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        let outputIndex = ((y + by) * mipmap.width + x + bx) * COLOR_CANNELS + c;
                        if (c === 3) {
                            output[outputIndex] = alpha[by * BLOCK_WIDTH + bx];
                        } else {
                            output[outputIndex] = color[colorIndex][c];
                        }
                    }
                }
            }
        }
    }

    decompressDXT5(mipmap: any, output: Uint8ClampedArray) {
        // 128 bit contain 16 pixels
        // 2x 8-bit alpha value
        // 4x4 3-bit lookup
        // 2x 16-bit RGB 5:6:5 color
        // 4x4 2-bit lookup table
        let view = new Buffer(mipmap.data);
        let rawColor: number[] = [];
        let rawLookup: number;
        let color: number[][] = [];
        let alpha: number[] = [];

        let bytesPerBlock = 16;
        let blockCount = view.byteLength / bytesPerBlock;

        for (let blockIndex = 0; blockIndex < blockCount; ++blockIndex) {
            let offset = blockIndex * bytesPerBlock;

            alpha[0] = view.readUInt8(offset + 0);
            alpha[1] = view.readUInt8(offset + 1);

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

            let alphaLookup = [];
            for (let i = 0; i < 2; ++i) {
                let rawAlphaLookup = view.readUIntLE(offset + 2 + (i * 3), 3);
                for (let j = 0; j < 8; ++j) {
                    let index = (rawAlphaLookup >> 3 * j) & 0x7;
                    alphaLookup[i * 8 + j] = index;
                }
            }

            rawColor[0] = view.readUInt16LE(offset + 8);
            rawColor[1] = view.readUInt16LE(offset + 10);
            rawLookup = view.readUInt32LE(offset + 12);

            for (let j = 0; j < 2; ++j) {
                color[j] = this.unpackColor(rawColor[j]);
            }
            color[2] = [];
            color[3] = [];

            for (let j = 0; j < 4; ++j) {
                color[2][j] = ~~((2 * color[0][j] + color[1][j]) / 3);
                color[3][j] = ~~((color[0][j] + 2 * color[1][j]) / 3);
            }

            let lookup = this.unpackLookup(rawLookup);
            let x = blockIndex * BLOCK_WIDTH % mipmap.width;
            let y = ~~(blockIndex * BLOCK_WIDTH / mipmap.width) * BLOCK_HEIGHT;
            for (let by = 0; by < BLOCK_HEIGHT; ++by) {
                for (let bx = 0; bx < BLOCK_WIDTH; ++bx) {
                    let colorIndex = lookup[by * BLOCK_WIDTH + bx];
                    let alphaIndex = alphaLookup[by * BLOCK_WIDTH + bx];

                    for (let c = 0; c < COLOR_CANNELS; ++c) {
                        let outputIndex = ((y + by) * mipmap.width + x + bx) * COLOR_CANNELS + c;
                        if (c === 3) {
                            output[outputIndex] = alpha[alphaIndex];
                        } else {
                            output[outputIndex] = color[colorIndex][c];
                        }
                    }
                }
            }
        }
    }

    unpackColor(value: number): number[] {
        let red = (value >> 11) & 0x1F;
        let green = (value >> 5) & 0x3F;
        let blue = value & 0x1F;
        return [
            (red << 3) | (red >> 2),
            (green << 2) | (green >> 4),
            (blue << 3) | (blue >> 2),
            ALPHA,
        ];
    }

    unpackLookup(value: number): number[] {
        let lookup = [];
        for (let i = 0; i < 16; ++i) {
            lookup.push((value >> i * 2) & 0x3);
        }
        return lookup;
    }

}
