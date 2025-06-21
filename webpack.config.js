const path = require('path');
const ObfuscatorPlugin = require('webpack-obfuscator');

module.exports = {
    entry: './app.js',
    output: {
        path: path.resolve(__dirname, 'export'),
        filename: 'index.js',
        clean: true,
    },
    mode: 'production',
    module: {
        rules: [
            {
                test: /\.js$/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: ['@babel/preset-env'],
                    },
                },
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
    },
    target: 'node',
    optimization: {
        usedExports: true,
    },
    plugins: [
        // new ObfuscatorPlugin(
        //     {
        //         compact: false,
        //         controlFlowFlattening: false,
        //         deadCodeInjection: false,
        //         debugProtection: false,
        //         disableConsoleOutput: false,
        //         identifierNamesGenerator: 'hexadecimal',
        //         numbersToExpressions: false,
        //         renameGlobals: false,
        //         selfDefending: false,
        //         simplify: false,
        //         splitStrings: false,
        //         stringArray: false,
        //         stringArrayEncoding: [],
        //         stringArrayThreshold: 0,
        //         transformObjectKeys: false,
        //         unicodeEscapeSequence: false
        //     },
        //     []
        // )
    ],
    infrastructureLogging: {
        level: 'warn'
    },
    parallelism: 1
};
