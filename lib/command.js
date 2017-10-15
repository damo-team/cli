(function() {
  var fs, path, BANNER, COMMANDS, SWITCHES, parseOptions, buildRules, buildRule, usage, repeat, version, printLine, handler;

  fs = require('fs');
  path = require('path');

  BANNER = 'Usage: damo [command] [options] [arguments]';
  //\n\nIf called without options, cli will run `damo serve --open` in current directory.
  COMMANDS = ['new', 'init', 'serve', 'build', 'dll'];

  SWITCHES = [
    ['-o', '--open [Config Path]', 'argument: [Option] [Config Path] | watch files for changes and run for develop'],
    ['-a', '--assets [Config Path]', 'argument: [Option] [Config Path] | run command without entry html'],
    ['-h', '--help', 'show cli usage'],
    ['-v', '--version', 'show cli version']
  ];

  printLine = function(line) {
    return process.stdout.write(line + '\n');
  };

  repeat = function(str, n) {
    var res;
    res = '';
    while (n > 0) {
      if (n & 1) {
        res += str;
      }
      n >>>= 1;
      str += str;
    }
    return res;
  };

  normalizeArguments = function(args) {
    var arg, j, k, l, len, len1, match, ref, result;
    args = args.slice(0);
    result = [];
    for (j = 0, len = args.length; j < len; j++) {
      arg = args[j];
      if (match = arg.match(/^-(\w{2,})/)) {
        ref = match[1].split('');
        for (k = 0, len1 = ref.length; k < len1; k++) {
          l = ref[k];
          result.push('-' + l);
        }
      } else {
        result.push(arg);
      }
    }
    return result;
  };

  buildRules = function(rules) {
    var j, len, results, tuple,
    results = [];
    for (j = 0, len = rules.length; j < len; j++) {
      tuple = rules[j];
      if (tuple.length < 3) {
        tuple.unshift(null);
      }
      results.push(buildRule.apply(null, tuple));
    }
    return results;
  };

  buildRulesMap = function(rules) {
    var j, len, results, tuple, rule,
    result = {};
    for (j = 0, len = rules.length; j < len; j++) {
      tuple = rules[j];
      if (tuple.length < 3) {
        tuple.unshift(null);
      }
      rule = buildRule.apply(null, tuple);
      result[rule.longFlag] = rule;
      result[rule.shortFlag] = rule;
    }
    return result;
  };

  buildRule = function(shortFlag, longFlag, description, options) {
    var match;
    if (options === null) {
      options = {};
    }
    match = longFlag.match(/\[(\w+(\*?))\]/);
    longFlag = longFlag.match(/^(--\w[\w\-]*)/)[1];
    return {
      name: longFlag.substr(2),
      shortFlag: shortFlag,
      longFlag: longFlag,
      description: description,
      hasArgument: !!(match && match[1]),
      isList: !!(match && match[2])
    };
  };

  parseOptions = function() {
    var args, arg, options, pos, rulesMap, i, j, len, skippingArgument, isOption, seenNonOptionArg;

    options = {
    };
    rulesMap = buildRulesMap(SWITCHES);
    args = normalizeArguments(process.argv.slice(2));

    isOption = args[0] && args[0].match(/^(\w[\w\-]*)/);
    if (isOption && COMMANDS.indexOf(args[0]) > -1) {
      options[args[0]] = true;
      options.arguments = args.slice(1).map(function(arg){
        return rulesMap[arg] ?rulesMap[arg].name : arg;
      });
    }else if(args.length){
      if(rule = rulesMap[args[0]]){
        options[rule.name] = rule.hasArgument ? args[1] : true;
        options.arguments = args.slice(1).map(function(arg){
          return rulesMap[arg] ?rulesMap[arg].name : arg;
        });
      }else{
        console.error(new Error("unrecognized or no command"));
        usage();
      }
    }else{
      console.error(new Error("unrecognized or no command"));
      usage();
    }
    return options;
  };

  exports.run = function() {
    var opts, configPath, arg;

    opts = parseOptions();

    if (!opts.arguments) {
      return;
    }
    
    switch(true){
      case !!opts.help:
        usage();
        break;
      case !!opts.version:
        version();
        break;
      case !!opts.build:
        arg = opts['arguments'][0];
        process.env.ASSETS = arg === 'assets';

        arg = opts['arguments'][1];
        if(arg && arg.indexOf('.json') > -1){
          process.env.CONFIG_FILE = arg;
        }else{
          process.env.CONFIG_FILE = 'config.build.json';
        }
        handler('build');
        break;
      case !!opts.dll:
        handler('dll');
        break;
      case !!opts.new:
        if(!opts['arguments'][0]){
          console.error(new Error('the command needs a projectName!'))
          return;
        }
        boilerplate(opts['arguments'][0]);
        break;
      case !!opts.init:
        init();
        break;
      case !!opts.serve:
      default:
        arg = opts['arguments'][0];
        process.env.OPEN = arg === 'open'

        arg = opts['arguments'][1];
        if(arg && arg.indexOf('.json') > -1){
          process.env.CONFIG_FILE = arg;
        }else{
          process.env.CONFIG_FILE = 'config.dev.json';
        }
        handler('dev');
        break;
    }
  };

  handler = function(type) {
    var runner = require(path.join(__dirname, '../webpack.' + type + '.js'));
    runner();
  };

  // print help message
  usage = function() {
    var j, len, letPart, lines, ref, rule, spaces;
    lines = [];
    if (BANNER) {
      lines.unshift(BANNER + "\n");
    }
    lines.push("where <command> is one of:\n\t" + COMMANDS.join(', ') + "\n");
    ref = buildRules(SWITCHES);
    for (j = 0, len = ref.length; j < len; j++) {
      rule = ref[j];
      spaces = 15 - rule.longFlag.length;
      spaces = spaces > 0 ? repeat(' ', spaces) : '';
      letPart = rule.shortFlag ? rule.shortFlag + ', ' : '    ';
      lines.push('  ' + letPart + rule.longFlag + spaces + rule.description);
    }

    return printLine("\n" + (lines.join('\n')) + "\n");
  };

  // print version
  version = function() {
    var packageJson = fs.readFileSync(path.join(__dirname, '../package.json'));
    try {
      packageJson = JSON.parse(packageJson);
    } catch (e) {
      console.error('Uncaught SyntaxError : package.json');
    }
    return printLine("damo version " + packageJson.version);
  };

  boilerplate = function(dirname){
    var dirPath = path.resolve(process.cwd(), dirname);
    if(fs.existsSync(dirPath)){
      return console.warn('this project had initialized before!');
    }
    
    var ncp = require('ncp').ncp;
  
    ncp.limit = 10;
    
    ncp(path.resolve(__dirname, '../boilerplate'), dirPath, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log('this project had initialized success!');
    });
  }

  init = function(){
    var dirPath = process.cwd();
    if(fs.existsSync(path.resolve(dirPath, 'package.json'))){
      return console.warn('this project had initialized before!');
    }
    var ncp = require('ncp').ncp;
 
    ncp.limit = 10;
    
    ncp(path.resolve(__dirname, '../boilerplate'), dirPath, function (err) {
      if (err) {
        return console.error(err);
      }
      console.log('this project had initialized success!');
    });
  }
}).call(this);
