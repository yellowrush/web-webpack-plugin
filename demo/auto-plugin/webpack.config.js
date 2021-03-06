const path = require('path');
const { AutoWebPlugin } = require('../../index');

module.exports = {
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].js',
    },
    entry: {
        ie_polyfill: './src/ie_polyfill',
        polyfill: './src/polyfill',
    },
    plugins: [
        new AutoWebPlugin('./src/', {
            template: './src/template.html',
            commonsChunk: 'common',
            entity: ''
        }),
    ]
};