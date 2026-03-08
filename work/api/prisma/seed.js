// prisma/seed.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 添加测试管理员用户
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: { passwordHash: await bcrypt.hash('admin123', 10) },
    create: {
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      displayName: 'Admin',
      role: 'ADMIN',
    },
  });

  // 添加或更新测试小说
  const novel = await prisma.novel.upsert({
    where: { slug: 'test-novel' },
    update: {},
    create: {
      slug: 'test-novel',
      title: '测试小说',
      authorName: '测试作者',
      description: '这是一个测试小说描述。',
      tags: JSON.stringify(['fantasy', 'adventure']), // 由于临时改为String
      category: 'Fantasy',
      coverUrl: '/uploads/test-cover.jpg', // 假设静态资源路径
    },
  });

  // 添加或更新测试章节
  await prisma.chapter.upsert({
    where: { novelId_orderIndex: { novelId: novel.id, orderIndex: 1 } },
    update: {},
    create: {
      novelId: novel.id,
      orderIndex: 1,
      title: '第一章',
      content: '这是测试章节的文字内容，包含一些小说正文。字数计算基于LENGTH(content)。',
      wordCount: 50, // 临时值
      isFree: true,
    },
  });

  console.log('测试数据添加成功');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
