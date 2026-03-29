---
phase: 01-foundation
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [
  "package.json",
  "pnpm-workspace.yaml",
  "tsconfig.base.json",
  ".eslintrc.js",
  ".prettierrc",
  "README.md"
]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Monorepo structure with pnpm workspaces is properly configured"
    - "TypeScript strict mode is enabled throughout the codebase"
    - "Shared types package @baniya/types is created with all interfaces"
    - "ESLint and Prettier are configured for consistent code formatting"
  artifacts:
    - path: "package.json"
      provides: "Root package.json with workspaces configuration"
      min_lines: 10
    - path: "pnpm-workspace.yaml"
      provides: "Pnpm workspaces configuration"
      min_lines: 3
    - path: "tsconfig.base.json"
      provides: "Base TypeScript configuration with strict mode"
      min_lines: 15
    - path: ".eslintrc.js"
      provides: "ESLint configuration"
      min_lines: 10
    - path: ".prettierrc"
      provides: "Prettier configuration"
      min_lines: 3
    - path: "packages/@baniya/types/src/index.ts"
      provides: "Shared TypeScript interfaces export"
      min_lines: 20
  key_links:
    - from: "tsconfig.base.json"
      to: "packages/@baniya/types/tsconfig.json"
      via: "extends"
      pattern: "\"extends\": \"./tsconfig.base.json\""
    - from: "packages/*/tsconfig.json"
      to: "tsconfig.base.json"
      via: "extends"
      pattern: "\"extends\": \"../../tsconfig.base.json\""
    - from: "package.json"
      to: "packages/*/package.json"
      via: "workspaces"
      pattern: "\"workspaces\": \"packages/*\""
---

<objective>
Establish the monorepo foundation with proper tooling configuration and shared types package.

Purpose: Create a solid foundation for all subsequent phases by setting up the monorepo structure, TypeScript configuration, linting, and shared interfaces that all other packages will depend on.
Output: Properly configured monorepo with workspace setup, base TS config, linting, and @baniya/types package with all shared interfaces defined.
</objective>

<execution_context>
@C:/Users/HP/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-foundation-CONTEXT.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Setup monorepo configuration and base tooling</name>
  <files>package.json, pnpm-workspace.yaml, tsconfig.base.json, .eslintrc.js, .prettierrc</files>
  <action>
    Create root package.json with pnpm workspaces configuration pointing to packages/* and apps/*
    Create pnpm-workspace.yaml defining workspace structure
    Create tsconfig.base.json with strict TypeScript settings (strict: true, noImplicitAny: true, etc.)
    Configure ESLint with recommended TypeScript rules and Prettier integration
    Configure Prettier with sensible defaults for TypeScript/JavaScript formatting
    Initialize root README.md with project overview and badges
  </action>
  <verify>
    pnpm install runs without errors
    pnpm -r build compiles all packages successfully
    npx eslint . --ext .ts,.js reports no errors
    npx prettier --check . reports no formatting issues
  </action>
  <done>
    Monorepo structure is properly configured with pnpm workspaces, TypeScript strict mode is enabled, ESLint and Prettier are configured and passing, and root README exists with project information
  </action>
</task>

<task type="auto">
  <name>Task 2: Create shared types package with all Baniya interfaces</name>
  <files>packages/@baniya/types/package.json, packages/@baniya/types/tsconfig.json, packages/@baniya/types/src/index.ts</files>
  <action>
    Create @baniya/types package directory structure
    Create package.json with name @baniya/types, version 0.1.0, main pointing to dist/index.js, types pointing to dist/index.d.ts
    Create tsconfig.json extending tsconfig.base.json with appropriate settings for a types package
    Create src/index.ts exporting all shared interfaces from context.md:
      - SensitivityLevel, RoutingTarget, NodeStatus, NodeType
      - Position, WorkflowNode, WorkflowEdge, Workflow
      - ClassificationResult, LLMResponse, NodeExecutionResult, ExecutionSummary
      - AuditRow, CostSummary, ProviderStatus, TriggerPayload, RouterConfig
    Ensure no implementation logic, only type definitions and interfaces
  </action>
  <verify>
    pnpm --filter @baniya/types install completes successfully
    pnpm --filter @baniya/types build produces dist/ directory with compiled types
    pnpm --filter @baniya/types vitest runs (should pass with no tests yet)
    Other packages can import @baniya/types without errors (test by creating a temporary test file)
  </action>
  <done>
    @baniya/types package is properly configured, builds successfully, exports all required TypeScript interfaces from context.md, and contains no implementation logic (only type definitions)
  </action>
</task>

</tasks>

<verification>
All files created in this plan are present and correctly formatted. Monorepo commands run successfully. Shared types package builds and can be imported by other packages.
</verification>

<success_criteria>
- package.json, pnpm-workspace.yaml, tsconfig.base.json, .eslintrc.js, .prettierrc files are created with correct configurations
- @baniya/types package is created with all interfaces from context.md
- pnpm install and pnpm -r build run without errors
- ESLint and Prettier checks pass
- Shared types package can be imported and used by other packages
</success_criteria>

<output>
After completion, create .planning/phases/01-foundation/01-foundation-01-SUMMARY.md
</output>