---
title: Siftpath
description: 给 AI Agent 统一的网页搜索与阅读入口。
repo: https://github.com/onedotmint/Siftpath
category: Now
icon: i-ri-search-eye-line
---

Siftpath 给编码 Agent 两个工具：`web_search` 和 `web_read`。

背后接的是五家服务商的官方 MCP：Brave、Exa、Tavily、Jina、Firecrawl。它是一个路由器，不是搜索引擎——把两个固定的输入映射成某家服务商的原生调用，返回官方结果和来源链接；某一家失败时，按配置顺序换下一家。

没有 LLM，没有爬虫框架，没有重排，没有数据库，也没有常驻进程。

```bash
pi install npm:@onedotmint/siftpath
```

装完重启 Pi，运行 `/siftpath` 走一遍快速配置，选搜索服务和阅读服务、粘贴 Key，就可以让模型直接搜索了。
