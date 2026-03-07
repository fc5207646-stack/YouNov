# 部署前端并只保留当前构建的 JS（彻底避免 D.map/0.map）

## 重要：必须用「干净构建」再上传
若直接用 `npm run build`，Vite 可能用缓存，产物的**文件名**可能仍是 index-Bo0yMqLO.js 但**内容**是旧的（控制台仍显示 "2026-02-13 WORD COUNT FIX"、会报 O.map）。必须先**删掉 dist 再构建**，得到新 hash 和新内容。

---

## 1. 本地干净构建（必做）
```powershell
cd "c:\Users\Administrator\Desktop\网站源码\younov - 副本\work\frontend"
npm run build:clean
```
（会先删除 dist 再执行 build，保证无缓存。）

## 2. 验证构建产物（推荐）
```powershell
npm run verify-build
```
应输出「[通过] index-XXXXX.js 包含新版本: YouNov BUILD 2026-03-13 safeMap FIX」。若失败，说明仍是旧包，再执行一次 build:clean。

## 3. 上传到服务器
```powershell
scp "c:\Users\Administrator\Desktop\网站源码\younov - 副本\work\frontend\dist\index.html" root@107.174.174.123:/var/www/younov/dist/
scp -r "c:\Users\Administrator\Desktop\网站源码\younov - 副本\work\frontend\dist\assets\*" root@107.174.174.123:/var/www/younov/dist/assets/
```

## 4. 在服务器上只保留 index.html 引用的那个 JS
SSH 登录 107.174.174.123 后执行：

```bash
cd /var/www/younov/dist
REF=$(grep -o 'index-[^"]*\.js' index.html)
echo "保留: $REF"
cd assets
for f in index-*.js; do
  if [ "$f" != "$REF" ]; then
    rm -f "$f"
    echo "已删: $f"
  fi
done
ls index-*.js
```

## 5. 验证（必看控制台版本）
- 打开 https://younov.com/novel/the-way-home
- 按 **Ctrl+Shift+R** 强制刷新
- 按 F12 → Console，必须看到：**YouNov BUILD 2026-03-13 safeMap FIX**
- 若仍看到 "2026-02-13" 或 "WORD COUNT FIX"，说明仍加载旧包：本地必须用 **npm run build:clean** 再上传，服务器上只保留 index.html 引用的那个 index-*.js
