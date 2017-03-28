layout: react-native
title: icon解决方案（svg）
date: 2017-03-26 19:59:24
tags: react-native
---
![](http://upload-images.jianshu.io/upload_images/2115894-363f63c672b6ffa2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
** 在开发app的过程中总是少不了各种各样的icon图标。移动端和pc端的解决方式各有不同，而RN与之前的开发方式都有所不同，所以我们要对各种引入图标的方式进行权衡。**

<!-- more -->
####一： 三种方式
目前主流的解决图标的方式又三种，如下：
**1.图片**
使用png图片，应该是移动端最普适的方案，对RN来说，使用图片解决图标最简单，也最复杂，简单的是RN自己就能够解析图片，因此不用引入任何外部库，复杂的就是为了ios和安卓的各种屏幕，我们可能要对每个图片准备各种尺寸。
**2. IconFont**
对于web开发来说，字体图标绝对是解决icon最熟悉的方案了。也由此，react-native的开源库react-native-vector-icons开始流行起来。这种方案解决简单，只用引进这个库和.ttf文件，就能像写web一样使用字体图标了。并且现在很多demo都是用字体图标来解决的。
**3.svg**
之所以要把svg和图片分开，就是因为RN是默认不支持svg的，我们需要引入react-native-svg这个库才能渲染svg图标。svg对比图片拥有体积小，而且因其可缩放特性，不用理会用户屏幕的尺寸。
####二：对比

类型| 优势 | 劣势
----|------|----
图片(打包)| 使用方便，直接用require和Image标签就可以使用  | bundle体积增大，特别是热更新对流量，影响太大。需要根据屏幕不同准备多种尺寸。
图片(URI)| 同上，更换方便，远程管理  | 基本同上，缓存管理比较麻烦，需要另外的库。
IconFont | 随app打包，文件小，使用便利，不用担心屏幕屏幕尺寸  | **不能热更新**，需要引入额外的库
svg(打包)| 文件极小，可随bundle热更新，可缩放图形，不用担心屏幕尺寸问题  | 需要引入额外的库
svg(URI)| 基本同图片，不用担心屏幕尺寸  | 缓存 

####三：决定实施方案 （svg）
鉴于使用图片为了防止模糊，要准备多倍图，首先就被pass掉了。而字体图标做为我常用的手段，特别是公司的字体是通过icomoo这种网站统一管理的，本来是很倾向于使用的，奈何.ttf文件必须随项目打包到app里面，不能热更新。至少在没有放弃codepush的情况下，只能放弃了。接下来就只有使用svg了 。

  
svg的体积极小，几十个图标文件加起来不到3k，随bundle打包是最好的选择，正好现在的字体图标管理网站也能生成svg文件，很方便和设计师合作。设计师只用将需要使用的svg图标上传到icomoo上命名好，然后打包下载就能使用。

使用`react-native-svg`就能对svg的标签解析成图片，而使用`react-native-svg-uri`则能把svg文件的`xml`解析成响应的`component`。这样就能把svg文件转化成图形。但是后来发现这在安卓中行不通，因为安卓的RN项目中，只能允许require `png`和`xml`格式的文件。不过这并不是什么大问题，本来对icomoo生成svg文件中，我们仅仅需要`path`标签，其余的都是浪费空间的，而且频繁require静态文件也会减慢速度。我们可以用脚本来将svg文件批量生成js使用的字符串，然后通过`react-native-svg-uri`来解析xml。这个库作者也考虑到android的问题预留了接受字符串的api。
![](http://upload-images.jianshu.io/upload_images/2115894-f48288e075bb1a2e.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
于是我们的使用方式变成了：svg文件->js的xml数据集合->Svg Component。
另外在`react-native-svg-uri`更新太慢，其npm包依赖了低版本的`react-native-svg`。如果你使用的5.0版本以上的svg，会由于原生和`react-native-svg-uri`所使用的`react-native-svg`版本不同而报错。其实这个库原理很简单，而且只有两百行代码，很好维护。建议不通过npm直接在项目中使用，可以解决版本问题。

####四：具体步骤
步骤1： 下载svg文件
![icomoo仓库](http://upload-images.jianshu.io/upload_images/2115894-363f63c672b6ffa2.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
以我使用的icomoo为例，打包下载下来的SVG文件夹如下
![QQ20170324-190940@2x.png](http://upload-images.jianshu.io/upload_images/2115894-824a3d6eeaee61b3.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)

步骤2：脚本处理
每次进app请求多个svg脚本很浪费资源，并且安卓本身就不支持svg静态文件的require，所以我们要处理一下，其中处理svg的脚本如下，我将其与typescript编译集成到了gulp的编译任务中。
```javascript  
var fs = require('fs');
var path = require('path');
const svgDir = path.resolve(__dirname, './svgs');

// 读取单个文件
function readfile(filename) {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(svgDir, filename), 'utf8', function(err, data) {
      console.log(data.replace(/<\?xml.*?\?>|<\!--.*?-->|<!DOCTYPE.*?>/g, ''));
      if (err) reject(err);
      resolve({
        [filename.slice(0, filename.lastIndexOf('.'))]: data,
      });
    });
  });
}

// 读取SVG文件夹下所有svg
function readSvgs() {
  return new Promise((resolve, reject) => {
   fs.readdir(svgDir, function(err, files) {
     if (err) reject(err);
     Promise.all(files.map(filename => readfile(filename)))
      .then(data => resolve(data));
      .catch(err => reject(err));
   });
  });
}

// 生成js文件
readSvgs().then(data => {
  let svgFile = 'export default ' + JSON.stringify(Object.assign.apply(this, data));
  fs.writeFile(path.resolve(__dirname, './svgs.js'), svgFile, function(err) {
    if(err) throw new Error(err);
  });
}).catch(err) {
  throw new Error(err);
};
```
这样生成了一个svgs.js文件。其结构是
```
// svgs.js
export default {
  'svgName1': 'xmlData',
  'svgName2': 'xmlData',
  ...
}
```

步骤3：封装Svg Component
```
// Svg.tsx
import React, { Component } from 'react';
import {
  ViewStyle,
} from 'react-native'
import SvgUri from '../../lib/react-native-svg-uri';
import svgs from '../../assets/svgs';

interface SvgProperties {
  icon: string;
  color: string;
  size: string;
  style?: ViewStyle;
}
export default class Svg extends Component<SvgProperties, void>{
  render() {
    const {
      iocn,
      color,
      size,
      style,
    } = this.props;
    let svgXmlData = svgs[this.props.icon];

    if (!svgXmlData) {
      let err_msg = `没有"${this.props.icon}"这个icon，请下载最新的icomoo并 npm run build-js`;
      throw new Error(err_msg);
    }
    return (
      <SvgUri
        width={size}
        height={size}
        svgXmlData={svgXmlData}
        fill={color}
        style={style}
      />
    )
  }
}

// 使用 js

render() {
  return <Svg icon="ac_unit" size="40" fill="#ccc"/>
}

```
![svg使用](http://upload-images.jianshu.io/upload_images/2115894-651210e8eed1e66a.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)