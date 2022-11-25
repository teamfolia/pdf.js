const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
 plugins: [
   new MiniCssExtractPlugin(),
 ],
 entry: './web/folia/folia_app.js',
  cache: true,
  mode: 'production',
  performance: {
    hints: false,
  },
  module: {
    rules: [
      {
        test: /\.css|scss$/i,
        use: [
          "sass-loader",
          MiniCssExtractPlugin.loader,
          "css-loader",
        ],
      },
    ],
  },
  resolve: {
    alias: {
      'pdfjs-lib': path.resolve(__dirname, 'build/dist/build/pdf.js'),
      'pdfjs-worker': path.resolve(__dirname, 'build/dist/build/pdf.worker.js'),
    }
  },
  output: {
    asyncChunks: false,
    path: path.resolve(__dirname, '../folia_vuejs/public/folia_viewer_dist'),
    filename: 'folia-pdf-viewer-lib.js',
    globalObject: 'this',
    library: {
      name: 'foliaPdfViewerLib',
      type: 'var',
    },
  },
  experiments: {
    // outputModule: true,
  }
}
