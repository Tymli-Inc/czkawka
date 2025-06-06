// webpack.main.config.js
module.exports = {
  entry: './src/electron/main.ts',
  externals: {
    'get-windows': 'commonjs get-windows',
    '@mapbox/node-pre-gyp': 'commonjs @mapbox/node-pre-gyp',
    'aws-sdk': 'commonjs aws-sdk',
    'mock-aws-s3': 'commonjs mock-aws-s3',
    'nock': 'commonjs nock',
    'electron': 'commonjs2 electron',
  },
  module: {
    rules: require('./webpack.rules'),
  },
  resolve: {
    extensions: ['.js', '.ts', '.json'],
  },
};
console.log('Building main with externals:', module.exports.externals);
