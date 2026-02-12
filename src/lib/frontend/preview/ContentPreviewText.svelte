<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        icon?: string | undefined;
        loading?: boolean;
        warning?: boolean;
        children?: Snippet;
    }

    let { icon, loading = false, warning = false, children }: Props = $props();
</script>

<div class:loading class:warning>
    {#if loading}<ion-spinner name="dots"></ion-spinner>{:else if icon}<ion-icon {icon}
        ></ion-icon>{/if}<ion-label color={warning ? 'warning' : undefined}
        >{@render children?.()}</ion-label
    >
</div>
{#if loading}<ion-progress-bar type="indeterminate"></ion-progress-bar>{/if}

<style>
    div {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        gap: 5px;
    }

    .loading {
        height: calc(100% - 4px);
    }

    ion-icon {
        font-size: 1.5em;
    }

    .warning ion-icon {
        color: var(--ion-color-warning);
    }
</style>
