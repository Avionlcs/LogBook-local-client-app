const path = require("path");
const JavaScriptObfuscator = require("webpack-obfuscator");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: "./app.js",
    mode: "production",
    target: "node",
    stats: {
        warningsFilter: /Critical dependency/,
    },
    ignoreWarnings: [/Critical dependency/],
    output: {
        path: path.resolve(__dirname, "export"),
        filename: "bundle.js",
        libraryTarget: "commonjs2",
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    resolve: {},
    externals: {},
    node: {},
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true, // Remove console statements
                    },
                    mangle: true, // Mangle variable names
                    output: {
                        comments: false, // Remove comments
                    },
                },
            }),
        ],
    },
    plugins: [
        new JavaScriptObfuscator(
            {
                rotateUnicodeArray: true,
                compact: true,
                controlFlowFlattening: true,
                controlFlowFlatteningThreshold: 0.9, // Higher threshold
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.4,
                debugProtection: true,
                debugProtectionInterval: true,
                disableConsoleOutput: true,
                identifiersGenerator: "mangled",
                selfDefending: true,
                sourceMap: false,
                stringArray: true, // Use string array
                stringArrayThreshold: 0.75, // High threshold for string array
            },
            ["bundle.js"]
        ),
    ],
};