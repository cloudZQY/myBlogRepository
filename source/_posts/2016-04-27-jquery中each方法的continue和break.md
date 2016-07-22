---
title: jquery中each方法的continue和break
date: 2016-04-27 23:51:23
tags: jquery
categories: 备忘
---
类似于for循环的continue和break,jquery的$.each()也有相应的方式。  
```javascript  
$.each(arr,function(index,obj){
    return true;//相当于break
});
$.each(arr,function(index,obj){
    return false;//相当于continue
})
```