# AI Project Starter Kit

This project is configured with AI-friendly architecture guidelines, quality gates, and best practices to ensure consistency and quality across your codebase.

## Quick Start

```bash
# Install dependencies
npm install
# or
pnpm install

# Start development
npm run dev

# Run tests
npm test
```

## 📋 What's Included

This project includes AI guidance files to help both developers and AI assistants understand your project:

### Documentation Files
- **`.github/copilot-instructions.md`** - Instructions for AI assistants (Copilot, Claude, etc.)
- **`src/.ai/rules.md`** - Coding rules and standards for your project
- **`src/.ai/patterns.md`** - Design patterns and architectural patterns
- **`src/.ai/bootstrap.md`** - Setup and configuration guide

### Configuration Files
- **`.github/ai/manifest.xml`** - Project structure and capabilities
- **`.github/ai/architecture-rules.xml`** - Architectural constraints and rules
- **`.github/ai/pipeline.xml`** - CI/CD workflow definition
- **`.github/ai/quality-gates.xml`** - Quality standards and thresholds

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd <your-project>
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env.local
   ```

4. **Review AI Guidelines**
   - Start with `.github/copilot-instructions.md` for an overview
   - Check `src/.ai/rules.md` for coding standards
   - Review `src/.ai/patterns.md` for architecture patterns

## 📖 Understanding Your Project

### AI-Friendly Documentation
All AI guidance is stored in the `.github/ai/` and `src/.ai/` directories. These files help:
- **AI Assistants**: Understand your project structure and conventions
- **Developers**: Get onboarded quickly with team standards
- **Teams**: Maintain consistency across the codebase

### Key Files to Customize
Edit these files with your project-specific information:

1. **Copilot Instructions** (`.github/copilot-instructions.md`)
   - Project overview and tech stack
   - Code style guidelines
   - Common development tasks

2. **Architecture Rules** (`.github/ai/architecture-rules.xml`)
   - Layer definitions
   - Dependency constraints
   - Naming conventions

3. **Quality Gates** (`.github/ai/quality-gates.xml`)
   - Test coverage requirements
   - Performance thresholds
   - Build time limits

4. **Pipeline** (`.github/ai/pipeline.xml`)
   - Build steps
   - Test automation
   - Deployment stages

## 🎯 Development Workflow

### Before Starting
1. Read `.github/copilot-instructions.md`
2. Review `src/.ai/rules.md` for coding standards
3. Understand project patterns in `src/.ai/patterns.md`

### Creating Features
1. Create feature branch from `develop`
2. Follow the patterns documented in `src/.ai/patterns.md`
3. Ensure code follows rules in `src/.ai/rules.md`
4. Write tests and run `npm test`
5. Create a pull request

### Using AI Assistants
1. Copy relevant sections from `.github/copilot-instructions.md` into your AI chat
2. Reference specific rules from `src/.ai/rules.md` when asking for help
3. Let AI know about relevant patterns from `src/.ai/patterns.md`

## 📊 Project Structure

```
.
├── .github/
│   └── ai/                          # AI guidance files
│       ├── manifest.xml             # Project capabilities
│       ├── architecture-rules.xml   # Architectural rules
│       ├── pipeline.xml             # CI/CD configuration
│       ├── quality-gates.xml        # Quality standards
│       └── copilot-instructions.md  # AI assistant guidelines
├── src/
│   ├── .ai/                         # Developer guides
│   │   ├── bootstrap.md             # Setup instructions
│   │   ├── rules.md                 # Coding standards
│   │   └── patterns.md              # Design patterns
│   └── ...                          # Your application code
├── tests/                           # Test files
├── .env.example                     # Environment template
├── package.json                     # Project dependencies
└── README.md                        # This file
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🏗️ Building

```bash
# Build for development
npm run build:dev

# Build for production
npm run build:prod

# Watch for changes
npm run build:watch
```

## ✅ Quality Checks

```bash
# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type check
npm run type-check

# Run all checks
npm run check
```

## 📚 Additional Resources

- **Setup Guide**: See `src/.ai/bootstrap.md` for detailed setup instructions
- **Coding Standards**: Check `src/.ai/rules.md` for team conventions
- **Architecture**: Review `src/.ai/patterns.md` for design patterns
- **CI/CD**: See `.github/ai/pipeline.xml` for automation setup
- **Quality**: See `.github/ai/quality-gates.xml` for standards

## 🤝 Contributing

1. Follow the rules in `src/.ai/rules.md`
2. Use patterns documented in `src/.ai/patterns.md`
3. Ensure code passes quality checks
4. Update tests for new features
5. Create meaningful commit messages

## 🆘 Troubleshooting

See `src/.ai/bootstrap.md` for common setup issues and solutions.

## 📝 License

[Add your license information here]

## 👥 Team

- **Project Lead**: [Name]
- **Contact**: [Email or Slack channel]

---

**Last Updated**: [Date]
**Project Version**: 1.0.0
