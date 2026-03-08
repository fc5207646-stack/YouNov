/**
 * 重置管理员账号密码（用于线上忘记密码或首次创建）
 * 在 API 目录执行：node scripts/reset-admin.js
 * 默认账号：admin@example.com  密码：admin123
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const EMAIL = 'admin@example.com';
const PASSWORD = 'admin123';

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash: hash, role: 'ADMIN' },
    create: {
      email: EMAIL,
      passwordHash: hash,
      displayName: 'Admin',
      role: 'ADMIN',
    },
  });
  console.log('Admin account updated:');
  console.log('  Email:', EMAIL);
  console.log('  Password:', PASSWORD);
  console.log('  Role: ADMIN');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
