<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { redirectKeydown } from '$lib/utils/common';
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

<!-- svelte-ignore a11y_interactive_supports_focus -->
<ion-button
    color="primary"
    {disabled}
    role="button"
    onclick={save}
    onkeydown={redirectKeydown(save)}
>
    <ion-icon slot="start" icon={downloadOutline}></ion-icon>
    {@render children?.()}
</ion-button>
