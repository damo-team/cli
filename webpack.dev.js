"use strict";

var path = require('path');
var configGenerator = require("./config/index");
var webpackRunner = require('./lib/webpack-runner');
var webpack = require("webpack");
var WebpackDevServer = require("webpack-dev-server");
var HtmlWebpackPlugin = require('damo-cli-html-plugin');
var helper = require("./config/helper");
var pkg = helper.getPackageJson();
var projectPath = helper.getProjectPath(pkg.base);
var proxyObj = helper.getProxy(pkg.proxy);
var assetPath = pkg.output.assetPath || 'dist/assets/';
var exclude = pkg.exclude || /(node_modules|bower_components)/;
var server = pkg.server || {
  host: 'http://127.0.0.1'
};
pkg.server = server;
//  项目中config.local.json的基本配置
//  pkg = {
//    version,
//    base,
//    index,
//    server: {
//      host
//    },
//    proxy: {
//      routes,
//      host
//    },
//    devtool
// }
module.exports = function devWebpackConfig() {
  //默认的webpack.config.js，就算configGenerator什么都没做，也能够启动最基本的webpack
  var webpackOptions = configGenerator({
    entry: "./src/app.js", //js入口文件
    output: {
      path: projectPath, //项目路径
      publicPath: server.host + '/', //引用的js、css的文件路径
      filename: "[name].[hash].js", //js打包的文件名
      chunkFilename: "[id].js" //公用代码
    },
    resolve: { //在webpack编译过程中，改写require引用的文件路径
      alias: {},
      fallback: process.env.NODE_PATH
    },
    module: {
      preLoaders: [], //在loader加载前，一般做ui-test之类的
      noParse: [], //一般来说三方库不需要走loader
      loaders: [ //默认的loader
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /(node_modules|bower_components)/,
          query: {
            cacheDirectory: true, // 对文件进行缓存，修改代码时，可以减少重新编译的时间
            presets: ["es2015"], // babel6中的es6语法编译插件，但是Babel@6 doesn't export default module.exports any more
            plugins: ["add-module-exports", "transform-object-rest-spread"], // 支持es6的中的export default
            filename: __filename // 临时解决因为presets获取es2015，默认进了项目目录的问题。通过强制指定filename到naza目录来解决
          }
        }, {
          test: /\.json$/,
          loader: 'json-loader',
          exclude: exclude
        }, {
          test: /\.(png|jpg|jpeg|gif)$/,
          loader: 'file-loader?name=' + assetPath + '[name].[hash].[ext]',
          exclude: exclude
        }, {
          test: /\.(woff(2)?|eot|ttf|svg)(\?[#a-z0-9=\.]+)?$/,
          loader: 'url-loader?name=' + assetPath + '[name].[hash].[ext]&limit=100000',
          exclude: exclude
        }, {
          test: /\.html$/,
          loader: 'html-loader',
          exclude: exclude
        }, {
          test: /\.css$/,
          loader: 'style-loader!css-loader?sourceMap'
        }
      ]
    },
    plugins: [ //plugins一般是代码汇总的时候做的事情, 比如以下就是js打包好后启动index.html
      new HtmlWebpackPlugin({
        template: path.join(projectPath, pkg.index || './src/index.html'),
        inject: 'body'
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(['development'])
      })
    ],
    resolveLoader: { //loader的寻址地址
      modulesDirectories: [
        path.resolve(process.cwd(), "node_modules"),
        path.resolve(__dirname, "node_modules")
      ],
    },
    devtool: pkg.devtool || '#source-map' //打包支持调试,sourcemap
  }, 'dev');
  webpackOptions = [].concat(webpackOptions);

  var devServer = {
    contentBase: projectPath, //启动node-expess
    stats: { //关闭日志收集
      modules: false,
      cached: false,
      colors: true,
      chunk: false
    },
    hot: pkg.hot, //启动热部署
    historyApiFallback: true, //容错
    proxy: proxyObj.proxy, //代理
    headers: proxyObj.headers, //http 头部
    quiet: true, //关闭错误日志打印
    noInfo: false, //一般的日志也不输出
    watchOptions: { //热部署更新频率
      aggregateTimeout: 300,
      poll: 1000
    }
  };

  console.log('正在启动本地服务...');

  var compiler = webpack(webpackOptions);
  webpackRunner(compiler.compilers[0], webpackOptions[0]);

  var serverHandler = new WebpackDevServer(compiler, devServer);

  if(pkg.profile && pkg.profile.dll){
    var staticServer = require('serve-static');
    serverHandler.app.use(staticServer(webpackOptions[0].profile.dllPath));
  }

  var hosts = server.host.replace(/\w*\:\/\//, '').split(':');
  serverHandler.listen(hosts[1] || 8000, hosts[0], function() {});
};
