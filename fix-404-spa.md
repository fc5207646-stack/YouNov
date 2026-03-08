# 修复 younov.com/browse 等页面 404

## 原因
前端是 SPA（单页应用），/browse、/free、/novel/xxx 等路径由前端路由处理。若 Nginx 没有「回退到 index.html」，会直接按路径找文件，找不到就返回 404。

## 在服务器 107.174.174.123 上操作

### 1. SSH 登录
```bash
ssh -i C:\Users\Administrator\.ssh\id_ed25519 root@107.174.174.123
```

### 2. 确认当前 Nginx 配置里 `location /` 的写法
```bash
grep -A2 "location /" /etc/nginx/sites-enabled/* 2>/dev/null || grep -A2 "location /" /etc/nginx/conf.d/* 2>/dev/null
```

必须包含 **`try_files $uri $uri/ /index.html`**，不能只有 `try_files /index.html =404` 或 `try_files $uri =404`。

### 3. 若不正确，编辑站点配置
例如：
```bash
sudo nano /etc/nginx/sites-available/younov
# 或
sudo nano /etc/nginx/conf.d/younov.conf
```

在 `server { ... }` 里找到 `location /`，改为：

```nginx
# 静态资源：先找文件，找不到 404
location ~* \.(?:js|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot)$ {
  try_files $uri =404;
  expires 30d;
  add_header Cache-Control "public, max-age=2592000, immutable";
}

# SPA：其余路径回退到 index.html，/browse、/free 等才能正常打开
location / {
  try_files $uri $uri/ /index.html;
  add_header Cache-Control "no-store, no-cache, must-revalidate";
}
```

并确认该 server 块内有：
```nginx
root /var/www/younov/dist;
```

### 4. 测试并重载 Nginx
```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 5. 验证
浏览器访问 https://younov.com/browse ，应出现书库页面（带侧栏分类），不再是 404。
