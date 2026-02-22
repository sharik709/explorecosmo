# ExploreCosmo

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-24C8DB?logo=tauri&logoColor=white)](https://tauri.app/)
[![Vue](https://img.shields.io/badge/Vue-3.x-42B883?logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tests: Vitest](https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)

ExploreCosmo is a desktop client for Azure Cosmos DB built with Tauri, Vue, and TypeScript.  
Its goal is to provide a TablePlus-like workflow for Cosmos DB: manage connections, browse collections, run queries, inspect and edit rows, and export results quickly.

## Table of Contents

- [Why ExploreCosmo](#why-explorecosmo)
- [Feature Set](#feature-set)
- [Security Model](#security-model)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Setup](#setup)
- [Scripts](#scripts)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [License](#license)

## Why ExploreCosmo

Cosmos DB teams often need a focused desktop tool for operational querying and data inspection without switching between browser tabs and custom scripts. ExploreCosmo is designed to cover this with a clean local-first app experience.

## Feature Set

- Multiple connection profiles for:
  - Service Principal
  - Cosmos API Key
  - Microsoft Intra / LDAP (planned backend integration path)
- One-click connect and connection switching.
- Collection browser in a persistent sidebar.
- Spreadsheet-like data grid with inline editing.
- Row details drawer for form-style editing.
- Query editor with saved queries by collection.
- Export current result set to CSV and JSON.

## Security Model

- Connection metadata is stored locally.
- Secrets are not persisted in plain text in application storage.
- Current repository state includes UI-first flows with mock/sample data for collection browsing and query execution.
- Production Cosmos authentication and secure secret handling are planned through Tauri backend commands.

## Technology Stack

- Desktop shell: Tauri 2
- Frontend: Vue 3 + Vue Router 4
- Language: TypeScript
- Build tool: Vite
- Testing: Vitest

## Project Structure

```text
.
├── src
│   ├── components       # UI components (sidebar, editor, grid, modal, drawer)
│   ├── lib              # data stores, query logic, exporters, tests
│   ├── styles           # global styles
│   └── views            # route-level views
├── src-tauri            # Tauri backend (Rust)
├── public               # static assets
└── README.md
```

## Setup

### Prerequisites

- Node.js 18 or newer
- pnpm
- Rust toolchain
- Tauri system dependencies  
  Reference: https://tauri.app/develop/prerequisites/

### Installation

```bash
pnpm install
```

### Run in Development

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

### Build Frontend

```bash
pnpm build
```

### Run Tauri Commands

```bash
pnpm tauri
```

## Scripts

- `pnpm dev`: starts Vite development server.
- `pnpm build`: type-checks and builds production frontend assets.
- `pnpm preview`: serves the production frontend build locally.
- `pnpm test`: runs unit tests with Vitest.
- `pnpm tauri`: runs Tauri CLI commands.

## Development Workflow

- Follow TDD for new behavior.
- Keep functions small and readable.
- Avoid duplicate logic and prefer reusable modules.
- Add or keep only trusted, maintained dependencies.
- Keep UI spacing and data-grid usability consistent.

## Contributing

1. Fork the repository and create a feature branch.
2. Implement the change with tests first or alongside the change.
3. Run `pnpm test` and `pnpm build`.
4. Keep commits focused and clearly scoped.
5. Open a pull request with:
   - Problem statement
   - Implementation summary
   - Test evidence
   - Screenshots for UI changes

### Contribution Quality Checklist

- No unrelated changes in the PR.
- No dead code or unused dependencies.
- Code is modular and follows existing folder structure.
- User-facing behavior is documented in the PR description.

## Roadmap

- Cosmos DB live integration via Tauri backend.
- Secure credential vault integration.
- Saved connection health checks.
- Pagination and large dataset virtualization.
- Query history and execution metrics.

## License

This project is licensed under the MIT License. See `LICENSE` for details.
