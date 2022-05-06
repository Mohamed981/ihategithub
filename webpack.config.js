const path = require("path");
const NodemonPlugin = require('nodemon-webpack-plugin');
module.exports = 
{
    mode: "development",
    devtool: false,
    entry: "./src/index.js",
    output: 
    {
        filename: "main.js",
        path: path.resolve(__dirname,"dist")
    },
    experiments: {
        topLevelAwait: true,
      },

      plugins: [
        new NodemonPlugin({ 
          script: "server.js", 
          watch: path.resolve('./src'),}), // Dong
      ],
      
    }
