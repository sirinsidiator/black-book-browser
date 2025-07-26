<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { toastController } from 'ionic-svelte';
    import { copyOutline } from 'ionicons/icons';
    import type { Snippet } from 'svelte';

    interface Props {
        icon: string;
        label: string;
        children?: Snippet;
    }

    let { icon, label, children }: Props = $props();

    let value: HTMLIonLabelElement | undefined = $state();

    async function copy() {
        try {
            if (!value) throw new Error('Value element is not defined');
            const text = value.innerText;
            await navigator.clipboard.writeText(text);
            const toast = await toastController.create({
                message: 'Copied to clipboard',
                duration: 2000,
                color: 'success',
                position: 'bottom'
            });
            await toast.present();
        } catch (err) {
            console.warn('Failed to copy', err);

            const toast = await toastController.create({
                message: 'Could not copy to clipboard',
                duration: 2000,
                color: 'danger',
                position: 'bottom'
            });
            await toast.present();
        }
    }
</script>

<ion-item>
    <ion-icon {icon}></ion-icon>
    <ion-label class="label">{label}</ion-label>
    <ion-label bind:this={value}>{@render children?.()}</ion-label>
    <ion-button fill="clear" color="medium" slot="end" size="small" onclick={copy}>
        <ion-icon slot="icon-only" icon={copyOutline}></ion-icon>
    </ion-button>
</ion-item>

<style>
    .label {
        margin-left: 15px;
        flex: 0 0 200px;
        font-weight: bold;
    }

    ion-item {
        --min-height: unset;
        height: 35px;
    }
</style>
