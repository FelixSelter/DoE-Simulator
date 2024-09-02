import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";

export default [
  { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"] },
  { ignores: ["tailwind.config.js", ".next/**", "src-tauri/**", "build/**"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  pluginReact.configs.flat.recommended,
  //Make sure this is last so it wont be overwritten
  {
    rules: {
      "react/react-in-jsx-scope": "off",
    },
  },
];
