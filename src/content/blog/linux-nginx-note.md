---
title: 'Linux 与 Nginx 部署笔记'
description: '一份用 Nginx 托管 Astro 静态构建产物的部署笔记。'
tags: [Linux, Nginx, Deploy, Systems]
pubDate: 2026-05-15
minutesRead: 4
lastModDate: ''
ogImage: false
toc: true
share: false
giscus: false
search: false
---

这篇笔记只保留一条明确的部署路径：构建一次，托管生成文件，不让 Web 服务器参与应用逻辑。

### 检查清单

1. 构建前先跑内容同步。
2. 通过 SSH 或 rsync 把 `dist/` 复制到服务器。
3. 让 Nginx 直接托管静态文件。

可复用清单放在这里：

- [服务器清单](/files/server-checklist.txt)

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/blog/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

这种配置能让运行时边界保持很小，也让重新构建更可预测。
