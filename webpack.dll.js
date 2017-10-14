"use strict";

var path = require('path');
var configGenerator = require("./config/index");
var webpackRunner = require('./lib/webpack-runner');
var webpack = require("webpack");
var helper = require("./config/helper");
var pkg = helper.getPackageJson();
var projectPath = helper.getProjectPath(pkg.base);
var assetPath = pkg.output.assetPath ? path.join(pkg.output.assetPath,"") : '/dist/assets/';

module.exports = function buildWebpackConfig() {
  //默认的webpack.config.js，就算configGenerator什么都没做，也能够启动最基本的webpack
  var entry = {};
  entry[pkg.profile && pkg.profile.dll || 'vendor'] = pkg.vendors;
  var output = pkg.output;
  var profilePath;
  if (output && output.path) {
    if(output.version === undefined){
      profilePath = path.join(output.path, pkg.version);
    } else {
      profilePath = path.join(output.path, output.version);
    }
  } else {
    profilePath = path.join('./dist', pkg.version);
  }
  profilePath = profilePath.split('/').slice(0, -1).join('/') + '/profile';
  var webpackOptions = configGenerator({
    entry: entry,
    output: {
        path: projectPath,
        filename: path.join(profilePath, '[name]-dll.js'),
        library: '[name]_library'
    },
    plugins: [
        new webpack.DefinePlugin({
          'process.env.NODE_ENV': process.env.NODE_ENV === 'development' ? JSON.stringify('development') : JSON.stringify('production')
        }),
        new webpack.DllPlugin({
            path: path.join(projectPath, profilePath, '[name]-manifest.json'),
            name: '[name]_library'
        })
    ]
  }, 'ddl');
  webpackOptions = [].concat(webpackOptions);
  
  var compiler = webpack(webpackOptions);
  webpackRunner(compiler.compilers[0], webpackOptions[0], true);
  compiler.run(function(err) {
    if (err) throw err;
  });
};
