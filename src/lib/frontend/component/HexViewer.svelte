<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type BufferReader from '$lib/util/BufferReader';
    import VirtualList from 'svelte-virtual-list-ce';

    export let view: BufferReader;

    const DEFAULT_BYTES_PER_LINE = 24;
    let bytesPerLine = DEFAULT_BYTES_PER_LINE;

    function onBytesPerLineChange(e: CustomEvent) {
        bytesPerLine = parseInt(e.detail.value);
    }

    $: items = Array.from({ length: view.getSize() / bytesPerLine }, (_, i) => i * bytesPerLine);

    function getData(i: number) {
        view.setCursor(i);
        return view.read(bytesPerLine);
    }

    function toHexArray(data: Uint8Array): string[] {
        return Array.from(data, (byte) => byte.toString(16).padStart(2, '0'));
    }

    function toAsciiArray(data: Uint8Array): string[] {
        return Array.from(data, (byte) =>
            byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'
        );
    }
</script>

<div class="viewer">
    <div class="toolbar">
        <ion-input
            label="Bytes per line:"
            type="number"
            min="1"
            value={bytesPerLine}
            on:ionChange={onBytesPerLineChange}
        />
    </div>

    <div class="header">
        <div class="label">Offset (h)</div>
        <div class="hex">
            {#each Array.from({ length: bytesPerLine }, (_, i) => i) as i}
                <span>{i.toString(16).toUpperCase().padStart(2, '0')}{' '}</span>
            {/each}
        </div>
        <div class="text">Decoded text</div>
    </div>

    <div class="content">
        <VirtualList {items} itemHeight={20} let:item>
            {@const data = getData(item)}
            <div class="entry">
                <div class="offset">{item.toString(16).toUpperCase().padStart(8, '0')}</div>

                <div class="hex">
                    {#each toHexArray(data) as byte}
                        <span>{byte}{' '}</span>
                    {/each}
                </div>
                <div class="text">
                    {#each toAsciiArray(data) as byte}
                        {byte}
                    {/each}
                </div>
            </div>
        </VirtualList>
    </div>
</div>

<style>
    .viewer {
        font-family: monospace;
        overflow: auto;
        height: 100%;
        color: var(--ion-color-medium-tint);
        padding-left: 10px;
    }

    .toolbar {
        display: flex;
        gap: 10px;
        height: 30px;
    }

    .toolbar ion-input {
        min-height: 30px;
    }

    .header {
        display: flex;
        gap: 10px;
        color: var(--ion-color-tertiary);
        white-space: nowrap;
    }

    .content {
        overflow: auto;
        height: calc(100% - 65px);
    }

    .header > .label,
    .entry > .offset {
        text-align: center;
        flex: 0 0 80px;
        color: var(--ion-color-tertiary);
    }

    .entry {
        display: flex;
        flex-wrap: nowrap;
        gap: 10px;
        height: 20px;
    }

    .entry .hex {
        flex: 0 0 auto;
    }

    .entry .hex > span:nth-child(odd) {
        color: var(--ion-color-medium-shade);
    }

    .text {
        white-space: pre;
        margin-left: 10px;
    }
</style>
