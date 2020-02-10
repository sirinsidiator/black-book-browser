module.exports = function (grunt) {

    const buildinfo = "buildinfo.json";
    grunt.registerTask("setup", "Configures default config", function () {
        let data;
        if (grunt.file.exists(buildinfo)) {
            data = grunt.file.readJSON(buildinfo);
        }
        if (!data) {
            data = {};
        }

        data.major = data.major || 0;
        data.minor = data.minor || 0;
        data.patch = data.patch || 0;
        data.build = data.build || 0;

        data.build++;

        grunt.file.write(buildinfo, JSON.stringify(data, null, 2));

        let versionParts = [];
        let buildVersion = grunt.option("build-version");
        if (buildVersion) {
            let [major, minor, patch] = buildVersion.split(".");
            versionParts.push(parseInt(major));
            versionParts.push(parseInt(minor));
            versionParts.push(parseInt(patch));
        } else {
            versionParts.push(data.major);
            versionParts.push(data.minor);
            versionParts.push(data.patch);
        }

        grunt.config.set("version", versionParts.join("."));
        versionParts.push(data.build);
        grunt.config.set("fullVersion", versionParts.join("."));

        if (!grunt.config.get("flavor")) {
            grunt.config.set("flavor", "debug");
        }
    });

    grunt.registerTask("setup-release", "Configures build for release", function () {
        grunt.config.set("flavor", "release");
    });

    grunt.registerTask("increment-version", "Increments version for next release", function () {
        let data = grunt.file.readJSON(buildinfo);
        if (grunt.option("major")) {
            data.major++;
            data.minor = 0;
            data.patch = 0;
        } else if (grunt.option("minor")) {
            data.minor++;
            data.patch = 0;
        } else {
            data.patch++;
        }
        grunt.file.write(buildinfo, JSON.stringify(data, null, 2));
    });

    grunt.registerTask("set-version", "Applies the version to the output", function () {
        const file = "temp/" + grunt.config.get("flavor") + "/package.json";
        if (!grunt.file.exists(file)) {
            grunt.log.error("package.json " + file + " does not exist");
            return true;
        }

        let data = grunt.file.readJSON(file);
        data.version = grunt.config.get("fullVersion");
        grunt.file.write(file, JSON.stringify(data, null, 2));
    });

    grunt.registerTask("prepare-nwjc", "Lets nw-builder download the latest node sdk", function () {
        let done = this.async();
        let msg = "Preparing nwjc...";
        grunt.verbose.write(msg);
        const NwBuilder = require("nw-builder");
        const nwb = new NwBuilder({
            platforms: ["win64"],
            files: []
        });
        nwb.resolveLatestVersion()
            .then(nwb.checkVersion.bind(nwb))
            .then(nwb.platformFilesForVersion.bind(nwb))
            .then(nwb.downloadNwjs.bind(nwb))
            .then(() => {
                let nwDir = nwb._platforms["win64"].cache;
                let nwjc = require("path").resolve(nwDir, "nwjc.exe");
                grunt.config.set("nwjc", nwjc);
            })
            .then(() => {
                grunt.verbose.ok();
                done();
            }, e => {
                grunt.verbose.or.write(msg).error().error(e.message);
                done(false);
            });
    });

    grunt.registerTask("nwbuild", "Lets nw-builder build the output", function () {
        let done = this.async();
        let msg = "Building with nw-builder...";
        grunt.verbose.write(msg);

        let version = grunt.config.get("version");
        let fullVersion = grunt.config.get("fullVersion");
        let year = (new Date()).getFullYear();

        const NwBuilder = require("nw-builder");
        const nwb = new NwBuilder({
            files: ["./temp/release/**"],
            flavor: "normal",
            platforms: ["win64"],
            buildDir: "./temp",
            zip: false,
            winIco: "./resources/images/icon.ico",
            winVersionString: {
                "CompanyName": "sirinsidiator",
                "FileDescription": "Black Book Browser - ESO Game Archive Viewer",
                "ProductName": "Black Book Browser",
                "FileVersion": fullVersion,
                "ProductVersion": version,
                "LegalCopyright": "Copyright (C) " + year + " sirinsidiator",
                "OriginalFilename": "bbb.exe"
            }
        });
        nwb.build().then(() => {
            grunt.verbose.ok();
            done();
        }, e => {
            grunt.verbose.or.write(msg).error().error(e.message);
            done(false);
        });
    });

    grunt.registerTask("compress", "Create an archive with 7zip", function () {
        let done = this.async();
        let msg = "Compressing with node7z...";
        grunt.verbose.write(msg);

        let version = grunt.config.get("version");
        let fileName = "bbb-" + version + ".zip";

        const zipBin = require("7zip-bin");
        const zip = require("node-7z");

        process.chdir("temp/bbb/win64/");
        const stream = zip.add("../../../target/" + fileName, "*", {
            $bin: zipBin.path7za,
            $progress: true,
            recursive: true,
            method: ["m=LZMA", "x=9",]
        });
        process.chdir("../../../");

        let lastPercentage = 0;
        let hadProgress = false;
        stream.on("progress", function (progress) {
            hadProgress = true;
            if (progress.percent - lastPercentage > 9) {
                lastPercentage = progress.percent;
                grunt.verbose.or.write(".");
                grunt.verbose.writeln(progress.fileCount + " files (" + progress.percent + "%)");
            }
        });
        stream.on("end", function () {
            if (hadProgress) {
                grunt.verbose.ok();
                done();
            } else {
                grunt.verbose.or.write(msg).error().error("Stream ended without progress");
                done(false);
            }
        });
        stream.on("error", function (e) {
            grunt.verbose.or.write(msg).error().error(e.message);
            done(false);
        });
    });

    grunt.initConfig({
        shell: {
            tsc: {
                command: "tsc --outfile temp/<%=flavor%>/esoextract.js"
            },
            nwjc: {
                command: "<%=nwjc%> --nw-module temp/esoextract.js dist/esoextract.bin"
            },
        },
        copy: {
            main: {
                files: [
                    { // our files
                        expand: true,
                        cwd: "resources",
                        src: "**",
                        dest: "temp/<%=flavor%>/",
                    },
                    { // npm library js
                        expand: true,
                        flatten: true,
                        cwd: "./node_modules/",
                        src: [
                            "jquery/dist/jquery.js",
                            "jstree/dist/jstree.js",
                            "three/build/three.js",
                            "three/examples/js/loaders/DDSLoader.js",
                            "codemirror/lib/codemirror.js",
                            "codemirror/mode/clike/clike.js",
                            "codemirror/mode/lua/lua.js",
                            "codemirror/mode/xml/xml.js",
                            "codemirror/mode/properties/properties.js",
                            "requirejs/require.js"
                        ],
                        dest: "temp/<%=flavor%>/lib",
                    },
                    { // other library js
                        expand: true,
                        flatten: true,
                        cwd: "./external/",
                        src: [
                            "jquery-ui/jquery-ui.js",
                        ],
                        dest: "temp/<%=flavor%>/lib",
                    },
                    { // jquery-ui style
                        expand: true,
                        cwd: "./external/jquery-ui/",
                        src: [
                            "jquery-ui.css",
                            "images/*"
                        ],
                        dest: "temp/<%=flavor%>/style/jquery-ui",
                    },
                    { // jstree style
                        expand: true,
                        flatten: true,
                        cwd: "./node_modules/jstree/dist/themes/default-dark/",
                        src: [
                            "style.min.css",
                            "*.gif",
                            "*.png"
                        ],
                        dest: "temp/<%=flavor%>/style/jstree",
                    },
                    { // codemirror style
                        expand: true,
                        flatten: true,
                        cwd: "./node_modules/codemirror/",
                        src: [
                            "lib/codemirror.css",
                            "theme/abcdef.css",
                        ],
                        dest: "temp/<%=flavor%>/style/codemirror",
                    },
                ]
            },
            release: {
                files: [
                    { // node-ooz
                        expand: true,
                        cwd: "./node_modules/node-ooz/",
                        src: [
                            "build/**/*.node",
                            "index.*",
                            "package.json"
                        ],
                        dest: "temp/release/node_modules/node-ooz",
                    },
                ]
            }
        },
        lineremover: {
            removeDebug: {
                files: {
                    "temp/release/app.html": "temp/release/app.html"
                },
                options: {
                    exclusionPattern: /data-debug-only="true"/g
                }
            }
        },
        watch: {
            files: [
                "gruntfile.js",
                "package.json",
                "common-tsconfig.json",
                "tsconfig.json",
                "src/**/*",
                "resources/**/*",
                "external/**/*"
            ],
            tasks: ["default"],
            options: {
                livereload: true
            }
        },
        clean: ["temp/"]
    });
    grunt.loadNpmTasks("grunt-contrib-copy");
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-shell");
    grunt.loadNpmTasks("grunt-line-remover");
    grunt.loadNpmTasks("grunt-contrib-clean");
    grunt.registerTask("default", ["setup", "shell:tsc", "copy:main", "set-version"]);
    grunt.registerTask("release", ["setup-release", "default", "copy:release", "lineremover", "nwbuild", "compress", "increment-version"]);
};