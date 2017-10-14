"use strict";

var _              = require("lodash");

var configHandlers = {
  'dev': require('./dev'),
  'build': require('./build')
}
var helper         = require('./helper');
var path           = require('path');

/**
 * dev和build都需要实现5个方法
 * {
 *   laodAddons,      新的loader或者plugins都属于扩展
 *   entry,           返回新入口配置
 *   output,          返回新打包输出配置
 *   module,          返回新的loader
 *   plugins          返回新的plugins
 * }
 */
module.exports = function setWebpackOptions(webpackOption, envType){
  var webpackOptions = [webpackOption];
  var configHandler  = configHandlers[envType];
  if(configHandler){
    var pkgJson        = helper.getPackageJson();
  
    //添加扩展，jshint、l20n等均属于扩展addon
    //addon的配置项一般会改动到webpack.config的多项配置
    configHandler.loadAddons(pkgJson, webpackOptions);

    //配置入口
    configHandler.entry(pkgJson, webpackOptions);
    //配置输出
    configHandler.output(pkgJson, webpackOptions);
    //添加module，包括preLoaders、loaders等
    configHandler.module(pkgJson, webpackOptions);
    //添加插件
    configHandler.plugins(pkgJson, webpackOptions);
    //添加source-map
    configHandler.devtool(pkgJson, webpackOptions);
  }

  return webpackOptions;
}