import { PrismaClient } from "/home/z/my-project/node_modules/@prisma/client";
const db = new PrismaClient();
console.log("Prisma client created successfully");
db.$disconnect();
