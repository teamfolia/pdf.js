const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ["style-loader", "css-loader"],
      },
      {
        test: /\.scss$/i,
        use: ["sass-loader"],
      },
      {
        test: /\.html$/i,
        loader: "html-loader",
      },
      {
        test: /\.worker\.js$/,
        use: { loader: "worker-loader" },
      },
      {
        test: /\.(graphql|gql)$/,
        exclude: /node_modules/,
        loader: "graphql-tag/loader",
      },
    ],
  },
  entry: "./web/folia/viewer.js",
  cache: true,
  mode: "development",
  performance: {
    hints: false,
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  resolve: {
    alias: {
      "pdfjs-lib": path.resolve(__dirname, "build/dist/build/pdf.js"),
      "folia-pdf-viewer/pdfjs-worker.js": path.resolve(__dirname, "build/dist/build/pdf.worker.js"),
    },
  },
  output: {
    asyncChunks: false,
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: "./public/index.html",
    }),
  ],

  devServer: {
    static: {
      directory: path.join(__dirname, "public"),
    },
    compress: true,
    port: 9000,
  },
};
