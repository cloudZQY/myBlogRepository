---
title: mobx踩坑：Observer组件
date: 2018-02-05 14:31:14
tags: mobx 踩坑
---
在使用mobx的时候遇到不触发更新的情况，通常都是对mobx的可观测对象理解有误。不过mobx的文档的确不错，把常用的坑都列出来了。
```javascript
  import React, { Component } from 'react';
  import { observer, Observable } from 'mobx-react';
  @observer MyCom extends Component {
    render() {
      return (
        <Wrap
          Com1={<input value={store.value} />} // 这种使用方法没有问题
          Com2={() => <input value={store.value} />} // 在Warp没有@observer的情况下，这种使用方法将不会触发更新，因为input已经处于Wrap的组件内，而Wrap并没有被observer
          Com3={() => <Observable>{() => <input value={store.value}>}</Observable>} // 上面的情况需要使用这种
        />
      )
    }
  }
```
