import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const leads = await prisma.lead.findMany({
    include: { messages: true }
  });
  console.log(JSON.stringify(leads, null, 2));
}

run();
