---
title: 浅析mobx-react源码（一）：自动追踪依赖
date: 2018-01-29 15:17:46
tags: react
---
## 前言
使用一种工具就像使用一个包装好的黑盒子，我们不必探究其内部到底是如何实现，只需要能够将用法了然于胸，什么样的输入会得到什么样的输出能有完美的预测。但不幸的事，大部分文档都难以让自己达到这点，为此我们不得不浅析一下源码，来探寻他是如何实现的，避免出现意料之外的情况导致bug，也防止做出多余的操作，精简代码，减少bug。

## 自动追踪依赖
在使用redux的时候，我们不得不使用connect来从store中取到当前组件所需要的state，这其实也是一个依赖分析的问题，只有当组件所依赖的state变化时，当前组件才会更新，避免了不必要的render。而在使用mobx时，这一步被自动完成了，因此在使用mobx时，会感到极其酸爽舒适，只需要一个@observer就能尽情地使用store中的state了，而且完全不用担心性能问题，那么这究竟是如何做到的？  
<!-- more -->

## 了解mobx机制
在探究mobx-react的源码之前，得先了解一下mobx。  
```javascript
import { Reaction, observable } from 'mobx';
const obj = observable({ num: 0 });
const reaction = new Reaction('reaction name', function () {
  this.track(() => {
    console.log('track num++', obj.num);
  });
});
reaction.track(() => {
  console.log('reaction init', obj.num);
});
// 输出 reaction init 0

obj.num++; // 输出 track num++ 1
obj.num++; // 输出 track num++ 2
```
mobx在observable改造了`{ num: 0 }`这个对象为可观察对象，当取obj的属性num时，能会执行其内部的方法。  
reaction的track方法传进去的回调中，执行`console.log('reaction init', obj.num)`时，get到了obj.num值，这时mobx会将这个属性作为依赖与此reaction绑定，当obj.num变化时，就会执行实例化reaction时传进去进去的回调
```javascript
function () {
  this.track(() => {
    console.log('track num++', obj.num);
  });
}
```
这时会输出track num++ 1，并从新确定依赖关系。接下来看下一个例子
```javascript
import { Reaction, observable } from 'mobx';
const obj = observable({ num: 0, letter: 'a', bool: true });
const callback = function () {
  if (obj.bool) {
    console.log(obj.num);
  } else {
    console.log(obj.letter);
  }
};
const reaction = new Reaction('reaction name', function () {
  this.track(callback);
});
reaction.track(callback); // 第一次track，分析到依赖[obj.bool, obj.num]，输出 0
obj.num++; // 第二次track，分析到依赖依然是[obj.bool, obj.num]，输出 1
obj.letter = 'b'; // obj.letter不在依赖中，不执行this.track(callback)
obj.bool = false; // obj.bool在依赖中，执行this.track(callback);重新分析依赖[obj.bool, obj.letter] 输出 b
obj.num++; // 此时obj.num不在依赖中，不输出任何值
obj.letter = 'c'; // 此时obj.letter在依赖中，输出 c
```
由此可见，mobx可以在每次执行时会分析依赖，并且将在callback中，却并不执行的属性排除在依赖外，减少了callback。  
看到这里，我们应该能想到，只要将callback当成react的render，就能完美地解决对react的对接，并且比使用redux的时候性能更好！因为使用redux的时候将依赖num，letter，bool三个属性，无论哪个改变都讲触发组件的render，除非根据业务逻辑写上复杂的componentShouldUpdate，而使用mobx时，只要其中某个state的改变不影响view的改变时，这个state的变化就不会引起组件render，达到更细粒度上对render的控制，近乎完美地排除不需要的render。  
## mobx-react源码片段探究
那么接下来看一看mobx-react的源码是如何实现的  
```javascript
// 使用mobx-react
import React, { Component} from 'react';
import { observer } from 'mobx-react';
@observer
export default MyCom extends Component {
  render() {
    // ...do something
  }
}
```
```javascript
// mobx-react的源码片段
// ...
const baseRender = this.render.bind(this) // 组件自己的render就是baseRender
let reaction = null
let isRenderingPending = false
// 定义initialRender，用来代替组件第一次render
const initialRender = () => {
  reaction = new Reaction(`${initialName}#${rootNodeID}.render()`, () => {
      if (!isRenderingPending) {
          // 防止在constructor中修改store触发引起的副作用（此时还没有初始render）
          isRenderingPending = true

          // 触发mobx-react添加的一个生命周期
          if (typeof this.componentWillReact === "function") this.componentWillReact() 

          // 防止componentWillRect引起的副作用
          if (this.__$mobxIsUnmounted !== true) {
              let hasError = true
              try {
                  isForcingUpdate = true
                  // skipRender是用来防止死循环，这里不用管
                  // 当依赖的state有变化是会使用forceUpdate强制render
                  // 并解析新的依赖
                  if (!skipRender) Component.prototype.forceUpdate.call(this)
                  hasError = false
              } finally {
                  isForcingUpdate = false
                  if (hasError) reaction.dispose()
              }
          }
      }
  })
  reaction.reactComponent = this
  reactiveRender.$mobx = reaction
  // 用reactRender替代render
  this.render = reactiveRender
  // 执行reactiveRender
  return reactiveRender()
}

const reactiveRender = () => {
  isRenderingPending = false
  let exception = undefined
  let rendering = undefined
  reaction.track(() => {
      if (isDevtoolsEnabled) {
          this.__$mobRenderStart = Date.now()
      }
      try {
          // 允许state改变，然后执行baseRedner，这里将解析一次render中对state属性的依赖
          rendering = extras.allowStateChanges(false, baseRender)
      } catch (e) {
          exception = e
      }
      if (isDevtoolsEnabled) {
          this.__$mobRenderEnd = Date.now()
      }
  })
  if (exception) {
      errorsReporter.emit(exception)
      throw exception
  }
  return rendering
}
// ...
```
这样就达到了用mobx控制react组件的render。

##  结论
对这一段代码我们可以知道，仅仅在组件上加一行@observer然后使用mobx的可观察属性进行render控制view，就能达到性能的高效化，对单个state属性的粒度上控制组件的render，所以放心大胆地用mobx来管理应用的state吧！

下一篇 分批处理变化
