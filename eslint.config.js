import typescriptParser from "@typescript-eslint/parser";

export default [
  {
    ignores: ["node_modules/**/*", "dist/**/*", "public/**/*", "assets/**/*", "data/**/*", "server.ts"]
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2024,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      "no-unused-vars": "off",
      "no-console": "off",
    },
  }
];
