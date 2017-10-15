var DoccoPlugin = require('damo-cli-docco-plugin');
module.exports = function(pkg, webpackOptions){
  return function(webpackOptions){
    if(pkg.docco){
      webpackOptions[0].plugins.unshift(new DoccoPlugin(pkg.docco));
    }
  }
}