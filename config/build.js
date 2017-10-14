var _ = require('lodash');
var path = require('path');
var loadAddons = require('./addon/index');
var helper = require('./helper');
var webpack = require("webpack");
var Clean = require('../lib/clean');
var HtmlWebpackPlugin = require('@damo/cli-html-plugin');
var ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');

/*
 {
   laodAddons,      新的loader或者plugins都属于扩展
   entry,           返回新入口配置
   output,          返回新打包输出配置
   module,          返回新的loader
   plugins          返回新的plugins
 }
*/
module.exports = {
  addons: [],
  //build只用docco, less和l20n，jshint不用
  loadAddons: function(pkg, webpackOptions) {
    pkg.__build__ = true;
    this.addons = loadAddons(pkg, webpackOptions, ['jsx', 'less', 'l20n', 'docco']);
  },
  //1. vendors加入到noParse
  //2. entry配置
  //3. js-loader的exclude中加入vendors
  entry: function(pkg, webpackOptions) {
    webpackOptions[0].nofile = (pkg.output.file === 'none');
    if(pkg.hash){
      webpackOptions[0].hashName = '[name].' + pkg.hash;
    } else if(pkg.hash === false){
      webpackOptions[0].hashName = "[name]";
    }else{
      webpackOptions[0].hashName = '[name].[hash]';
    }
    webpackOptions[0].module.noParse = webpackOptions[0].module.noParse.concat(pkg.vendors);
    webpackOptions[0].entry = helper.getPublicEntry(pkg.main, pkg.vendors, pkg.base);

    if (pkg.noParse) {
      pkg.noParse.forEach(function(path) {
        webpackOptions[0].module.noParse.push(asRegExp(path));
      });
    }

    if (pkg.vendors && pkg.vendors.length) {
      this.addons.unshift(function(webpackOptions) {
        webpackOptions[0].module.loaders.forEach(function(loader) {
          if (loader.test.toString().indexOf('.js') > -1) {
            loader.exclude = new RegExp(pkg.vendors.map(function(v){return '\/' + v + '\/'}).concat(['node_modules', 'bower_components']).join('|'))
            return false;
          }
        });
      });
    }

    return webpackOptions[0].entry;
  },
  //1. 所有的静态files的js带上版本号
  //2. 确定打包目录
  //3. output配置
  output: function(pkg, webpackOptions) {
    if (pkg.files.js) {
      pkg.files.js = pkg.files.js.map(function(jsUrl) {
        return jsUrl.replace('[hash]', pkg.hash || +new Date());
      });
    }

    var folderPath = './dist';
    var _output = {
      file: folderPath + '/index.html',
      path: '',
      app: webpackOptions[0].hashName,
      vendor: webpackOptions[0].hashName
    };
    var output;
    if (pkg.output) {
      pkg.output = output = _.extend(_output, pkg.output)
    } else {
      pkg.output = output = _output;
    }

    //打包输出的目录
    if (output.path) {
      output.file = path.join(output.path, '/index.html');
      if(output.version === undefined){
        output.path = path.join(output.path, pkg.version);
      } else {
        output.path = path.join(output.path, output.version);
      }
    } else {
      output.path = path.join(folderPath, pkg.version);
    }

    webpackOptions[0].output = {
      path: helper.getProjectPath(pkg.base),
      publicPath: '',
      filename: output.path + '/' + output.app + '.js'
    }
    if(pkg.vendors && pkg.vendors.length) {
      webpackOptions[0].output["chunkFilename"] = output.path + '/' + output.vendor + '.js';
    }
    if(pkg.externals){
      webpackOptions[0].externals = pkg.externals.map(function(item){
        if(item.charAt(item.length - 1) === '/'){
          return asRegExp(item);
        }else{
          return item;
        }
      });
    }
    if(output.library){
      webpackOptions[0].output.library = output.library;
      webpackOptions[0].output.libraryTarget = output.libraryTarget || 'umd';
    }

    return webpackOptions[0].output;
  },
  //loaders配置项
  module: function(pkg, webpackOptions) {
    _.extend(webpackOptions[0].resolve, pkg.resolve);
    var loaders = pkg.loaders || [];
    var _loaders = webpackOptions[0].module.loaders;
    var _loadersObj = {};
    _loaders.forEach(function(loader) {
      _loadersObj[loader.test.toString()] = loader;
    });

    loaders.forEach(function(loader) {
      loader.test = asRegExp(loader.test);
      loader.include = asRegExp(loader.include);
      loader.exclude = asRegExp(loader.exclude);
      var key = loader.test.toString().replace('\\$', '$');

      if (_loadersObj[key] && loader.replace) {
        _loadersObj[key] = loader;
      } else if (!loader.dev) {
        _loadersObj[Math.random()] = loader;
      }
    });
    webpackOptions[0].module.loaders = [];
    for (var k in _loadersObj) {
      webpackOptions[0].module.loaders.push(_loadersObj[k]);
    }

    return webpackOptions[0].module;
  },
  // 1. plugins配置
  // 2. vendor存在则，CommonsChunkPlugin
  // 3. 应用扩展
  plugins: function(pkg, webpackOptions) {
    var projectPath = helper.getProjectPath(pkg.base);
    webpackOptions[0].plugins = [
      new webpack.optimize.OccurrenceOrderPlugin(true),
      new Clean([pkg.output.path], projectPath),
      new webpack.NoErrorsPlugin(),
      new ngAnnotatePlugin(),
      new webpack.optimize.DedupePlugin()
    ];
    if(!pkg.noUglify){
      webpackOptions[0].plugins.push(
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: !pkg.quiet //打包时warning信息不提示
          },
          // see: https://github.com/webpack/webpack/issues/1079
          exclude: new RegExp(pkg.vendors.concat(['node_modules', 'bower_components']).join('|'))
        })
      );
    }
    if(!webpackOptions[0].nofile || !process.env.ASSETS){
      webpackOptions[0].plugins.unshift(
      new HtmlWebpackPlugin({
        filename: pkg.output.file,
        template: path.join(projectPath, pkg.index || './src/index.html'),
        inject: 'body',
        chunks: Object.keys(webpackOptions[0].entry),
        files: pkg.files
      }));
    }

    if (webpackOptions[0].entry.vendor) {
      webpackOptions[0].plugins.push(new webpack.optimize.CommonsChunkPlugin('vendor', pkg.output.path + '/' + pkg.output.vendor + '.js'))
    }
    // 可以让变量直接在模块作用域里加载，而不需要使用 require 等方法
    if (pkg.provide && _.isObject(pkg.provide)) {
      webpackOptions[0].plugins.push(new webpack.ProvidePlugin(pkg.provide));
    }
    //嵌入addons
    this.addons.forEach(function(caller) {
      caller(webpackOptions);
    });

    //definePulgins
    // see: http://tech.vg.no/2015/11/13/be-environment-aware/
    if(pkg.partition){
      for(var k in pkg.partition){
        if(typeof pkg.partition[k] === 'string'){
          pkg.partition[k] = JSON.stringify(pkg.partition[k]);
        }
      }
    }else{
      pkg.partition = {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
      }
    }
    webpackOptions[0].plugins.push(new webpack.DefinePlugin({
      'process.env': pkg.partition
    }));
    
    if(pkg.profile){
      // var StatsWriterPlugin = require('webpack-stats-plugin').StatsWriterPlugin;
      // webpackOptions[0].plugins.push(new StatsWriterPlugin({
      //   filename: "stats.json" // Default
      // }))
      webpackOptions[0].profile = pkg.profile;
      var profilePath = webpackOptions[0].profile.path = path.join('.', pkg.base, pkg.output.path.split('/').slice(0, -1).join('/') + '/profile');

      if(pkg.profile.assets){
        webpackOptions[0].plugins.push(new AssetsPlugin({ filename: pkg.profile.assets, path: profilePath }));
      }
      // #! dll
      if(pkg.profile.dll){
        webpackOptions[0].plugins.push(new webpack.DllReferencePlugin({
          context: '.',
          manifest: require(path.resolve(profilePath, `${pkg.profile.dll}-manifest.json`)),
        }))
      }
    }

    return webpackOptions[0].plugins;
  },
  devtool: function(pkg, webpackOptions){
    var _devtool = (pkg.devtool === undefined) ? "source-map" : pkg.devtool;
    webpackOptions[0].devtool = (pkg.devtool === undefined) ? "source-map" : pkg.devtool;
  }
}

function asRegExp(test) {
  if (typeof test === "string") test = new RegExp(test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  return test;
}
