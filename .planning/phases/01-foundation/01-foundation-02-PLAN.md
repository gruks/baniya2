---
phase: 01-foundation
plan: 02
type: execute
wave: 1
depends_on: []
files_modified: [
  "packages/@baniya/data-classifier/package.json",
  "packages/@baniya/data-classifier/tsconfig.json",
  "packages/@baniya/llm-router/package.json",
  "packages/@baniya/llm-router/tsconfig.json",
  "packages/@baniya/audit-logger/package.json",
  "packages/@baniya/audit-logger/tsconfig.json",
  "packages/@baniya/workflow-engine/package.json",
  "packages/@baniya/workflow-engine/tsconfig.json",
  "packages/@baniya/nodes/package.json",
  "packages/@baniya/nodes/tsconfig.json",
  "apps/server/package.json",
  "apps/server/tsconfig.json",
  "apps/editor/package.json",
  "apps/editor/tsconfig.json"
]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "All packages and apps have proper package.json and tsconfig.json files"
    - "All packages extend the base TypeScript configuration"
    - "Directory structure matches the monorepo layout defined in context.md"
    - "No implementation logic exists yet (only skeletons)"
  artifacts:
    - path: "packages/@baniya/data-classifier/package.json"
      provides: "Package.json for data classifier"
      min_lines: 5
    - path: "packages/@baniya/llm-router/package.json"
      provides: "Package.json for LLM router"
      min_lines: 5
    - path: "packages/@baniya/audit-logger/package.json"
      provides: "Package.json for audit logger"
      min_lines: 5
    - path: "packages/@baniya/workflow-engine/package.json"
      provides: "Package.json for workflow engine"
      min_lines: 5
    - path: "packages/@baniya/nodes/package.json"
      provides: "Package.json for nodes registry"
      min_lines: 5
    - path: "apps/server/package.json"
      provides: "Package.json for Express server"
      min_lines: 5
    - path: "apps/editor/package.json"
      provides: "Package.json for Vue editor"
      min_lines: 5
  key_links:
    - from: "packages/*/tsconfig.json"
      to: "../../tsconfig.base.json"
      via: "extends"
      pattern: "\"extends\": \"../../tsconfig.base.json\""
    - from: "apps/*/tsconfig.json"
      to: "../../tsconfig.base.json"
      via: "extends"
      pattern: "\"extends\": \"../tsconfig.base.json\""
    - from: "packages/*/package.json"
      to: "../../package.json"
      via: "workspaces"
      pattern: "\"workspaces\": [\"packages/*\", \"apps/*\"]"
---

<objective>
Set up the package structure for all Baniya packages and apps with proper TypeScript configuration.

Purpose: Create the complete directory structure and configuration files for all packages and apps so that subsequent phases can focus on implementation rather than setup.
Output: All packages and apps have properly configured package.json and tsconfig.json files extending the base configuration, ready for implementation in later phases.
</objective>

<execution_context>
@C:/Users/HP/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/01-foundation/01-foundation-CONTEXT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/01-foundation/01-foundation-01-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Create package structure and configuration for all packages</name>
  <files>packages/*/package.json, packages/*/tsconfig.json</files>
  <action>
    Create directory structure for all packages:
    - @baniya/data-classifier
    - @baniya/llm-router
    - @baniya/audit-logger
    - @baniya/workflow-engine
    - @baniya/nodes
    
    For each package:
    - Create package.json with:
      * Name matching the package scope
      * Version 0.1.0
      * Main pointing to dist/index.js
      * Types pointing to dist/index.d.ts
      * Private: true
      * License: MIT
    - Create tsconfig.json extending ../../tsconfig.base.json with:
      * Compiler options appropriate for package type (declaration: true, outDir: ./dist, etc.)
      * Include: ["src/**/*"]
      * Exclude: ["node_modules", "dist", "**/*.spec.ts"]
    - Create src directory (will be populated in later phases)
    - Create empty src/index.ts file as placeholder
  </action>
  <verify>
    pnpm --filter @baniya/* install completes successfully for all packages
    pnpm --filter @baniya/* build runs without errors for all packages
    All package.json files have correct name, version, and main fields
    All tsconfig.json files extend the base configuration
  </action>
  <done>
    All five packages have properly configured package.json and tsconfig.json files, src directories with placeholder index.ts files, and can be built successfully
  </action>
</task>

<task type="auto">
  <name>Task 2: Create package structure and configuration for both apps</name>
  <files>apps/*/package.json, apps/*/tsconfig.json</files>
  <action>
    Create directory structure for both apps:
    - apps/server (Express API)
    - apps/editor (Vue 3 canvas frontend)
    
    For each app:
    - Create package.json with:
      * Appropriate name (server, editor)
      * Version 0.1.0
      * Private: true
      * License: MIT
      * Apps/server: Add scripts for start, dev, build
      * Apps/editor: Add scripts for dev, build, preview
    - Create tsconfig.json extending ../tsconfig.base.json with:
      * Compiler options appropriate for app type
      * Include: ["src/**/*"]
      * Exclude: ["node_modules", "dist"]
    - Create src directory (will be populated in later phases)
    - Create public directory for editor app (for Vite)
    - Create empty src/main.ts file as placeholder for each app
  </action>
  <verify>
    pnpm --filter apps/* install completes successfully for both apps
    pnpm --filter apps/* build runs without errors for both apps
    All package.json files have correct configuration
    All tsconfig.json files extend the base configuration
    Apps have appropriate scripts defined
  </action>
  <done>
    Both apps have properly configured package.json and tsconfig.json files, src directories with placeholder main.ts files, and can be built successfully
  </action>
</task>

</tasks>

<verification>
All packages and apps are created with correct configuration. Monorepo builds successfully. No implementation logic exists yet (only skeletons and configurations).
</verification>

<success_criteria>
- All packages (@baniya/data-classifier, @baniya/llm-router, @baniya/audit-logger, @baniya/workflow-engine, @baniya/nodes) have package.json and tsconfig.json
- Both apps (server, editor) have package.json and tsconfig.json
- All configurations extend the base tsconfig.base.json
- pnpm install and pnpm -r build run successfully
- Directory structure matches the monorepo layout from context.md
- No implementation logic exists in src files (only placeholders)
</success_criteria>

<output>
After completion, create .planning/phases/01-foundation/01-foundation-02-SUMMARY.md
</output>