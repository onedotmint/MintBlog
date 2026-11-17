---
title: Reroute
description: 保留本地编辑，把符合条件的构建与测试任务卸载到远程算力。
repo: https://github.com/onedotmint/Reroute
category: Now
icon: i-ri-route-line
---

Reroute 是一个按需任务卸载器：你在本地继续写代码，把构建和测试交给远程算力跑。

它不是一个远程 IDE，也不做文件同步。它只在本地命令里挑出能识别的构建、测试、检查和基准测试，发到配置好的服务商执行；Git 操作、文件查看、部署和拿不准的命令都不会被自动发出去。

远程任务失败了，它也不会偷偷在本地重跑一遍——那样你会误以为远程环境是通的。

支持用自己的服务器（SSH）、Daytona、Modal 和 E2B。

```bash
pi install npm:@onedotmint/reroute@0.4.1
```
