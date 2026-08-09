import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: "postgresql://crm:crm_password@10.0.1.253:5432/crm_ia?schema=public" });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function run() {
  const user = await prisma.user.findUnique({
    where: { email: "admin@inmobiliarialuna.com" }
  });
  console.log("User:", user?.email);
  if (user) {
    const isValid = await bcrypt.compare("admin123", user.passwordHash);
    console.log("Password valid:", isValid);
  }
}
run();
