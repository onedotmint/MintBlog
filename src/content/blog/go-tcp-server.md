---
title: 'Go TCP 服务器草图'
description: '用一个很小的 TCP 服务器观察连接处理、日志和关闭路径。'
tags: [Go, Networking, Systems]
pubDate: 2026-05-19
lastModDate: 2026-05-21
minutesRead: 6
ogImage: false
toc: true
share: false
giscus: false
search: false
---

这份草图刻意保持很小。目标是看清连接从哪里开始，到哪里结束，中间记录了什么日志。

![一个简单的服务器示意图](/images/projects/tcp-server.svg)

### 循环的形状

```go
ln, err := net.Listen("tcp", ":8080")
if err != nil {
    log.Fatal(err)
}
defer ln.Close()

for {
    conn, err := ln.Accept()
    if err != nil {
        continue
    }
    go handle(conn)
}
```

这个结构最好的一点就是无聊。越无聊，越容易检查关闭、重试和错误路径。

### 我会观察什么

- `Accept` 错误
- goroutine 数量
- 连接生命周期
- 能解释失败原因的日志，而不只是记录“失败了”
