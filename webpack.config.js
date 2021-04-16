const path = require('path');


module.exports = () => {

  return {
    entry: [
      './src/index.ts',
    ],
    mode: 'production',
    module: {
      rules: [
        {
          test: /\.ts$/,
          include: path.resolve(__dirname, 'src'),
          use: [
            {
              loader: 'ts-loader',
              options: {
                transpileOnly: true,
              },
            },
          ],
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      symlinks: false,
      cacheWithContext: false,
      extensions: ['.ts', '.js'],
    },
    output: {
      filename: `bundle.min.js`,
      path: path.resolve(__dirname, `dist/`),
      pathinfo: false,
    },
  };
};
