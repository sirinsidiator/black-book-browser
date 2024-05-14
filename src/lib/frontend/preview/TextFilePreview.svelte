<script lang="ts">
    import CodeBlock from '../component/CodeBlock.svelte';
    import type TextFilePreviewLoader from './loader/TextFilePreviewLoader';

    export let loader: TextFilePreviewLoader;
</script>

<!-- eslint-disable svelte/no-at-html-tags -->
<CodeBlock language={loader.language}>{@html loader.getText()}</CodeBlock>
