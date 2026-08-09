import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  await prisma.whatsappSession.updateMany({
    where: { status: "PENDING" },
    data: { status: "DISCONNECTED" }
  });
  console.log("Sessions disconnected");
}
run();
