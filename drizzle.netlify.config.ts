import {defineConfig} from 'drizzle-kit';
export default defineConfig({dialect:'postgresql',schema:'./db/netlify-schema.ts',out:'./netlify/database/migrations'});
