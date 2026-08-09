import prisma from "./src/lib/prisma";

async function run() {
  await prisma.whatsappSession.updateMany({
    where: { status: { in: ["PENDING", "CONNECTED"] } },
    data: { status: "DISCONNECTED", openwaSessionName: null }
  });
  console.log("Sessions disconnected");
}
run();
