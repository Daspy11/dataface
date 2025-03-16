# Contributing to Dataface

Thank you for your interest in contributing to Dataface! This document provides guidelines and instructions for contributing.

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/dataface.git`
3. Install dependencies: `pnpm install`
4. Build packages: `pnpm build`

## Development Workflow

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Test your changes: `pnpm test`
4. Commit your changes: `git commit -m "feat: add your feature"`
5. Push to your fork: `git push origin feature/your-feature-name`
6. Open a pull request

## Project Structure

```
dataface/
├── packages/
│   ├── cli/                 # CLI tool
│   ├── registry/            # Component registry
│   └── config/              # Shared configuration
└── apps/
    └── docs/                # Documentation website
```

## Adding a New Component

1. Create a new directory in `packages/registry/src/your-component`
2. Implement your component following our design guidelines
3. Export your component in `packages/registry/src/index.ts`
4. Add tests for your component
5. Update documentation

## Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

## Pull Request Process

1. Update documentation if needed
2. Add tests for new features
3. Ensure all tests pass
4. Wait for review and address any feedback

## License

By contributing to Dataface, you agree that your contributions will be licensed under the project's [MIT License](LICENSE). 