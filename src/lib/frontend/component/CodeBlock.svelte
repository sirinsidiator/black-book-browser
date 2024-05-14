<script lang="ts">
    import 'highlight.js/styles/base16/classic-dark.css';

    export let language: string;
</script>

<pre><code class="hljs language-{language}"><slot /></code></pre>

<style>
    pre,
    code {
        overflow: unset !important;
        height: 100%;
    }

    pre {
        margin: 0;
    }

    code {
        width: fit-content;
        min-width: 100%;
    }
</style>
