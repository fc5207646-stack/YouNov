// prisma/query.js
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
  console.log(user ? user.passwordHash : 'User not found');
}

main().finally(() => prisma.$disconnect());