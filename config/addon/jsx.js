var webpack = require('webpack');
var _       = require("lodash");

module.exports = function(pkg, webpackOptions){
  if(!pkg.jsx) return;
  //https://github.com/webpack/react-starter
  return function(webpackOptions){
    
    if(webpackOptions[0].resolve.extensions){
      webpackOptions[0].resolve.extensions.push('.jsx');
    }else{
      webpackOptions[0].resolve.extensions = ['', '.js', '.jsx']
    }
    
    webpackOptions[0].module.loaders.every(function(loader, index){
      if(loader.test.toString().indexOf('.js') > -1){
        loader.loader = 'babel';
        loader.test = /\.jsx?$/;
        loader.query.plugins.push("transform-decorators-legacy", "transform-class-properties");
        // loader.query.plugins.push('transform-runtime');
        // if(!pkg.__build__){
        //   //https://github.com/gaearon/babel-plugin-react-transform
        //   loader.query.plugins.push(["react-transform", {
        //     "transforms": [{
        //       "transform": "react-transform-hmr",
        //       "imports": ["react"],
        //       "locals": ["module"]
        //     }]
        //   }]);
        // }
        loader.query.presets.push('react');
        
        return false;
      }else{
        return true;
      }
    });
    
    // webpackOptions[0].plugins.unshift(new webpack.PrefetchPlugin("react/lib/ReactComponentBrowserEnvironment"));
    webpackOptions[0].plugins.unshift(new webpack.PrefetchPlugin("react"));
    
  };
}
