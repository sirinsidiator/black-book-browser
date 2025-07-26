<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { downloadOutline } from 'ionicons/icons';
    import type { ContentPreviewLoader } from './loader/ContentPreviewLoader';

    interface Props {
        preview: Promise<ContentPreviewLoader>;
        options?: unknown[];
        children?: import('svelte').Snippet;
    }

    let { preview, options = [], children }: Props = $props();

    let disabled = $state(true);

    async function save() {
        (await preview).save(...options);
    }

    async function refresh(preview: Promise<ContentPreviewLoader>) {
        disabled = true;
        disabled = !(await preview).canSave;
    }

    $effect(() => {
        refresh(preview).catch(console.error);
    });
</script>

<ion-button color="primary" {disabled} onclick={save}>
    <ion-icon slot="start" icon={downloadOutline}></ion-icon>
    {@render children?.()}
</ion-button>
