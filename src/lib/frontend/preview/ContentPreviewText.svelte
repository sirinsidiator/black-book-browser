<script lang="ts">
    export let icon: string | undefined = undefined;
    export let loading = false;
    export let warning = false;
</script>

<div class:loading class:warning>
    {#if loading}<ion-spinner name="dots" />{:else if icon}<ion-icon {icon} />{/if}<ion-label
        color={warning ? 'warning' : undefined}><slot /></ion-label
    >
</div>
{#if loading}<ion-progress-bar type="indeterminate" />{/if}

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
