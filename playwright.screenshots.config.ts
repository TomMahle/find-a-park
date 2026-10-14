import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

export default defineConfig({
  ...base,
  testDir: "./scripts",
  testMatch: "screenshots.spec.ts",
  projects: [{ name: "screenshots" }],
});
