var progressBar = require('./process-bar');
var extend = require('util')._extend;
var open = require('opn');
var lastHash = null;
module.exports = function(compiler, options, noOpen){
  // var compilers = compiler._plugins.compilation;
  var progBar = progressBar();

  var count = compiler._plugins.compilation.length;
  var percent = Math.floor(100/count);
  progBar.onStart(100);
  var num = 0;
  var count = num + percent;
  var interval = setInterval(function(){
    if(num >= count){
      count = num + percent;
    }else{
      num = num + 5;
      if(num < 100){
        progBar.onChange(num);
      }else{
        clearInterval(interval);
        progBar.onChange(99);
        num = 99;
      }
    }
  }, 5);
  var _stats = options.stats;
  compiler.plugin("done", function(stats){
    if(num !== 100){
      num = 100;
      progBar.onChange(100);
      clearInterval(interval);
      progBar.onEnd();
    }

    state = true;
    // Do the stuff in nextTick, because bundle may be invalidated
    //  if a change happend while compiling
    process.nextTick(function() {
      // check if still in valid state
      if(!state) return;
      if(options.profile && options.profile.stats){
        var fs = require('fs');
        var path = require('path');
        var statePath = path.join(options.profile.path, options.profile.stats);
        fs.writeFile(statePath, JSON.stringify(stats.toJson()));
      }
      // 如果存在错误信息
      if(stats.hasErrors() || stats.hasWarnings()) {
        //通过stats.toString输出错误，_stats是输出错误的配置
        //默认webpack会把本地打包的所有文件，打包时间，hash值等输出
        //这里通过_stats控制忽略掉不必要的输出信息
        console.log(stats.toString(_stats));
      }
      console.info("webpack: bundle is now VALID.");
      //首次运行成功
      if(process.env.OPEN){
        //配置_stats
        _stats = extend({
          assets: false,      //不输出assets信息
          chunks: false,      //不输出chunk信息
          chunkModules: false,//输出打包的模块
          showChunkOrigins: false//不输出原始chunk信息
        }, _stats);
        //noOpen，代表build的时候，成功不打开新页面
        if(!noOpen){
          open(options.output.publicPath);
        }
      }
    });

  });

  var _ = require('lodash');
  if(options.nofile){
    noOpen = true;
    
    function appendHash(url, hash) {
      if (!url) {
        return url;
      }
      return url + (url.indexOf('?') === -1 ? '?' : '&') + hash;
    };
    compiler.plugin('emit', function (compilation, callback) {
      var webpackStatsJson = compilation.getStats().toJson();
      var includedChunks = [];
      var excludedChunks = [];
      
      var chunks = webpackStatsJson.chunks.filter(function (chunk) {
        var chunkName = chunk.names[0];
        // This chunk doesn't have a name. This script can't handled it.
        if (chunkName === undefined) {
          return false;
        }
        // Skip if the chunk should be lazy loaded
        if (!chunk.initial) {
          return false;
        }
        // Skip if the chunks should be filtered and the given chunk was excluded explicity
        if (Array.isArray(excludedChunks) && excludedChunks.indexOf(chunkName) !== -1) {
          return false;
        }
        // Add otherwise
        return true;
      });
      var assets = {
        chunks: {},
        // Will contain all js files
        js: [],
        // Will contain all css files
        css: []
      }
      for (var i = 0; i < chunks.length; i++) {
        var chunk = chunks[i];
        var chunkName = chunk.names[0];

        assets.chunks[chunkName] = {};

        // Prepend the public path to all chunk files
        var chunkFiles = [].concat(chunk.files).map(function (chunkFile) {
          return options.output.publicPath + chunkFile;
        });

        // Append a hash for cache busting
        if (this.options.hash) {
          chunkFiles = chunkFiles.map(function (chunkFile) {
            return appendHash(chunkFile, webpackStatsJson.hash);
          });
        }

        // Webpack outputs an array for each chunk when using sourcemaps
        // But we need only the entry file
        var entry = chunkFiles[0];
        assets.chunks[chunkName].size = chunk.size;
        assets.chunks[chunkName].entry = entry;
        assets.chunks[chunkName].hash = chunk.hash;
        assets.js.push(entry);

        // Gather all css files
        var css = chunkFiles.filter(function (chunkFile) {
          // Some chunks may contain content hash in their names, for ex. 'main.css?1e7cac4e4d8b52fd5ccd2541146ef03f'.
          // We must proper handle such cases, so we use regexp testing here
          return /.css($|\?)/.test(chunkFile);
        });
        assets.chunks[chunkName].css = css;
        assets.css = assets.css.concat(css);
      }

      // Duplicate css assets can occur on occasion if more than one chunk
      // requires the same css.
      assets.css = _.uniq(assets.css);
      if(!process.env.OPEN){
        console.log(assets);
      }
      callback();
    });
  }

}