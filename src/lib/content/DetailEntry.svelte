<!--
SPDX-FileCopyrightText: 2024 sirinsidiator

SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts">
    import { toastController } from 'ionic-svelte';
    import { copyOutline } from 'ionicons/icons';

    export let icon: string;
    export let label: string;

    let value: HTMLIonLabelElement;

    async function copy() {
        try {
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
    <ion-icon {icon} />
    <ion-label class="label">{label}</ion-label>
    <ion-label bind:this={value}><slot /></ion-label>
    <!-- eslint-disable-next-line svelte/valid-compile -->
    <ion-button fill="clear" color="medium" slot="end" size="small" on:click={copy}>
        <ion-icon slot="icon-only" icon={copyOutline} />
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
