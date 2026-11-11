import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    env: {
      NODE_ENV: "test",
      SUPABASE_URL: "https://tests.invalid",
      SUPABASE_PUBLISHABLE_KEY: "test-only-placeholder-not-a-real-key",
    },
  },
});
