import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextConfig = require("./node_modules/eslint-config-next/dist/index.js");

export default [
  ...nextConfig,
  {
    ignores: [".next/**", "node_modules/**", "coverage/**", "dist/**"],
  },
  {
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/incompatible-library": "warn",
    },
  },
];
