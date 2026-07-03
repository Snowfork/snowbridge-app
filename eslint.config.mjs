import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-plugin-prettier";
import reactHooks from "eslint-plugin-react-hooks";

const config = [
  {
    ignores: [
      "dist/**",
      ".next/**",
      "node_modules/**",
      "components/ui/**/*",
      "public/**",
    ],
  },
  // Plain JS/config + Node scripts: recommended base rules with Node globals.
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...js.configs.recommended,
    languageOptions: {
      ...js.configs.recommended.languageOptions,
      globals: {
        require: "readonly",
        module: "readonly",
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        Buffer: "readonly",
      },
    },
  },
  // TypeScript sources: parse with the TS parser. Type-level concerns
  // (unused vars, no-explicit-any) are enforced by `tsc --noEmit`, not here,
  // matching the prior lenient lint setup.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { React: "readonly", JSX: "readonly" },
    },
    // Register the plugin so inline `react-hooks/*` disable directives in the
    // source resolve. Rules are left off (parity with the prior setup).
    plugins: { "react-hooks": reactHooks },
  },
  // Style rules enforced across the codebase (kept from the previous config).
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: { prettier },
    rules: {
      "prettier/prettier": [
        "error",
        { singleQuote: false, trailingComma: "all", semi: true },
      ],
      quotes: [
        "error",
        "double",
        { allowTemplateLiterals: true, avoidEscape: true },
      ],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
    },
  },
];

export default config;
