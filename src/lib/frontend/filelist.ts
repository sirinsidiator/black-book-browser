CodeMirror.defineMode("filelist", function () {
    return {
        token: function (stream, state) {
            let ch = stream.next();
            if (ch === "/") {
                return "operator";
            } else if (ch === ".") {
                return "variable-4";
            } else if (stream.match(/.*?\//)) {
                stream.backUp(1);
                return "variable-2";
            } else if (stream.match(/.*?\./)) {
                stream.backUp(1);
                return "variable";
            }
            return "variable-4";
        },
    };
});