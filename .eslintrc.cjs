module.exports = {
  root: true,
  ignorePatterns: [
    "node_modules",
    "dist",
    "coverage",
    "playwright-report",
    "test-results"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: "module"
  },
  env: {
    es2021: true,
    node: true
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_", ignoreRestSiblings: true }
    ],
    "no-empty": "off",
    "no-useless-escape": "off"
  },
  overrides: [
    {
      files: ["apps/web/**/*.{ts,tsx}"],
      env: { browser: true },
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      plugins: ["react", "react-hooks", "jsx-a11y"],
      extends: [
        "plugin:react/recommended",
        "plugin:react-hooks/recommended",
        "plugin:jsx-a11y/recommended"
      ],
      settings: {
        react: { version: "detect" }
      },
      rules: {
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react-hooks/set-state-in-effect": "warn",
        "react/no-unescaped-entities": "off",
        "jsx-a11y/anchor-is-valid": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/no-static-element-interactions": "off"
      }
    },
    {
      files: [
        "**/__tests__/**/*.{ts,tsx}",
        "**/?(*.)+(spec|test).{ts,tsx}"
      ],
      env: { jest: true },
      globals: {
        vi: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly"
      }
    }
  ]
};
