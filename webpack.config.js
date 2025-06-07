const path = require("path");
const JavaScriptObfuscator = require("webpack-obfuscator");
const TerserPlugin = require("terser-webpack-plugin");

module.exports = {
    entry: "./app.js",
    target: "node",
    mode: "production",
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
                exclude: /node_modules/,
                use: {
                    loader: "babel-loader",
                    options: {
                        presets: ["@babel/preset-env"],
                    },
                },
            },
        ],
    },
    resolve: {
        modules: [path.resolve(__dirname, "node_modules")],
    },
    // Removed externals to bundle everything
    node: {
        __dirname: false,
        __filename: false,
    },
    optimization: {
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {
                        drop_console: true,
                    },
                    mangle: true,
                    output: {
                        comments: false,
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
                controlFlowFlatteningThreshold: 0.9,
                deadCodeInjection: true,
                deadCodeInjectionThreshold: 0.4,
                debugProtection: true,
                debugProtectionInterval: true,
                disableConsoleOutput: true,
                identifiersGenerator: "mangled",
                selfDefending: true,
                sourceMap: false,
                stringArray: true,
                stringArrayThreshold: 0.75,
            },
            ["bundle.js"]
        ),
    ],
};
