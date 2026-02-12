<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import ContentPreview from '$lib/frontend/preview/ContentPreview.svelte';
    import type { ContentPreviewLoader } from '$lib/frontend/preview/loader/ContentPreviewLoader';
    import type { Snippet } from 'svelte';

    interface Props {
        preview?: Promise<ContentPreviewLoader> | undefined;
        buttons?: Snippet;
        details?: Snippet;
    }

    let { preview, buttons, details }: Props = $props();
</script>

<div class="container">
    <div class="buttons">
        {@render buttons?.()}
    </div>

    <ion-list class="details">
        {@render details?.()}
    </ion-list>

    {#if preview}
        <div class="preview">
            <ContentPreview {preview} />
        </div>
    {/if}
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: calc(100vh - 56px - 13px);
    }

    .buttons,
    .details {
        flex-shrink: 0;
    }

    .preview {
        flex-grow: 1;
        margin: 15px 10px;
        overflow: auto;
        background: var(--ion-background-color);
    }
</style>
