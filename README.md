# KAMARU Philippines Storefront

A modern, responsive ecommerce frontend for KAMARU Philippines, built with React, TypeScript, Vite, and Tailwind CSS. Catalog, homepage blocks, journal articles, and site settings are served by the local custom CMS.

## Run locally

```bash
npm install
npm run dev
```

- Storefront: `http://localhost:43917`
- CMS: `http://localhost:43918`

Copy `.env.example` to `.env` if needed. `npm run dev` starts both apps. The CMS seeds itself from `src/data/catalog.ts` on first run and persists edits to `cms/data/content.json`. Refresh the storefront after saving in the CMS.

```bash
npm run dev:storefront
npm run dev:cms
npm run build
```

## Content and CMS integration

- `src/types.ts` defines the CMS-facing content contracts.
- `src/data/catalog.ts` is the seed catalog used when the CMS data file does not exist.
- `src/content.ts` implements the local source and the HTTP adapter. With `VITE_CMS_URL` set, the storefront reads from the CMS.
- `src/hooks/useContent.ts` is the only layer consumed by page components.
- `cms/` is the custom admin and API.

All images use `ImageRef`. Empty `src` values render a branded, aspect-ratio-safe placeholder through the shared `Media` component. The CMS can later supply real URLs and alt text without any component change.

Homepage blocks have stable IDs, types, and `sortOrder` fields. A CMS can publish, remove, or rearrange them and return the ordered array through `listSections`.

## Current scope

The cart and wishlist are functional and persisted to local storage. Search, category filters, price/color filters, sorting, quick view, and product options work against the local catalog. Checkout, authentication, contact delivery, and newsletter delivery require the future backend and are clearly identified in the interface.
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
