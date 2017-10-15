var ExtractTextPlugin = require('damo-cli-extract-plugin');

module.exports = function(pkg, webpackOptions) {

  return function(webpackOptions) {
    var hasLess = false;
    webpackOptions[0].module.loaders = webpackOptions[0].module.loaders.filter(function(loader) {
      if(loader.test.toString().indexOf('.less') === -1){
        return true;
      }else{
        if(loader.replace){
          hasLess = true;
          return true;
        }else{
          return false;
        }
      }
    });
    const devtool = pkg.devtool ? '?sourceMap' : '';
    if (pkg.inlineStyle) {
      if(!hasLess){
        webpackOptions[0].module.loaders.push({
          test: /\.less$/,
          //提取css文件到内存，否则最终注入到js文件中
          loader: `style-loader!css-loader${devtool}!less-loader${devtool}`
        });
      }
    } else {
      if (pkg.__build__) {
        var cssExtractTextPlugin = new ExtractTextPlugin(1, pkg.output.path + '/' + pkg.output.app + '.css');
      } else {
        var cssExtractTextPlugin = new ExtractTextPlugin(1, webpackOptions[0].hashName + '.css');
      }
      webpackOptions[0].module.loaders.every(function(loader){
        if(loader.test.toString().indexOf('.css') > -1){
          loader.loader = cssExtractTextPlugin.extract('style-loader', `css-loader${devtool}`);
          return false;
        }else{
          return true;
        }
      });
      if(!hasLess){
        webpackOptions[0].module.loaders.push({
          test: /\.less$/,
          //提取css文件到内存，否则最终注入到js文件中
          loader: cssExtractTextPlugin.extract('style-loader', `css-loader${devtool}!less-loader${devtool}`)
        });
        webpackOptions[0].plugins.unshift(cssExtractTextPlugin);
      }
    }
  }
}