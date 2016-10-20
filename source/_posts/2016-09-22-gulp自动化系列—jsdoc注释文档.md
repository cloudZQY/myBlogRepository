---
title: gulp自动化系列—jsdoc注释文档
date: 2016-09-22 11:01:23
tags: gulp自动化
categories: 笔记
---
> jsdoc是根据js注释快速生成API文档的工具。好的api文档能大大提高效率，在使用公共组件时，直接按照文档来，而不用去看源码注释。
生成的文档是html，还可以选择各种主题模板，不过需要学习特定的注释格式，在现在流行的IDE中基本都有jsdoc的插件，使用起来还是挺方便的。
在使用gulp的项目中，利用gulp-jsdoc3可以将gulp和jsdoc结合起来，实现快速自动构建文档。

<!-- more -->

## 配置步骤
* 确保自己安装了最新的nodejs，首先建立文件夹并安装依赖模块
```cmd
mkdir jsdoc-demo
cd jsdoc-demo
npm i --save-dev gulp gulp-jsdoc3 gulp-load-plugins gulp-clean
```
建立如下文件结构  
```
│  gulpfile.js
│  jsdoc.conf.json
│  package.json
│  global.js
│
├─doc
│          
├─modules
    ├─module1
    │      module1.js
    │      
    └─module2
            module2.js

```
* 然后配置jsdoc.conf.json文件。
```js
{
  "opts": {
      "encoding": "utf8", // 编码格式
      "destination": "./doc", // 生成文档的位置
      "recurse": true  // 是否递归扫描文件
  },
  "tags": {
      "allowUnknownTags": true // 是否允许自定义标签
  },
  "source": {
      "includePattern": ".+\\.js(doc|x)?$", // 扫描文件名的正则表达式
      "excludePattern": "(\\.min.js|vendor)" // 忽略文件名的正则表达式
  },
  "include": ["modules/**/*.js", "global.js"], // 扫描的文件夹
  "templates": { // 模板设置
      "collapseSymbols": false,
      "cleverLinks": false,
      "systemName": "demo前端文档",
      "copyright": "mingdao.com",
      "theme": "cosmo", // 模板
      "outputSourceFiles": true // 是否输出源文件，为true则可以在注释文档中直接打开原文件代码位置
  }
}
```
更多的配置项请看jsdoc官方文档，使用时请删除注释。
在直接使用jsdoc时，include是放在source中的，但是在使用gulp-jsdoc时gulp扫描到文件，gulp-jsdoc会再根据jsdoc.conf.json再扫描一次，出现解析两次的情况，所以我选择的是将include放外层，仅gulp扫描一次。
  
* 接着将一下代码添加进gulpfile.js
```js
var gulp = require('gulp');
var jsdoc = require('gulp-jsdoc3');
var jsdocConfig = require('./jsdoc.conf.json');
var $ = require('gulp-load-plugins')();
gulp.task('doc', ['clean-doc', 'jsdoc']);
gulp.task('docwatch', ['doc:watch']);
gulp.task('clean-doc', function cleanDoc() {
    return gulp.src([
        jsdocConfig.opts.destination
    ], { read: false })
    .pipe($.clean({ force: true }));
});
gulp.task('jsdoc', function createJsdoc() {
    return gulp.src(jsdocConfig.include)
.pipe(jsdoc(jsdocConfig));
});
gulp.task('doc:watch', ['jsdoc'], function docwatch() {
    gulp.watch(jsdocConfig.include, ['jsdoc']);
  });
```
执行gulp jsdoc 或 gulp jsdocwatch 可以生成文档，或者监控代码变动自动生成。

## 编写注释
jsdoc对模块化的支持应该算是其最大的特点，不管是es2015 Module 还是cmd 和 amd，都提供了支持，还支持class的支持
接下来我们将对这个小demo进行注释。
一般来说，项目中总会有一些全局公用的函数和参数，我们将他们放在global.js中。
```js
/**
 * 获取cookie值
 * @param  {string} name cookie名
 * @return  {string} vaule cookie值
 */
function getCookie(name) {
    var arr = document.cookie.match(new RegExp('(^| )' + name + '=([^;]*)(;|$)'));
    if (arr != null) {
        return unescape(arr[2]);
    }
    return null;
}
/**
 * 全局参数
 * @namespace
 * @type {object}
 */
globalConfig = {
    /**@property {string} 七牛地址 */
    QiniuUploadUrl: 'https://up.qbox.me/',
    /**@property {number} 主题编号 */
    theme: 3
}
```
效果图如下
![](/images/gulp-jsdoc.png)

jsdoc的注释写法比较灵活，我这边采用的方法是把公用方法直接注释，jsdoc将把他放进global里面，而公用对象使用@namespace当做一个命名空间。
这时候就可以在topbar上看见两个tab，namespace和global，分别有getCookie和globalConfig。
接下来对modules里的两个模块进行注释，不同规范的模块化代码的注释其实大同小异，具体可以翻阅文档，这里将采用es6Module的写法。
modules/module1/module1.js

...待续