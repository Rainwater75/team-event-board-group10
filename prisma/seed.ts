import { PrismaClient } from "@prisma/client";

const seedSql = `
  INSERT INTO "User" ("id", "email", "displayName", "role", "passwordHash")
  VALUES 
    ('user-admin', 'admin@app.test', 'Avery Admin', 'admin', '52bd54710a468b70e447a45d4e6cfae3:ff273e3cdedbc54045ac368d1f1955e4f6f6e177d63df6fb72440e4045cf756a6f93d16710b2542c725755d9df4960977204f4b580ce184f6242419b659973bf'),
    ('user-staff', 'staff@app.test', 'Sam Staff', 'staff', '5e12e1f3a75b4c2300e26eaaeda137a7:32dcbbe1d8785ced8009479e0705325bc5c425f8b69cd6c4abd6298aca4468d5564cdfaf9b8a02efa330a9d7d80e885842185ca29b5415f5c7e11b1e467324f7'),
    ('user-reader', 'user@app.test', 'Una User', 'user', '2b3bbad4e6798f50a57dba85090dcf6b:9ff6bd0f903e8df9fec42b869554f2bdcfa373690da56432623b82b0173aaf9371716d7fee6734e7080bd3021ed18af49ce723081e20180abdd2d0835f44d301');
`;

export async function runSeed(prisma: PrismaClient) {
  try {
    await prisma.$executeRawUnsafe(seedSql);
    console.log("Database seeded successfully!");
  } catch (e: any) {
    throw new Error(`SQL Seed Failed: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }
}