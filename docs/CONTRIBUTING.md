# Contributing to Baniya

Thank you for considering contributing to Baniya! We welcome contributions from the community.

## How to Report Bugs

Please search the existing issues before creating a new one. When you create a bug report, include as much detail as possible:
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Environment details (OS, Node.js version, etc.)

## How to Suggest Features

Feature requests are welcome. Please open an issue describing:
- The problem your feature would solve
- How the feature would work
- Any potential drawbacks or considerations

## Development Setup

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/baniya.git`
3. Install dependencies: `pnpm install`
4. Set up environment variables:
   - Copy `.env.example` to `.env` in the `apps/server` directory
   - Adjust the values as needed for your environment
5. Start the development servers: `pnpm run dev`

## Coding Standards

We use ESLint and Prettier to maintain code quality and consistency.
- Run `pnpm run lint` to check for linting errors
- Run `pnpm run format` to format code with Prettier
- Please ensure your code passes these checks before submitting a pull request

## Pull Request Process

1. Ensure your code passes linting and tests
2. Update the README.md or documentation if needed for your changes
3. The pull request will be reviewed by maintainers
4. Once approved, your changes will be merged

## Code of Conduct

Please note that this project is released with a Contributor Code of Conduct. By participating in this project you agree to abide by its terms.