const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: "folia_pdf_viewer_[contenthash].css",
    }),
    new NodePolyfillPlugin(),
  ],
  entry: {
    polyfills: "core-js",
    folia_pdf_viewer: {
      import: "./web/folia/folia-pdf-viewer.js",
      filename: "[name].js",
    },
    pdfjs_worker: {
      import: "./build/generic/build/pdf.worker.js",
      filename: "pdfjs-worker.js",
    },
  },
  cache: true,
  mode: "development",
  performance: {
    hints: false,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
      {
        test: /\.scss$/i,
        use: ["sass-loader"],
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
    ],
  },
  resolve: {
    alias: {
      "pdfjs-lib": path.resolve(__dirname, "build/generic/build/pdf.js"),
      "pdfjs-worker": path.resolve(__dirname, "build/generic/build/pdf.worker.js"),
    },
  },

  output: {
    clean: true,
    asyncChunks: false,
    path: path.resolve(__dirname, "../web-folia/public/folia-pdf-viewer"),
    filename: "[name].js",
    globalObject: "window",
    library: {
      name: "FoliaPdfViewer",
      type: "var",
    },
  },
  experiments: {
    outputModule: true,
  },
};
