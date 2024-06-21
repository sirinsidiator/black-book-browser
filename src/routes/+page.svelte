<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import FileBrowser from '$lib/FileBrowser.svelte';
    import ContentViewer from '$lib/content/ContentViewer.svelte';
    import { createGesture, type Gesture } from '@ionic/core';
    import { onDestroy, onMount } from 'svelte';
    import type { PageData } from './$types';

    export let data: PageData;

    let splitPane: HTMLIonSplitPaneElement;
    let divider: HTMLDivElement;
    let gesture: Gesture | undefined = undefined;
    onMount(() => {
        const sideWidth = localStorage.getItem('side-width');
        if (sideWidth) {
            splitPane.style.setProperty(
                '--side-width',
                `calc(${sideWidth}px - var(--main-menu-width))`
            );
        }

        gesture = createGesture({
            gestureName: 'resize-menu',
            el: divider,
            onMove: (e) => {
                splitPane.style.setProperty(
                    '--side-width',
                    `calc(${e.currentX}px - var(--main-menu-width))`
                );
                localStorage.setItem('side-width', e.currentX.toString());
            }
        });

        gesture.enable(true);
    });

    onDestroy(() => {
        gesture?.destroy();
    });
</script>

<ion-split-pane bind:this={splitPane} when="xs" content-id="main">
    <ion-menu content-id="main">
        <FileBrowser manager={data.stateManager} />
        <div class="divider" bind:this={divider} />
    </ion-menu>

    <div id="main">
        <ContentViewer manager={data.stateManager} />
    </div>
</ion-split-pane>

<style>
    ion-split-pane {
        --side-min-width: 10vw;
        --side-max-width: 90vw;
        --side-width: 30vw;
    }

    .divider {
        height: 100%;
        width: 5px;

        position: absolute;
        right: 0;
        top: 0;
        bottom: 0;

        z-index: 10;

        cursor: col-resize;
        background-color: var(--ion-color-light);
    }
</style>
