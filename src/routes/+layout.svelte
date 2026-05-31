<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import BackgroundService from '$lib/backend/BackgroundService';
    import MainMenu from '$lib/frontend/MainMenu.svelte';
    import type { Snippet } from 'svelte';

    import '$lib/util/ionic';
    import '../theme/variables.css';

    let { children }: { children?: Snippet } = $props();

    BackgroundService.initialize()
        .then(() => {
            console.log('BackgroundService initialized successfully');
        })
        .catch((error: unknown) => {
            console.error('Failed to initialize BackgroundService:', error);
        });
</script>

<ion-app>
    <MainMenu />
    <ion-content>
        {@render children?.()}
    </ion-content>
</ion-app>

<style>
    ion-app {
        scrollbar-color: var(--ion-color-medium) transparent;
        flex-direction: row;
        --main-menu-width: 70px;
    }

    ion-content {
        background-color: var(--ion-background-color);
        height: 100vh;
    }
</style>
