# Contributing to css-minecraft-skin-viewer

Thank you for your interest in contributing to `css-minecraft-skin-viewer`! This is a pure CSS 3D Minecraft skin viewer for React. Contributions of all kinds are welcome - bug fixes, new features, documentation improvements, or new poses and animations.

## Table of Contents

- [Contributing to css-minecraft-skin-viewer](#contributing-to-css-minecraft-skin-viewer)
  - [Table of Contents](#table-of-contents)
  - [Getting Started](#getting-started)
  - [Development Setup](#development-setup)
  - [Project Structure](#project-structure)
  - [Coding Guidelines](#coding-guidelines)
  - [Submitting Changes](#submitting-changes)
  - [Reporting Issues](#reporting-issues)
  - [Code of Conduct](#code-of-conduct)
  - [License](#license)

## Getting Started

Before contributing, read the [README](../README.md) to understand what the component does, how it works, and its full API.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TheNolle/css-minecraft-skin-viewer.git
   cd css-minecraft-skin-viewer
   ```

2. **Install dependencies:**
   This project uses [pnpm](https://pnpm.io/). Install it first if needed:
   ```bash
   npm install -g pnpm
   ```
   Then:
   ```bash
   pnpm install
   ```

3. **Build the project:**
   ```bash
   pnpm build
   ```
   Output lands in `dist/`.

Node.js 20 or higher is required.

## Project Structure

```
src/
├── index.ts <- public exports
├── minecraft-skin-viewer.tsx <- component + poses + animations
└── minecraft.css <- all CSS: 3D transforms, effects, keyframes
dist/ <- built output (generated, not committed)
```

---

## Coding Guidelines

- **TypeScript** - strict mode, no `any`
- **Style** - no semicolons, single quotes, DRY, modular, OOP, documented
- **Commits** - conventional commits preferred (`feat:`, `fix:`, `docs:`, `refactor:`)
- **No new dependencies** - this package has zero runtime dependencies and must stay that way
- **CSS changes** - all visual logic lives in `minecraft.css`; keep pixel values consistent with the 9px base unit

## Submitting Changes

1. **Fork** the repository on GitHub
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feat/your-feature-name
   ```
3. **Commit your changes:**
   ```bash
   git commit -m "feat: description of your changes"
   ```
4. **Push to your fork:**
   ```bash
   git push origin feat/your-feature-name
   ```
5. **Open a Pull Request** - describe what you changed and why

## Reporting Issues

1. Check [existing issues](https://github.com/TheNolle/css-minecraft-skin-viewer/issues) first
2. If not already reported, open a new one with:
   - Clear title
   - Steps to reproduce
   - Expected vs. actual behavior
   - Your environment (Node version, React version, framework, OS)

## Code of Conduct

Be respectful, inclusive, and constructive. This is a welcoming space for everyone - trans rights are human rights. 🏳️‍⚧️

## License

By contributing, you agree your contributions are licensed under the [MIT License](../LICENSE).

Thank you for contributing! 🚀