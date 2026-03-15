import path from 'path';
import { defineConfig } from 'prisma/config';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), 'apps/api/.env') });

export default defineConfig({
  schema: path.resolve(process.cwd(), 'apps/api/prisma/schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
});
