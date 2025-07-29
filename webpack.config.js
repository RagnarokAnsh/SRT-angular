const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true,
            pure_funcs: ['console.log', 'console.info', 'console.debug', 'console.warn']
          },
          mangle: true,
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  },
};