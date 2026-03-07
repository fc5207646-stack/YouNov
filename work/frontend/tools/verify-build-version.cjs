#!/usr/bin/env node
/**
 * 验证 dist 里的 JS 是否包含新版本字符串，确认不是旧缓存。
 * 用法: node tools/verify-build-version.cjs
 */
const fs = require('fs');
const path = require('path');

const distAssets = path.join(__dirname, '..', 'dist', 'assets');
const expected = 'YouNov BUILD 2026-03-13 safeMap FIX';
const oldMarker = 'WORD COUNT FIX';

if (!fs.existsSync(distAssets)) {
  console.error('dist/assets 不存在，请先执行 npm run build');
  process.exit(1);
}

const files = fs.readdirSync(distAssets).filter((f) => f.startsWith('index-') && f.endsWith('.js'));
if (files.length === 0) {
  console.error('dist/assets 下没有 index-*.js');
  process.exit(1);
}

let found = false;
for (const file of files) {
  const content = fs.readFileSync(path.join(distAssets, file), 'utf8');
  if (content.includes(oldMarker)) {
    console.error(`[失败] ${file} 仍包含旧版本 "${oldMarker}"，请执行 npm run build:clean 后重新上传`);
    process.exit(1);
  }
  if (content.includes(expected)) {
    console.log(`[通过] ${file} 包含新版本: ${expected}`);
    found = true;
  }
}

if (!found) {
  console.error('[失败] 未找到新版本字符串，请执行 npm run build:clean 后重试');
  process.exit(1);
}
console.log('构建产物验证通过，可以上传到服务器。');
process.exit(0);
