import { defineConfig } from "prisma/config";
import { Pool } from "pg";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrate: {
    datasourceUrl: process.env.DATABASE_URL!,
  },
});