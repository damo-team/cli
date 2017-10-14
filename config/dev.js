var loadAddons = require('./addon/index');
var helper = require('./helper');
var webpack = require("webpack");
var HtmlWebpackPlugin = require('@damo/cli-html-plugin');
var _ = require('lodash');
var path = require('path');

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
  //使用jshint、less、l20n扩展，具体有没有使用，看addon/
  loadAddons: function(pkg, webpackOptions) {
    this.addons = loadAddons(pkg, webpackOptions, ['jsx', 'jshint', 'less', 'l20n']);
  },
  //1. vendors的内容加入noParse
  //2. entry输入
  //3. js的loader的exclude加上vendors
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
    webpackOptions[0].entry = helper.getPublicEntry(pkg.dev || pkg.main, pkg.vendors, pkg.base);

    if (pkg.noParse) {
      pkg.noParse.forEach(function(path) {
        webpackOptions[0].module.noParse.push(asRegExp(path));
      });
    }
    //addons是在plugins处理完后进行的，也就是不用担心plugins是否被重写过
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
  //输出的配置项
  output: function(pkg, webpackOptions) {
    webpackOptions[0].output = {
      path: helper.getProjectPath(pkg.base),
      publicPath: pkg.server.host + '/',
      filename: webpackOptions[0].hashName + '.js',
      chunkFilename: webpackOptions[0].hashName + '.js',
    }

    return webpackOptions[0].output;
  },
  //1. loaders配置项，比如scss-loader也是可配的
  //2. expose，转换模块到全局变量
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
      } else {
        _loadersObj[Math.random()] = loader;
      }
    });
    webpackOptions[0].module.loaders = [];
    for (var k in _loadersObj) {
      webpackOptions[0].module.loaders.push(_loadersObj[k]);
    }

    // 可以让变量输出到window对象中
    if (pkg.expose && _.isObject(pkg.expose)) {
      _.mapKeys(pkg.expose, function(vaule, key) {
        webpackOptions[0].module.loaders.push({
          test: new RegExp(vaule, 'g'),
          loader: 'expose?' + key
        });
      });
    }

    return webpackOptions[0].module;
  },
  //1. 默认是有html
  //2. vendor存在，则加入CommonsChunkPlugin
  //3. provide把变量注入到代码中
  //4. 应用扩展
  plugins: function(pkg, webpackOptions) {
    webpackOptions[0].plugins = [];
    if(!webpackOptions[0].nofile){
      webpackOptions[0].plugins.push(new HtmlWebpackPlugin({
        template: path.join(helper.getProjectPath(pkg.base), pkg.index || './src/index.html'),
        inject: 'body',
        files: pkg.files
      }))
    }

    //pkg.vendors
    if (webpackOptions[0].entry.vendor) {
      webpackOptions[0].plugins.push(
        new webpack.optimize.CommonsChunkPlugin('vendor', webpackOptions[0].hashName + '.js')
      );
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
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
      }
    }
    webpackOptions[0].plugins.push(new webpack.DefinePlugin({
      'process.env': pkg.partition
    }));

    if(pkg.profile){
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

      webpackOptions[0].profile = pkg.profile;
      var dllPath = profilePath.split('/').slice(0, -1).join('/') + '/profile';
      profilePath = webpackOptions[0].profile.path = path.join('.', pkg.base, dllPath);
      
      if(pkg.profile.assets){
        webpackOptions[0].plugins.push(new AssetsPlugin({ filename: pkg.profile.assets, path: profilePath }));
      }
      // #! dll
      if(pkg.profile.dll){
        webpackOptions[0].profile.dllPath = dllPath;
        var dllFile = path.join(dllPath.split('/').slice(0, -1).join('/') + '/profile', `${pkg.profile.dll}-dll.js`);
        if(pkg.files.js){
          pkg.files.js.push(dllFile)
        }else{
          pkg.files.js = [dllFile]
        }
        
        webpackOptions[0].plugins.push(new webpack.DllReferencePlugin({
          context: '.',
          manifest: require(path.resolve(profilePath, `${pkg.profile.dll}-manifest.json`)),
        }))
      }
    }

    return webpackOptions[0].plugins;
  },
  devtool: function(pkg, webpackOptions){
    return  "source-map"
  }
}

function asRegExp(test) {
  if (typeof test === "string") test = new RegExp(test.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"));
  return test;
}
