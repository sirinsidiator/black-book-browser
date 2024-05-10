<script lang="ts">
    
    export let loading = false;
    export let hasPreview = false;
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
                <div class="fill loading">loading...</div>
                <ion-progress-bar type="indeterminate" />
            {:else if hasPreview}
                <slot name="preview"></slot>
            {:else}
                <div class="fill">no preview available</div>
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
    }

    .fill.loading {
        height: calc(100% - 4px);
    }
</style>
