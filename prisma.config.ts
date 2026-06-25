import path from 'path';
import { defineConfig } from 'prisma/config';

// Prisma 7: connection URL is passed via DATABASE_URL environment variable.
// For MongoDB, Prisma reads it directly from process.env — no adapter needed.
export default defineConfig({
  schema: path.join(__dirname, 'prisma/schema.prisma'),
});
