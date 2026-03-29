# Phase 1 Context: Foundation Enhancement

## Vision
Enhance the foundation phase to incorporate features for API key storage, flexible node creation, and LLM provider integration while maintaining Baniya's authentic core functionality. Focus on improving the developer experience and setting up proper foundations for extensibility.

## User Requirements
- Allow users to save API keys to the server for secure storage and reuse
- Enable creation of multiple nodes from a single node template (e.g., AI nodes with different configurations)
- Provide option to add Ollama or any local LLM to a project (auto-detection preferred)
- Maintain all core Baniya authenticity (data classification, routing, etc.)
- Ensure proper TypeScript setup and linting foundations
- Set up extensible architecture for future features

## Decisions
- Use pnpm workspaces for monorepo management
- Use TypeScript strict mode throughout
- Use @vue-flow/core for canvas implementation (do not build custom drag-drop)
- Keep all core Baniya functionality intact (data classifier, LLM router, etc.)
- Use Vue 3 for frontend framework
- Use PostgreSQL 16 as database
- Use JWT for authentication

## Deferred Ideas
- Advanced n8n-specific features (will be considered in later phases)
- Complex workflow templates
- Marketplace for custom nodes
- Advanced debugging tools

## Claude's Discretion
- Choice of specific UI component libraries (if any beyond design tokens)
- Exact folder structure within packages/apps
- Specific implementation of shared utilities
- Choice of testing utilities beyond Vitest
- Specific ESLint/Prettier configuration details
- Implementation approach for API key storage (encrypted vs hashed, etc.)
- Approach for flexible node creation (factory pattern, configuration-based, etc.)
- Method for LLM provider auto-detection and integration