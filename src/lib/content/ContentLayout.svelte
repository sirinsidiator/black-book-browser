<script lang="ts">
    import { informationCircleOutline, warningOutline } from 'ionicons/icons';

    export let loading = false;
    export let hasPreview = false;
    export let hasPreviewFailed = false;
</script>

<div class="container">
    <div class="buttons">
        <slot name="buttons"></slot>
    </div>

    <ion-list class="details">
        <slot name="details"></slot>
    </ion-list>

    {#if $$slots.preview}
        <div class="preview">
            {#if loading}
                <div class="fill loading">
                    <ion-spinner name="dots" /><ion-label>loading...</ion-label>
                </div>
                <ion-progress-bar type="indeterminate" />
            {:else if hasPreview}
                <slot name="preview"></slot>
            {:else if hasPreviewFailed}
                <div class="fill warning">
                    <ion-icon icon={warningOutline} /><ion-label color="warning"
                        >failed to load preview</ion-label
                    >
                </div>
            {:else}
                <div class="fill info">
                    <ion-icon icon={informationCircleOutline} /><ion-label
                        >no preview available</ion-label
                    >
                </div>
            {/if}
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

    .fill {
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        gap: 5px;
    }

    .fill.loading {
        height: calc(100% - 4px);
    }

    .fill ion-icon {
        font-size: 1.5em;
    }

    .fill.warning ion-icon {
        color: var(--ion-color-warning);
    }
</style>
