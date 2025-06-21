const path = require('path');
const ObfuscatorPlugin = require('webpack-obfuscator');

module.exports = {
    entry: './app.js', // Adjust this to your entry file
    output: {
        path: path.resolve(__dirname, 'export'),
        filename: 'index.js',
        clean: true, // Cleans the output directory before emit
    },
    mode: 'production', // Ensures minification
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
    target: 'node', // Ensures browser-compatible output
    optimization: {
        usedExports: true, // Tree shaking to remove unused exports
    },
    plugins: [
        new ObfuscatorPlugin({
            compact: true, // Basic minification
            controlFlowFlattening: false, // Disabled to save CPU
            deadCodeInjection: false, // Disabled to save CPU
            debugProtection: false,
            disableConsoleOutput: false,
            identifierNamesGenerator: 'hexadecimal', // Lightweight renaming
            numbersToExpressions: false,
            renameGlobals: false,
            selfDefending: false, // Disabled to save CPU
            simplify: true,
            splitStrings: true, // Moderate protection
            splitStringsChunkLength: 10,
            stringArray: true, // Basic string protection
            stringArrayEncoding: ['base64'], // Encodes strings in base64
            stringArrayThreshold: 0.75,
            transformObjectKeys: false, // Disabled to save CPU
            unicodeEscapeSequence: false
        })
    ]
};