import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: ["dist/**", ".regression-dist/**", "node_modules/**", "V.01/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}", "server/**/*.ts", "vite.config.ts", "vitest.config.ts"],
    rules: {
      // Existing browser code uses DOM globals; TypeScript supplies their declarations.
      "no-undef": "off",
      // This codebase contains intentional boundary types that will be narrowed incrementally.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
);
