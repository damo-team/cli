var _ = require('lodash');
var path = require('path');
var fs   = require('fs');

function getAllAddons(dirname, indexpath) {
  var extensions = {js: 1},
      modules = {};

  indexpath = indexpath || path.join(dirname, 'index.js');

  // Load all exported objects into a single module.
  fs.readdirSync(dirname).forEach(function (filename) {
    var fullpath = path.join(dirname, filename),
        parts    = filename.split('.'),
        module, name;
    
    if (fullpath !== indexpath && extensions[parts.pop()] && '.' !== filename[0]) {
      name = parts[0];
      module = require(fullpath);
      modules[name] = module;
    }
  });

  return modules;
}

//loadAddons.call(context, pkg, webpackOptions);
module.exports = function loadAddons(pkg, webpackOptions, addonNames){
  var addons = getAllAddons(__dirname, __filename);
  var loadAddons = [];
  for(var i = 0, len = addonNames.length; i < len; i++){
    if(addons[addonNames[i]]){
      var caller = addons[addonNames[i]](pkg, webpackOptions);
      if(_.isFunction(caller)){
        loadAddons.push(caller);
      };
    }
  }
  return loadAddons;
}

