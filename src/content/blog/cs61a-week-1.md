---
title: 'CS61A 第一周学习记录'
description: '关于函数、递归，以及如何把例子控制到能手动推演的范围。'
tags: [CS61A, Python, Learning]
pubDate: 2026-05-22
minutesRead: 5
lastModDate: ''
ogImage: false
toc: true
share: false
giscus: false
search: false
---

第一周反复出现的一条规则是：函数要小，边界要清楚。

![CS61A 第一周学习卡片](/images/blog/cs61a-week-1.svg)

### 需要盯住什么

1. 函数名要说清楚值的含义。
2. 参数规模要小到能手动检查。
3. 递归步骤只有在基线条件足够明显时才好理解。

```python
def square(x):
    return x * x

def sum_of_squares(a, b):
    return square(a) + square(b)
```

这段代码本身很普通。重点不是写法，而是不要把问题的形状藏起来。
