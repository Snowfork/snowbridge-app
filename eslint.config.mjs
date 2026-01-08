import js from "@eslint/js";
import nextConfig from "eslint-config-next";
import prettier from "eslint-plugin-prettier";

const [
  nextBaseConfig,
  nextTypescriptConfig = {},
  nextIgnoreConfig = { ignores: [] },
] = nextConfig;
const mergedIgnores = Array.from(
  new Set([
    ...(nextIgnoreConfig.ignores ?? []),
    ".next/**",
    "**/.next/**",
    "node_modules/**",
    "components/ui/**/*",
  ]),
);

const config = [
  { ignores: mergedIgnores },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        React: "readonly",
        JSX: "readonly",
      },
    },
  },
  js.configs.recommended,
  nextBaseConfig,
  nextTypescriptConfig,
  {
    files: ["**/__tests__/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      globals: {
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        jest: "readonly",
      },
    },
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    plugins: {
      prettier,
    },
    rules: {
      "prettier/prettier": [
        "error",
        {
          singleQuote: false,
          trailingComma: "all",
          semi: true,
        },
      ],
      "no-unused-vars": "off",
      "no-unsafe-optional-chaining": "off",
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/immutability": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/set-state-in-render": "off",
      "react-hooks/set-state-in-memo": "off",
      quotes: [
        "error",
        "double",
        {
          allowTemplateLiterals: true,
          avoidEscape: true,
        },
      ],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
    },
  },
];

export default config;
