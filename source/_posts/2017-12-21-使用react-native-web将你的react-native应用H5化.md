---
title: 使用react-native-web将你的react-native应用H5化
date: 2017-12-21 18:28:00
tags: react-ntaive
---
## Write one, run everywhere
“Learn once, write anywhere”是react提出的口号，在react-native开源后，这个口号得到了实现，我们只需要学会react，就能同时在web端，安卓和ios开发应用。但是，react-native在安卓和ios端能达到百分之九十以上的代码复用，却不能运行在移动H5端，我们不得不另外开发一套H5代码，以使应用能在手机浏览器上使用。[react-native-web](https://github.com/necolas/react-native-web)就是这样一个将react-native应用转换成H5的库，以让我们能达到“Write one, run everywhere”。 

react-native-web仓库： https://github.com/necolas/react-native-web
代码示例: https://github.com/cloudZQY/rnweb
### 1.实现原理
在写代码之前，我们浅析一下这个库的实现。在我们的`react-native`代码中，所有的控件都是import自`react-native`
```
import { View, Text, TextInput } from 'react-native';
```
那如果我们把这些组件全部在web上重新实现一遍，就能使其运行在web端了，用div代替View，用input代替TextInput，用img代替Image，再加上相应的默认样式，这样我们写的RN代码就能平滑地迁移到web端，并且能在样式上基本保持一致性。`react-native-web`就是这样一个库，他`react-native`的大部分组件都用web实现了一遍以达到我们的代码能在web运行的要求。
<!-- more -->
### 2.代码实现
在我们实现web端运行时，要尽量做到不侵入RN代码，不影响RN代码的逻辑，争取能够在基本不动RN项目代码的情况下，将其H5化。  
这里我们先开始一个简单的demo，首先使用react-native-cli初始化一个项目。
```shell
$ sudo npm i -g react-native-cli
$ react-native init rnweb
```
然后就可以编译原生Android或ios项目，使用模拟器打开了。而在web端我们需要使用webpack来编译运行代码，现在编写一个普通的react项目的webpack.config.js文件，与普通的web端webpack配置基本一致，唯一不同的是我们需要在resolve中加两项
```json
{
    resolve: {
        alias: { 'react-native': 'react-native-web' },
        modules: ['web_modules', 'node_modules'],
    },
}
```
其中alias的别名使RN代码中import自`react-native`的组件指向了`react-native-web`。modules是为了在某些依赖于`react-native`的第三方库无法直接转换成H5时，我们可以自行进行编写。
然后就可以运行`npm run web`打开网页了，
```js
import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  View
} from 'react-native';

const instructions = Platform.select({
  ios: 'Press Cmd+R to reload,\n' +
    'Cmd+D or shake for dev menu',
  android: 'Double tap R on your keyboard to reload,\n' +
    'Shake or press menu button for dev menu',
  web: 'Press Cmd+R or F12 reload'
});

export default class App extends Component {
  render() {
    return (
      <View style={styles.container}>
        <Text style={styles.welcome}>
          Welcome to React Native!
        </Text>
        <Text style={styles.instructions}>
          To get started, edit App.js
        </Text>
        <Text style={styles.instructions}>
          {instructions}
        </Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
});
```
如上同一段代码，在ios，h5和安卓的效果图如下
![效果图](http://upload-images.jianshu.io/upload_images/2115894-71c3463cd3b2fdf5.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
具体代码在[demo01](https://github.com/cloudZQY/rnweb/blob/master/src/demo01/index.js)
3.使用组件
在上面这段代码中我们使用Platform,StyleSheet,Text,View组件，`react-native-web`帮我们实现了许多组件，但该项目仍在发展中，有许多组件还未实现，官方文档的components不太详尽，具体可以看github上代码src/module文件以及src/components文件夹，目前常用的一些组件都已实现
- View
- Text
- ScrollVIew
- ListView
- Image
- Button
- Switch
等等
需要注意的是FlatList还没有实现，我们需要使用ListView来写列表。
接下来使用ListView和Image等常用组件实现一个简单的下拉列表
```
/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 * @flow
 */

import React, { Component } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  ListView,
  Image,
  Dimensions,
  View
} from 'react-native';

// 屏幕长宽
const screenW = Dimensions.get('window').width; 
const screenH = Dimensions.get('window').height; 
// iPhoneX 
const X_WIDTH = 375; 
const X_HEIGHT = 812;

/**
 * 判断iphoneX
 */
function isIphoneX() {
  return Platform.OS === 'ios' &&
  (
    (screenH === X_HEIGHT && screenW === X_WIDTH) ||
    (screenH === X_WIDTH && screenW === X_HEIGHT)
  ) 
}

const containerTop = Platform.select({
  ios: isIphoneX() ? 44 : 20,
  android: 20,
  web: 0,
})
const containerBottom = Platform.select({
  ios: isIphoneX() ? 34 : 0,
  android: 0,
  web: 0,
})

const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => r1 !== r2});

export default class App extends Component {
  state = {
    list: ds.cloneWithRows(new Array(20).fill({
      name: '炒鸡好吃的甜甜圈',
      source: require('../../assets/img_01.png'),
      spec: '25g',
      price: '￥4.4',
    },))
  }
  render() {
    return (
      <View style={styles.container}>
        <ListView
          style={{flex: 1}}
          dataSource={this.state.list}    
          renderRow={(rowData) => (
            <View style={styles.listItem}>
              <Image style={styles.img} source={rowData.source}/>
              <View style={styles.introduction}>
                <Text style={styles.name}>
                  {rowData.name}
                </Text>
                <Text style={styles.spec}>
                  {`规格：${rowData.spec}`}
                </Text>
                <Text style={styles.price}>
                  {rowData.price}
                </Text>
              </View>
              <View style={styles.add}>
                <Text style={styles.addIcon}>+</Text>
              </View>
            </View>
          )}
        />
      </View>
    );
  }
}
// style 省略 ......
```
效果图如下
![效果图](http://upload-images.jianshu.io/upload_images/2115894-2556a49e2c0c2702.png?imageMogr2/auto-orient/strip%7CimageView2/2/w/1240)
具体代码在[demo02](https://github.com/cloudZQY/rnweb/blob/master/src/demo02/index.js)

### 结论
目前公司的react-native项目H5化还在进行中，在使用中发现在样式方面遇到的问题比较少，需要对各端进行异化的地方也不多，主要的坑都集中在第三方库不兼容，移动端原生方法调用，路由解决方案等方面。在新项目开发时如果注意好，进行三端同步开发可以大大提高效率。接下来会对以上几个点进行记录。
