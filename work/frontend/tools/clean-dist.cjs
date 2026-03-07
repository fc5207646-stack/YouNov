const fs = require('fs');
const path = require('path');
const dist = path.join(__dirname, '..', 'dist');
if (fs.existsSync(dist)) {
  fs.rmSync(dist, { recursive: true });
  console.log('已删除 dist 目录，将重新构建');
}
