<!--
SPDX-FileCopyrightText: 2025 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later

adapted from https://gist.githubusercontent.com/Lure5134/38001e338c95c830fb4725330f4ef048/raw/dad4a7b38310c41ee3f6df0020f2f177f144e528/VirtualList.svelte 
-->

<script lang="ts" generics="T">
    import { onMount, tick, type Snippet } from 'svelte';

    const {
        items,
        height = '100%',
        itemHeight,
        children,
        getKey
    }: {
        items: T[] | readonly T[];
        height?: string;
        itemHeight?: number;
        children: Snippet<[T]>;
        getKey?: (item: T) => string | number;
    } = $props();

    // read-only, but visible to consumers via bind:start
    let start = $state(0);
    let end = $state(0);

    // local state
    let height_map: number[] = $state([]);
    let rows: HTMLCollectionOf<Element> | undefined = $state();
    let viewport: HTMLElement | undefined = $state();
    let contents: HTMLElement | undefined = $state();
    let viewport_height = $state(0);
    let mounted: boolean = $state(false);
    let resizeObserver: ResizeObserver | null = null;

    let top = $state(0);
    let bottom = $state(0);
    let average_height: number = $state(null as unknown as number);

    const visible: { id: number | string; data: T }[] = $derived(
        items.slice(start, end).map((data, i) => {
            return { id: getKey?.(data) ?? i + start, data };
        })
    );

    // whenever `items` changes, invalidate the current heightmap
    $effect(() => {
        if (mounted) {
            refresh(items, viewport_height, itemHeight).catch(console.error);
        }
    });

    async function refresh(
        items: T[] | readonly T[],
        viewport_height: number,
        itemHeight?: number
    ) {
        if (!viewport || !contents || !rows) return;
        const { scrollTop } = viewport;

        await tick(); // wait until the DOM is up to date

        let content_height = top - scrollTop;
        let i = start;

        while (content_height < viewport_height && i < items.length) {
            let row = rows[i - start];

            if (!(row instanceof Element)) {
                end = i + 1;
                await tick(); // render the newly visible row
                row = rows[i - start];
            }

            const row_height = (height_map[i] = itemHeight ?? (row as HTMLElement).offsetHeight);
            content_height += row_height;
            i += 1;
        }

        end = i;

        const remaining = items.length - end;
        average_height = (top + content_height) / end;

        if (end === 0) {
            average_height = 0;
        }

        bottom = remaining * average_height;
        height_map.length = items.length;

        const totalHeight = height_map.reduce((x, y) => x + y, 0);
        if (scrollTop + viewport_height > totalHeight) {
            // If we scroll outside the viewbox scroll to the top.
            viewport.scrollTo(0, totalHeight - viewport_height);
        }

        for (const row of rows) {
            resizeObserver?.observe(row);
        }
    }

    async function handle_scroll() {
        if (!viewport || !contents || !rows) return;
        const { scrollTop } = viewport;

        const old_start = start;

        for (let v = 0; v < rows.length; v += 1) {
            height_map[start + v] = itemHeight ?? (rows[v] as HTMLElement).offsetHeight;
        }

        let i = 0;
        let y = 0;

        while (i < items.length) {
            const row_height = height_map[i] || average_height;
            if (y + row_height > scrollTop) {
                start = i;
                top = y;

                break;
            }

            y += row_height;
            i += 1;
        }

        while (i < items.length) {
            y += height_map[i] || average_height;
            i += 1;

            if (y > scrollTop + viewport_height) break;
        }

        end = i;

        const remaining = items.length - end;
        average_height = y / end;

        while (i < items.length) height_map[i++] = average_height;
        bottom = remaining * average_height;

        // prevent jumping if we scrolled up into unknown territory
        if (start < old_start) {
            await tick();

            let expected_height = 0;
            let actual_height = 0;

            for (let i = start; i < old_start; i += 1) {
                if (rows[i - start] instanceof HTMLElement) {
                    expected_height += height_map[i];
                    actual_height += itemHeight ?? (rows[i - start] as HTMLElement).offsetHeight;
                }
            }

            const d = actual_height - expected_height;
            viewport.scrollTo(0, scrollTop + d);
        }

        const totalHeight = height_map.reduce((x, y) => x + y, 0);
        if (scrollTop + viewport_height > totalHeight) {
            // If we scroll outside the viewbox scroll to the top.
            viewport.scrollTo(0, totalHeight - viewport_height);
        }
    }

    function handleHeightChange() {
        refresh(items, viewport_height, itemHeight).catch(console.error);
    }

    export function scrollToIndex(index: number) {
        if (!viewport || index < 0 || index >= items.length) return;

        const offset = Math.floor((end - start) / 2);
        const targetIndex = index - offset;

        if (targetIndex < start || targetIndex >= end) {
            start = Math.max(0, targetIndex);
            end = Math.min(items.length, targetIndex + (end - start));
            handle_scroll().catch(console.error);
        }

        viewport.scrollTo(0, top + height_map[targetIndex]);
    }

    // trigger initial refresh
    onMount(() => {
        if (!viewport || !contents) throw new Error('VirtualList not mounted properly');
        rows = contents.getElementsByTagName('svelte-virtual-list-row');
        resizeObserver = new ResizeObserver(handleHeightChange);
        mounted = true;
    });
</script>

<svelte-virtual-list-viewport
    bind:this={viewport}
    bind:offsetHeight={viewport_height}
    onscroll={handle_scroll}
    style="height: {height};"
>
    <svelte-virtual-list-contents
        bind:this={contents}
        style="padding-top: {top}px; padding-bottom: {bottom}px;"
    >
        {#each visible as row (row.id)}
            <svelte-virtual-list-row>
                {@render children(row.data)}
            </svelte-virtual-list-row>
        {/each}
    </svelte-virtual-list-contents>
</svelte-virtual-list-viewport>

<style>
    svelte-virtual-list-viewport {
        position: relative;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        display: block;
    }

    svelte-virtual-list-contents,
    svelte-virtual-list-row {
        display: block;
    }

    svelte-virtual-list-row {
        overflow: hidden;
    }
</style>
