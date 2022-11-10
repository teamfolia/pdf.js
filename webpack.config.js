const path = require('path');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
    ],
  },
  entry: './web/folia/viewer.js',
  cache: false,
  mode: 'development',
  watchOptions: {
    ignored: /node_modules/,
  },
  resolve: {
    alias: {
      'pdfjs-lib': path.resolve(__dirname, 'build/dist/build/pdf.js'),
      'pdfjs-worker': path.resolve(__dirname, 'build/dist/build/pdf.worker.js'),
    }
  },
  output: {
    asyncChunks: false,
    path: path.resolve(__dirname, 'dist'),
    filename: 'folia_viewer.js',
  },
  plugins: [new HtmlWebpackPlugin({
    template: './public/folia_viewer.html'
  })],

  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
};
