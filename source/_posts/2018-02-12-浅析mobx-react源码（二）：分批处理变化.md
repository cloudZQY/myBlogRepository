---
title: 浅析mobx-react源码（二）：分批处理变化
date: 2018-02-12 12:47:54
tags: react mobx
---
## 前言
当我们选择使用一个新的工具，一定是他解决了一定的痛点，在上一篇文章中，mobx的自动追踪依赖依赖，帮我们在毫不费力地情况下近乎完美的解决了一个组件对state的依赖，基本可以让shouldComponentUpdate在你的代码里消失。而这次介绍的特性则解决了setState的一些**副作用**。

<!-- more -->

## setState副作用
熟练使用react的同学一定对setState的坑有一定的了解，首先最重要的肯定就是:  
**1. setState是异步的**。
```javascript
console.log(this.state.num); // 1
this.setState({
  num: this.state.num + 1,
});
console.log(this.state.num) // 1
```
这是新手最容易碰到的坑了，react为了达到高效的处理setState引起的重绘，会将一次同步执行的所有setState放到一个队列中，在最后进行合并，并最终只调用一次render。所以在使用setState时，经常需要在第二个参数传入回调来处理改变后的state，这就非常的不优雅。  

**2. setState会造成不必要的渲染**  
当setState改变的state实际上并没有发生改变时，也会触发render。
```javascript
console.log(this.state.num); // 1
this.setState({
  num: 1,
});
// 触发重绘
```
这种逻辑经常夹杂在业务中，在shouldComponentUpdate中很难处理，通常要在setState之前要对改变的state与之前的state进行比较，来控制是否需要setState。

## Mobx特性1：避免多次重绘  
当我们如上篇文章的源码所说，普通地将react的render改造，同样会有多次render的情况。比如在同步线程中多次修改state。
```javascript
class Store {
  @observable
  num = 1;
}
const store = new Store();

reaction(() => store.num, (num) => {
  // 类似render调用
  console.log(num);
})

store.num++; // 2
store.num++; // 3
store.num++; // 4
store.num++; // 5
```
将会多次调用console.log，但实际我们所需要的其实只有最后一次。所以mobx提供了一个方法action，使用action包裹所有的操作。
```javascript
class Store {
  @observable
  num = 1;
}
const store = new Store();

reaction(() => store.num, (num) => {
  console.log(num);
})

action(() => {
  store.num++; // 无反应
  store.num++; // 无反应
  store.num++; // 无反应
  store.num++; // 输出5
})
```
在这种情况下，只有在所有操作结束的时候才会触发console.log。其实原理很简单，在mobx源码`./core/action`里面
```javascript
// ./core/action.ts
function startAction(
    actionName: string,
    fn: Function,
    scope: any,
    args?: IArguments
): IActionRunInfo {
    /// ...
    // untrackedStart控制开始
    const prevDerivation = untrackedStart()
    startBatch()
    const prevAllowStateChanges = allowStateChangesStart(true)
    return {
        prevDerivation,
        prevAllowStateChanges,
        notifySpy,
        startTime
    }
}
function endAction(runInfo: IActionRunInfo) {
    allowStateChangesEnd(runInfo.prevAllowStateChanges)
    endBatch()
    // untrackedEnd控制结束
    untrackedEnd(runInfo.prevDerivation)
    if (runInfo.notifySpy) spyReportEnd({ time: Date.now() - runInfo.startTime })
}
export function executeAction(actionName: string, fn: Function, scope?: any, args?: IArguments) {
    // 开始执行action
    const runInfo = startAction(actionName, fn, scope, args)
    try {
        // 执行action传入的回调
        return fn.apply(scope, args)
    } finally {
        // 结束action
        endAction(runInfo)
    }
}
```
通过untrackedStart和untrackedEnd表示开始和结束分别在传入action的回调执行前后
```javascript
// ./core/derivation.ts
export function untrackedStart(): IDerivation | null {
    const prev = globalState.trackingDerivation
    globalState.trackingDerivation = null
    return prev
}

export function untrackedEnd(prev: IDerivation | null) {
    globalState.trackingDerivation = prev
}
```
untrackedStart和untrackedEnd控制一个全局的变量trackingDerivation。然后在需要执行的地方，只有在trackingDerivation的时候才触发。  
根据上面的特性，我们在使用mobx-react的时候，只需要将所有直接改变state的方法用action包裹就行了。**但是**真实情况并不是这样，其实不使用action，也能达到同样的效果。因为在mobx-react中，已经对此做过处理，我们来看看源码。
```javascript
// mobx-react ./src/index.js
import { extras, spy } from "mobx"
import { Component } from "react"
import { unstable_batchedUpdates as rdBatched } from "react-dom"
import { unstable_batchedUpdates as rnBatched } from "react-native"

if (!Component) throw new Error("mobx-react requires React to be available")
if (!extras) throw new Error("mobx-react requires mobx to be available")

// 将reactionScheduler和react-dom的batchedUpdates绑定
// 当mobx运行runReactions的时候都会执行batchedUpdates
// batchedUpdates会控制isBatchingUpdates变量，来阻止react-dom的render，直到执行结束。
if (typeof rdBatched === "function") extras.setReactionScheduler(rdBatched)
else if (typeof rnBatched === "function") extras.setReactionScheduler(rnBatched)
```
```javascript
// mobx
function setReactionScheduler(fn) {
    var baseScheduler = reactionScheduler;
    reactionScheduler = function (f) { return fn(function () { return baseScheduler(f); }); };
}
function runReactions() {
    // Trampolining, if runReactions are already running, new reactions will be picked up
    if (globalState.inBatch > 0 || globalState.isRunningReactions)
        return;
    reactionScheduler(runReactionsHelper);
}
```
``` javascript
// react-dom
function batchedUpdates(fn, a) {
var previousIsBatchingUpdates = isBatchingUpdates;
isBatchingUpdates = true;
try {
    return fn(a);
} finally {
    isBatchingUpdates = previousIsBatchingUpdates;
    if (!isBatchingUpdates && !isRendering) {
    performWork(Sync, null);
    }
}
}
```
因此在使用mobx-react，多次改变state的时候，只会在最后render一次，而在执行中，store的state已经改变，可以直接取到，不用像state一样使用回调。但是在实际使用中还是建议使用action来包裹，因为这样会便于使用mobx的调试工具调试。

## Mobx特性2：值未改变时不触发autorun
由于mobx的特性，在改变state时比较新值和旧值来避免触发reaction就比较简单了。
```javascript
class Store {
  @observable num = 1;
  @observable checkbox = {
      checked: true,
  }
}

var store = new Store();
autorun(() => {
  console.log(store.num);
  console.log(stroe.checkbox.checked);
})
store.num = 1; // 不触发autorun
store.checkbox.checked = true; // 不触发autorun
```
利用这个特性也可以避免react的一些不必要的重绘，优化性能。

## 总结
在使用mobx之后，我们基本可以抛弃react的setState。这样不仅集成了setState的优点：在一个同步线程中只执行一次render。而且还能避免setState的异步改变state等缺点。