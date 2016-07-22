---
title: 删除node_modules
date: 2016-07-09 15:58:30
tags: cmd node
categories: 备忘
---
node_modules文件路径太长不好删除，全局安装此包可解决
```
$ npm i rimraf  
$ rimraf node_modules
```