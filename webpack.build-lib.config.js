const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: "folia-pdf-viewer.css",
    }),
  ],
  entry: {
    polyfills: "core-js",
    folia_pdf_viewer: "./web/folia/folia-pdf-viewer.js",
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
    ],
  },
  resolve: {
    alias: {
      "pdfjs-lib": path.resolve(__dirname, "build/dist/build/pdf.js"),
      "pdfjs-worker": path.resolve(__dirname, "build/dist/build/pdf.worker.js"),
    },
  },
  // output: {
  //   clean: true,
  //   asyncChunks: false,
  //   path: path.resolve(__dirname, '../folia_vuejs/src/folia-pdf-viewer'),
  //   filename: '[name].js',
  //   library: {
  //     type: "module",
  //   },
  // },

  // output: {
  //   path: path.resolve(__dirname, '../folia_vuejs/src/folia-pdf-viewer'),
  //   filename: '[name].js',
  //   library: {
  //     // name: ['folia_pdf_viewer', 'folia_data_proxy'],
  //     type: "module",
  //     // export: 'default',
  //   },
  //   globalObject: "window",
  // },

  output: {
    asyncChunks: false,
    path: path.resolve(__dirname, "../folia_2/public/folia-pdf-viewer"),
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
