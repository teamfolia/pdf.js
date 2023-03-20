const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
  plugins: [
    new MiniCssExtractPlugin({
      filename: "folia_pdf_viewer_[contenthash].css",
    }),
  ],
  entry: {
    polyfills: "core-js",
    folia_pdf_viewer: {
      import: "./web/folia/folia-pdf-viewer.js",
      filename: "[name]_[contenthash].js",
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
    ],
  },
  resolve: {
    alias: {
      "pdfjs-lib": path.resolve(__dirname, "build/dist/build/pdf.js"),
      "pdfjs-worker": path.resolve(__dirname, "build/dist/build/pdf.worker.js"),
    },
  },

  output: {
    clean: true,
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
