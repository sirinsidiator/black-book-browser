<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import patreonIcon from '$lib/assets/patreon.svg';
    import patrons from '$lib/assets/patrons.json';
    import { open } from '@tauri-apps/plugin-shell';
    import { onMount } from 'svelte';

    const PATREON_LINK = 'https://www.patreon.com/bePatron?u=18954089';

    // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    function shuffleArray(array: unknown[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    onMount(() => shuffleArray(patrons));
</script>

<ion-card>
    <ion-card-header>
        <ion-card-title color="dark">Patrons</ion-card-title>
    </ion-card-header>
    <ion-card-content>
        {#if !patrons}
            <p class="loading"><ion-spinner /> Loading...</p>
        {:else}
            <div class="patron-list">
                {#each patrons as patron}
                    <ion-label color="dark" class="emph{patron.tier}">{patron.name}</ion-label>
                {/each}
            </div>
            <ion-label class="thanks" color="dark">Thank you for your continued support</ion-label>
        {/if}
        <!-- eslint-disable-next-line svelte/valid-compile -->
        <ion-button
            id="becomePatron"
            fill="outline"
            color="primary"
            size="large"
            on:click={() => open(PATREON_LINK)}
            ><ion-icon icon={patreonIcon}></ion-icon> Become a Patron</ion-button
        >
    </ion-card-content>
</ion-card>

<style>
    ion-card {
        text-align: center;
        height: 100vh;
        margin: 0;
        overflow-y: auto;
    }

    ion-card-title {
        font-size: 2em;
        font-weight: bold;
        padding: 20px;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin: 20px;
    }

    .patron-list {
        display: flex;
        justify-content: center;
        flex-wrap: wrap;
        gap: 5px;
        max-height: calc(100vh - 255px);
        overflow-y: auto;
        margin-bottom: 20px;
    }

    .patron-list ion-label {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 10px;
    }

    .emph0 {
        font-size: 1.2em;
    }

    .emph1 {
        font-size: 2em;
    }

    .emph2 {
        font-size: 2.8em;
    }

    .thanks {
        font-size: 1.2em;
        margin: 20px;
        display: block;
    }

    ion-icon {
        margin-right: 10px;
    }
</style>
