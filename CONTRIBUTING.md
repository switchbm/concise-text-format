# Contributing to CTF Format

Thank you for your interest in contributing to CTF! We welcome contributions from the community.

## Code of Conduct

This project adheres to a Code of Conduct. By participating, you are expected to uphold this code. Please read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior
- Actual behavior
- Your environment (OS, Node.js version, etc.)
- Sample data (if applicable)

### Suggesting Enhancements

We welcome suggestions for new features or improvements! Please open an issue with:

- A clear, descriptive title
- Detailed description of the proposed feature
- Use cases and benefits
- Examples (if applicable)

### Pull Requests

1. **Fork the repository** and create a new branch from `main`
2. **Make your changes** with clear, descriptive commits
3. **Add tests** for any new functionality
4. **Ensure all tests pass** (`npm test`)
5. **Update documentation** if needed
6. **Submit a pull request** with a clear description

#### Pull Request Guidelines

- Follow the existing code style
- Write clear commit messages
- Keep pull requests focused on a single change
- Update tests and documentation
- Ensure CI passes

### Development Setup

```bash
# Clone the repository
git clone https://github.com/ctf-format/ctf.git
cd ctf

# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run benchmarks
npm run benchmark
```

### Project Structure

```
ctf-format/
├── packages/
│   ├── ctf-core/       # Core encoder/decoder
│   ├── ctf-cli/        # CLI tool
│   └── ctf-python/     # Python implementation (future)
├── benchmarks/         # Performance benchmarks
├── docs/              # Documentation
└── conformance/       # Cross-implementation tests
```

### Coding Standards

- **TypeScript** for all core code
- **ESLint** for linting
- **Prettier** for formatting
- **Vitest** for testing
- **90%+ test coverage** for new code

### Testing

All contributions must include appropriate tests:

- **Unit tests** for individual functions
- **Integration tests** for feature interactions
- **Round-trip tests** for encode/decode pairs

Run tests:

```bash
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # With coverage report
```

### Documentation

Update documentation when:

- Adding new features
- Changing public APIs
- Fixing bugs that affect behavior
- Adding examples

Documentation locations:

- `README.md` - Main overview and quick start
- `SPECIFICATION.md` - Format specification
- `docs/` - Detailed guides and examples
- Code comments - For complex logic

### Specification Changes

Changes to the CTF specification require:

1. Discussion in an issue first
2. Updating `SPECIFICATION.md`
3. Updating all implementations
4. Adding conformance tests
5. Updating documentation and examples

### Commit Messages

Use clear, descriptive commit messages:

```
Add reference compression for repeated strings

- Implement ReferenceManager class
- Add auto-detection logic
- Update encoder to use references
- Add tests for reference compression
```

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** - Incompatible API changes
- **MINOR** - New functionality (backward compatible)
- **PATCH** - Bug fixes (backward compatible)

## Questions?

If you have questions, feel free to:

- Open an issue for discussion
- Join our community discussions
- Reach out to the maintainers

## Recognition

Contributors are recognized in:

- GitHub contributors list
- Release notes
- Project documentation

Thank you for contributing to CTF Format! 🎉
