<script lang="ts">
    export let icon: string;
    export let label: string;
</script>

<ion-item>
    <ion-icon {icon} />
    <ion-label class="label">{label}</ion-label>
    <ion-label><slot /></ion-label>
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
