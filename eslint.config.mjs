import js from "@eslint/js";
import nextConfig from "eslint-config-next";
import prettier from "eslint-plugin-prettier";

const [
  nextBaseConfig,
  nextTypescriptConfig = {},
  nextIgnoreConfig = { ignores: [] },
] = nextConfig;
const mergedIgnores = Array.from(
  new Set([...(nextIgnoreConfig.ignores ?? []), "components/ui/**/*"]),
);

const config = [
  { ignores: mergedIgnores },
  js.configs.recommended,
  nextBaseConfig,
  nextTypescriptConfig,
  {
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
