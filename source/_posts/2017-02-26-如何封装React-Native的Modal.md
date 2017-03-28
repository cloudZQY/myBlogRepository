---
title: 如何封装React-Native的Modal
date: 2017-02-26 12:22:11
tags: react-native
categories: 笔记
---
React-Native中的Modal组件可以用来覆盖包含React Native根视图的原生视图，是RN经常需要用到的一个组件，其使用的方式却很难受。
```javascript
  class Demo extends Component {
    static state = {
      visible: false,
    }

    render() {
      <View>
        <Model
          visible={this.state.visible}
          onRequestClose={() => {}}
        />
      </View>
    }
  }
```
如果使用RN初始的Modal组件，每次使用Modal都需要在View里面插入一个Modal，还得根据state来控制Modal的呈现，调用很繁琐。而一个页面可能有多个Modal组件，会使代码非常的乱。
而对于前端来说，调用一个这样的控件，我们最习惯的方式则是`Dialog.show()`。如果最方便的实现这种调用Modal的方式呢？这里我推荐使用Decorator修饰器来包装Component达到我们的需求。
<!-- more -->
##在RN种引入Decorator
因为Decorator是ES7的一个提案，所以RN并没有默认支持这个功能，我们需要为他添加一些配置。首先将依赖的babel plugin包装进去
```
npm i --save-dev babel-plugin-transform-decorators-legacy
```
然后在.babelrc中添加相应的plugin。 
```js
{
"presets": ["react-native"],
"plugins": ["transform-decorators-legacy"]
}
```
这样我们就能在RN中使用Decorator了。
##创建一个withModal的Decorator
通过Decorator来实现我们需要的功能，我的思路是将所需要调用Modal的Component父级包一层View，然后在Component同级render一个Modal。使用Modal的方式为`this.props.showModal('modalName', params).then(data => {})`，具体实现代码如下。
```js
// withModal.js
import React, { Component } from 'react';
import {
  View,
  Modal,
} from 'react-native'
import InputModal from './InputModal'; // 封装的子Modal

const Modals = {
  'InputModal': InputModal,
};

export default function withModal(Component) {
  return class ModalComponent extends Component {
    constructor(props) {
      super(props);
      this.state = {
        visible: false, // Modal的visible
        renderedModal: null, // Modal所渲染
      };
      this.showModal = this.showModal.bind(this);
      this.hideModal = this.hideModal.bind(this);
    }
    
    // 隐藏Modal
    hideModal(value) {
      this.setState({
        visible: false,
      });
      this.resolve(value);
    }
    
    // 显示Model
    showModal(modalName, params) {
      this.setState({
        visible: true,
        RenderedModal: Modals[modalName],
        params,
      });
      // return一个promise对象
      return new Promise((resolve, reject) => {
        this.resolve = resolve;
      })
    }

    render() {
      const {
        visible,
        RenderedModal,
        params,
      } = this.state;
      return (
        <View>
          <Component
            {...this.props}
            showModal={this.showModal} // 将showModal方法传入组件的props
          />
          <Modal
            animationType="slide"
            visible={visible}
            onRequestClose={() => {}}            
          >
            {RenderedModal ? <RenderedModal
              {...params}
              hideModal={this.hideModal} // 将hideModal方法传入子控件
            /> : null}
          </Modal>
        </View>
      )
    }    
  }
}
```
这里我们还需要一个简单Input子控件
```js
// InputModal.js
import React, { Component } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';

export default class InputModal extends Component {
  constructor(props) {
    super(props);
    this.onSubmit = this.onSubmit.bind(this);
  }

  onSubmit() {
    this.props.hideModal(this.value); // 关闭Modal并将值导出
  }

  render() {
    const {
      placeholder,
      defaultValue,
    } = this.props;
    return (
      <View>
        <TextInput
          onChangeText={value => {this.value = value}}
          placeholder={placeholder || ''}
          defaultValue={defaultValue || ''}
        />
        <TouchableOpacity onPress={this.onSubmit}>
          <Text>确定</Text>
        </TouchableOpacity>
      </View>
    )
  }
}
```
##使用withModal修饰器
在withModal写好后，我们只需要在组件类上使用这个修饰器就可以在props。
需要注意的是，这种封装方式，会使原组件多一层父级View，很可能会影响到样式呈现，所以推荐只在page页的最顶层Component使用这个修饰器，然后通过prop将方法传给子组件，这样能对样式的影响降低。现在我们来对一个简单的Component使用withModal。
```js
import React, { Component } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
} from 'react-native';
import withModal from './withModal';

// 只要使用这个Decorator，就能在组件的props中得到一个showModal方法
@withModal
class HomePage extends Component {
  constructor(props) {
    super(props);
    this.showInputModal = this.showInputModal.bind(this);
    this.state = {
      text: '',
    }
  }

  showInputModal() {
    // 需要使用的Modal是InputModal，然后将需要给传给modla的props对象作为参数传下去，并且接收返回值
    this.props.showModal('InputModal', {
      placeholder: '请填写内容',
      defaultValue: this.state.text,
    }).then(value => {
      this.setState({
        text: value,
      })
    })
  }

  render() {
    return (
      <View>
        <TouchableOpacity onPress={this.showInputModal}>
          <Text>弹出model</Text>
          <Text>{this.state.text}</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
```
简单的效果如下
![效果图](http://upload-images.jianshu.io/upload_images/2115894-ad27d6e4ba901695.gif?imageMogr2/auto-orient/strip)

在这个demo中我使用的是一个固定的InputModal，当然通过改造也能传入Jsx来达到想要的效果。
这是我在使用RN过程中觉得比较便利的方式方式，如果你有更好的想法，欢迎来讨论。