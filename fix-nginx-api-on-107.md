# 在 107 上启用 /api 反代

当前 `/etc/nginx/sites-enabled/younov` 里把 `/api/` 的 location 整段注释掉了，需要改成启用并指到 API 后端。

---

## 步骤 1：看完整配置

在 107 上执行：

```bash
cat /etc/nginx/sites-enabled/younov
```

确认里面是否有 `upstream` 和 `location /api/`，以及是否被注释。

---

## 步骤 2：在 server 里加上游并启用 /api

在 **server { ... }** 里（且要在 `location /` 之前）加上或替换成下面两段。

**2.1 在 http 或 server 外层的顶层加 upstream（若还没有）：**

在 `server {` 之前、`http {` 或最外层写：

```nginx
upstream younov_api {
    server 10.50.0.2:8080;
    server 10.50.0.3:8080;
    keepalive 32;
}
```

**2.2 在 server 里启用 location /api/（删掉原来的 # 注释，或新增）：**

```nginx
location /api/ {
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Connection "";
    proxy_pass http://younov_api;
}
```

注意：若你用的 upstream 名字是 `api_upstream`，上面就写 `proxy_pass http://api_upstream;`，保持一致即可。

---

## 步骤 3：测试并重载

```bash
nginx -t
systemctl reload nginx
```

---

## 步骤 4：再测接口

```bash
curl -s "https://younov.com/api/novels?take=5"
```

若仍为 `"items":[]`，说明反代已生效，但**两台 API 背后的数据库里没有小说**。需要在其中一台 API 上执行 `npm run seed` 或导入 38 本数据，并确保该 API 的 `DATABASE_URL` 指向有数据的库。

若你暂时只让一台 API 有数据，可先把 upstream 改成单台，例如：

```nginx
upstream younov_api {
    server 10.50.0.2:8080;
    keepalive 32;
}
```

等 10.50.0.2 里有数据后，再改回两台。
