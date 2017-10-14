"use strict";

var _          = require("lodash");
var fs         = require('fs');
var path       = require('path');
var defaultPkg = require("../config.default.json");
var pkg;
var projectPath;

/**
 * helper = {
 *   getPackageJson,      //获取配置项，由多个配置文件组合：process.env.CONFIG_PATH > [projectPath]/config.local.json > config.default.json
 *   getPublicEntry,      //获取入口配置，对于dev和build，处理是一样
 *   getProxy,            //获取代理信息，dev用
 *   getProjectPath       //获取项目根目录
 * }
 */
module.exports = {
  getPackageJson: function(){
    if(pkg){
      return pkg;
    }
    var configPath = process.env.CONFIG_PATH;
    var defaultConfigFileName = process.env.CONFIG_FILE || 'config.dev.json';

    var proPkgPath, stats;
    if (configPath) {
      stats = fs.statSync(configPath);
      if (stats.isDirectory()) {
        proPkgPath = path.join(configPath, defaultConfigFileName);
      } else {
        proPkgPath = configPath;
      }
    } else {
      proPkgPath = path.join(process.cwd(), defaultConfigFileName);
    }

    var proPkg = {};
    try {
      if (fs.existsSync(proPkgPath)) {
        proPkg = JSON.parse(fs.readFileSync(proPkgPath));
      }
    } catch (e) {
      console.log(e);
    }
    pkg = _.extend({files: {}, vendors: [] , output: {}}, defaultPkg, proPkg);
    
    return pkg;
  },
  
  getPublicEntry: function(main, vendors, base){
    var entry = {};
    var projectPath = this.getProjectPath(base);
    if (main && typeof main === 'object') {
       for (var k in main) {
        if(Array.isArray(main[k])){
          entry[k] = main[k].map(item => path.resolve(projectPath, item || './src/app.js'));
        }else{
          entry[k] = path.resolve(projectPath, main[k] || './src/app.js');
        }
       }
     } else {
      if(Array.isArray(main)){
        entry.app = main.map(item => path.resolve(projectPath, item || './src/app.js'));
      }else{
        entry.app = path.resolve(projectPath, main || './src/app.js');
      }
    }
    
    if (vendors.length > 0) {
      entry.vendor = vendors;
    }
    return entry;
  },
  
  getProxy: function(proxyCfg){
    var obj = {
        proxy: {},
        header: {}
    };
    if(proxyCfg) {
      proxyCfg.forEach(function(item){
        item.routes.forEach(function(v){
          obj.proxy[v] = {
            target: item.host,
            secure: false,
            rewrite: function(req){
              if(item.headers){
                _.assign(req.headers, item.headers);
              }
            }
          }
        });
      });
    }
    return obj;
  },
  
  getProjectPath: function(base){
    if(projectPath){
      return projectPath;
    }
    
    if(base){
      projectPath = path.join(process.cwd(), base);
    }else{
      projectPath = process.cwd();
    }
    return projectPath;
  }
}