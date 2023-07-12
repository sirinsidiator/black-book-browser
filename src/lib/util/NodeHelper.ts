// expose the node modules as amd modules so we can just use import statements elsewhere
(function () {
    function convert(name: string) {
        (window as any).define(name, () => {
            return window.require(name);
        });
    }
    ['fs', 'path', 'zlib', 'node-ooz', 'child_process', 'os'].forEach(convert);
})();