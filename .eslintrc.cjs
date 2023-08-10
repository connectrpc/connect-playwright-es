module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  root: true,
  ignorePatterns: ["packages/*/dist/**"],
  plugins: ["@typescript-eslint", "node", "import"],
  // Rules and settings that do not require a non-default parser
  extends: ["eslint:recommended"],
  rules: {
    "no-console": "error",
  },
  overrides: [
    {
      files: ["**/*.{ts,tsx,cts,mts}"],
      parser: "@typescript-eslint/parser",
      parserOptions: {
        project: true,
      },
      settings: {
        "import/resolver": {
          typescript: {
            project: "tsconfig.json",
          },
        },
      },
      extends: [
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
        "plugin:import/recommended",
        "plugin:import/typescript",
      ],
      rules: {
        "@typescript-eslint/strict-boolean-expressions": "error",
        "@typescript-eslint/no-unnecessary-condition": "error",
        "@typescript-eslint/array-type": "off", // we use complex typings, where Array is actually more readable than T[]
        "@typescript-eslint/switch-exhaustiveness-check": "error",
        "@typescript-eslint/prefer-nullish-coalescing": "error",
        "@typescript-eslint/no-unnecessary-boolean-literal-compare": "error",
        "@typescript-eslint/no-invalid-void-type": "error",
        "@typescript-eslint/no-base-to-string": "error",
        "import/no-cycle": "error",
        "import/no-duplicates": "error",
      },
    },
    // For scripts and configurations, use Node.js rules
    {
      files: ["**/*.{js,mjs,cjs}"],
      parserOptions: {
        ecmaVersion: 2020,
      },
      extends: ["eslint:recommended", "plugin:node/recommended"],
      rules: {
        "node/shebang": "off", // this plugin only determines shebang necessary for files that are in a package.json "bin" field
        "node/exports-style": ["error", "module.exports"],
        "node/file-extension-in-import": ["error", "always"],
        "node/prefer-global/buffer": ["error", "always"],
        "node/prefer-global/console": ["error", "always"],
        "node/prefer-global/process": ["error", "always"],
        "node/prefer-global/url-search-params": ["error", "always"],
        "node/prefer-global/url": ["error", "always"],
        "node/prefer-promises/dns": "error",
        "node/prefer-promises/fs": "error",
        "no-process-exit": "off",
        "node/no-unsupported-features/es-builtins": [
          "error",
          {
            version: ">=16.0.0",
            ignores: [],
          },
        ],
        "node/no-unsupported-features/node-builtins": [
          "error",
          {
            version: ">=16.0.0",
            ignores: [],
          },
        ],
      },
    },
  ],
};
