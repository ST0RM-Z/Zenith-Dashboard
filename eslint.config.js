// First, run: npm install globals --save-dev
const globals = require("globals");

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: "readonly",
      },
      ecmaVersion: 2021,
      sourceType: "module",
    },
    rules: {
      "no-undef": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "no-console": "warn",
      "prefer-const": "error",
    },
  },
];