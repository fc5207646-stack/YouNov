#!/usr/bin/env node
/**
 * 使用本机 API 的 DATABASE_URL 查询小说是否存在（用于排查详情页 404）。
 * 在 API 服务器（10.50.0.2 或 10.50.0.3）的 API 目录执行：node scripts/check-novel-in-db.js
 * 会读取同目录上级的 .env（或当前目录 .env）。
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const slug = process.argv[2] || 'nifeng-fanpan';
const prisma = new PrismaClient();

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('未设置 DATABASE_URL');
    process.exit(1);
  }
  // 只打印 host，不打印密码
  const match = dbUrl.match(/@([^/]+)\//);
  console.log('当前 DATABASE_URL 指向:', match ? match[1] : '(无法解析)');
  console.log('查询 slug:', slug);
  const novel = await prisma.novel.findUnique({
    where: { slug },
    select: { id: true, slug: true, title: true, isPublished: true }
  });
  if (novel) {
    console.log('结果: 存在', JSON.stringify(novel, null, 2));
  } else {
    console.log('结果: 不存在');
  }
  const count = await prisma.novel.count();
  console.log('全站小说总数:', count);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
