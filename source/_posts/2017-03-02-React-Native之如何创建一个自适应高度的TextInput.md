---
title: React-Native之如何创建一个自适应高度的TextInput
date: 2017-03-02 21:36:28
tags: react-native
categories: 笔记
---
自适应高度的多行文本输入框AutoTextInput是一种常用需求，在RN官方文档上就有其demo
```js
class AutoExpandingTextInput extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      text: 'React Native enables you to build world-class application experiences on native platforms using a consistent developer experience based on JavaScript and React. The focus of React Native is on developer efficiency across all the platforms you care about — learn once, write anywhere. Facebook uses React Native in multiple production apps and will continue investing in React Native.',
      height: 0,
    };
  }
  render() {
    return (
      <TextInput
        {...this.props}
        multiline={true}
        onContentSizeChange={(event) => {
          this.setState({height: event.nativeEvent.contentSize.height});
        }}
        onChangeText={(text) => {
          this.setState({text});
        }}
        style={[styles.default, {height: Math.max(35, this.state.height)}]}
        value={this.state.text}
      />
    );
  }
}
```
利用onContentSizeChange，在就在内容内容布局改变（如换行）的时候能获取到当前contentSize中的高度，然后通过state调整其input的高度。
原理很简单，但是这种写法在Android上却是有bug的，onContentSizeChange这个方法在Android上仅会初始render的的时候触发一次，其后就不会在触发了。目前我的RN版本为0.41.0，而Android试验了6.0和7.0。在github上也有相应的[#issue6552](https://github.com/facebook/react-native/issues/6552)，于RN版本0.33就有了，预计以后是会解决的。
但是我们现在该如何避免这个bug呢，这时候需要利用另一个事件onChange，也是能取到contentSize的。不过onChange也有一个缺点，他在非用户输入的情况是不会触发的，也就是说我在TextInput带有初始的defaultValue时，无法改变组件的高度，会造成看不见的情况。这里要结合这两种事件来解决。
顺便再添加minHeight和maxHeight的一个完整的AutoTextInput如下
<!-- more -->
```js
export default class AutoTextInput extends Component {
  constructor(props) {
    super(props);
    this.onContentSizeChange = this.onContentSizeChange.bind(this);
    this.onChange = this.onChange.bind(this);
    this.state = {
      height: 0,
    };
  }

  onContentSizeChange(event) {
    let height = event.nativeEvent.contentSize.height;
    this.changeHeight(height);
  }

  onChange(event) {
    if (Platform.OS === 'android') {
      let height = event.nativeEvent.contentSize.height;
      this.changeHeight(height);
    }
  }

  changeHeight(height) {
    let {
      minHeight = 16,
      maxHeight,
    } = this.props;
    if (height < minHeight) {
      height = minHeight;
    } else if (maxHeight && height > maxHeight) {
      height = maxHeight;
    }
    if (height !== this.state.height) {
      this.setState({height: height});
    }
  }

  render() {
    return (
      <TextInput
        {...this.props}
        multiline
        onContentSizeChange={this.onContentSizeChange}
        onChange={this.onChange}
        style={[this.props.style, {height: this.state.height}]}
      />
    )
  }
}
```