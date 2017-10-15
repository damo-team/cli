var l20nWebpckBlock = require('damo-cli-l20n-loader/webpack-block');

module.exports = function(pkg, webpackOptions){
  return function(webpackOptions){
    if(pkg.locals && pkg.locals['default']){
      pkg.files.l20n = l20nWebpckBlock(webpackOptions, pkg.locals, pkg.version);
    }
  }
}