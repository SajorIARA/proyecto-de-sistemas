import js from "@eslint/js";
import react from "eslint-plugin-react";
import globals from "globals";

export default [
  {
    ignores: ["dist/", "node_modules/"],
  },
  js.configs.recommended,
  react.configs.flat.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: "18.3" },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "no-unused-vars": ["error", { varsIgnorePattern: "^React$" }],
    },
  },
];