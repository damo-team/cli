"use strict";

var path = require('path');
var configGenerator = require("./config/index");
var webpackRunner = require('./lib/webpack-runner');
var webpack = require("webpack");
var helper = require("./config/helper");
var pkg = helper.getPackageJson();
var projectPath = helper.getProjectPath(pkg.base);
var assetPath = pkg.output.assetPath ? path.join(pkg.output.assetPath,"") : '/dist/assets/';
var exclude = pkg.exclude || /(node_modules|bower_components)/;

module.exports = function buildWebpackConfig() {
  //默认的webpack.config.js，就算configGenerator什么都没做，也能够启动最基本的webpack
  var webpackOptions = configGenerator({
    bail: false, //报错不终止
    context: projectPath, //打包的根目录
    entry: "./src/app.js", //入口js文件
    output: {
      path: projectPath, //项目路径
      publicPath: '', //引用的js、css的文件路径，都打包在js中了，所以不需要有前缀路径了
      filename: "[name].[hash].js", //生成的js文件名
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
            presets: ['env'], // babel6中的es6语法编译插件，但是Babel@6 doesn't export default module.exports any more
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
          loader: 'url-loader?name=' + assetPath + '[name].[hash].[ext]',
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
    plugins: [ //plugins，默认只打包app.js，index.html不做改动
      new webpack.NoErrorsPlugin(), //打包js出错不输出错误信息
      new webpack.optimize.DedupePlugin(), //避免重复的代码
      new webpack.optimize.UglifyJsPlugin({ //压缩，三方库不做压缩
        exclude: /node_modules|bower_components/
      }),
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(['production'])
      })
    ],
    resolveLoader: { //loader的寻址地址
      modulesDirectories: [
        path.resolve(process.cwd(), "node_modules"),
        path.resolve(__dirname, "node_modules")
      ],
    },
    devtool: '#source-map' //固定为sourcemap
  }, 'build');
  webpackOptions = [].concat(webpackOptions);
  
  var compiler = webpack(webpackOptions);
  webpackRunner(compiler.compilers[0], webpackOptions[0], true);
  compiler.run(function(err) {
    if (err) throw err;
  });
};
