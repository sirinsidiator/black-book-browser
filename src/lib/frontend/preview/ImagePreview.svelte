<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type ImageFilePreviewLoader from './loader/ImageFilePreviewLoader';

    interface Props {
        loader: ImageFilePreviewLoader;
    }

    let { loader }: Props = $props();
</script>

<div class="image-viewer">
    <img src={loader.getDataUrl()} alt="content" />
</div>

<style>
    .image-viewer {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        padding: 10px;
        background: var(--ion-background-color-step-100);
    }

    .image-viewer img {
        max-width: 100%;
        max-height: 100%;
        box-shadow: 0 0 10px 0 rgba(0, 0, 0, 0.5);
    }
</style>
