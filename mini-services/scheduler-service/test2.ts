import { PrismaClient } from ".prisma/client";
const db = new PrismaClient();
console.log("Prisma client created successfully");
db.$disconnect();
