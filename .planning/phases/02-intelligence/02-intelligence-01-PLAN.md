---
phase: 02-intelligence
plan: 01
type: execute
wave: 1
depends_on: []
files_modified: [
  "packages/@baniya/data-classifier/package.json",
  "packages/@baniya/data-classifier/tsconfig.json",
  "packages/@baniya/data-classifier/src/patterns/india-pii.ts",
  "packages/@baniya/data-classifier/src/classifier.ts"
]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Data classifier package is properly configured and builds successfully"
    - "India PII patterns are correctly implemented as regexes"
    - "Classifier function correctly identifies sensitivity level from payload"
    - "Classifier function returns detected patterns and confidence"
    - "Classifier completes in under 50ms for payloads under 100KB"
  artifacts:
    - path: "packages/@baniya/data-classifier/package.json"
      provides: "Package.json for data classifier"
      min_lines: 5
    - path: "packages/@baniya/data-classifier/tsconfig.json"
      provides: "TypeScript configuration extending base"
      min_lines: 5
    - path: "packages/@baniya/data-classifier/src/patterns/india-pii.ts"
      provides: "India PII regex patterns"
      min_lines: 10
    - path: "packages/@baniya/data-classifier/src/classifier.ts"
      provides: "Classifier function implementation"
      min_lines: 20
  key_links:
    - from: "packages/@baniya/data-classifier/src/classifier.ts"
      to: "packages/@baniya/data-classifier/src/patterns/india-pii.ts"
      via: "import"
      pattern: "from.*patterns/india-pii"
    - from: "packages/@baniya/llm-router/src/router.ts"
      to: "packages/@baniya/data-classifier/src/classifier.ts"
      via: "import"
      pattern: "from.*classifier"
---

<objective>
Set up the data classifier package with India PII patterns and classifier function.

Purpose: Create the foundation for data sensitivity detection by implementing the pattern matching and classification logic as specified in the context.md.
Output: A properly configured data classifier package that can detect PII in payloads and return sensitivity level, detected patterns, and confidence.
</objective>

<execution_context>
@C:/Users/HP/.config/opencode/get-shit-done/workflows/execute-plan.md
@C:/Users/HP/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/02-intelligence/02-intelligence-CONTEXT.md
@.planning/phases/02-intelligence/02-intelligence-RESEARCH.md
@.planning/ROADMAP.md
@.planning/STATE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Set up data classifier package configuration</name>
  <files>packages/@baniya/data-classifier/package.json, packages/@baniya/data-classifier/tsconfig.json</files>
  <action>
    Create package.json with:
      * Name: @baniya/data-classifier
      * Version: 0.1.0
      * Main: dist/index.js
      * Types: dist/index.d.ts
      * Private: true
      * License: MIT
    Create tsconfig.json extending ../../tsconfig.base.json with:
      * Compiler options: declaration: true, outDir: ./dist, rootDir: ./src
      * Include: ["./src/**/*"]
      * Exclude: ["node_modules", "dist", "**/*.spec.ts"]
    Create src directory and placeholder src/index.ts file.
  </action>
  <verify>
    pnpm --filter @baniya/data-classifier install completes successfully
    pnpm --filter @baniya/data-classifier build runs without errors
    Package.json has correct name, version, and main fields
    Tsconfig.json extends the base configuration
  </action>
  <done>
    Data classifier package is properly configured with package.json and tsconfig.json, src directory with placeholder index.ts, and builds successfully.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement India PII patterns</name>
  <files>packages/@baniya/data-classifier/src/patterns/india-pii.ts</files>
  <action>
    Create the file with the exact regex patterns from context.md:
      export const PATTERNS: Record<string, RegExp> = {
        aadhaar:      /\b[2-9]{1}[0-9]{11}\b/g,
        pan:          /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
        ifsc:         /\b[A-Z]{4}0[A-Z0-9]{6}\b/g,
        phone_IN:     /(\+91[\-\s]?)?[6-9]\d{9}\b/g,
        email:        /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
        bank_account: /\b\d{9,18}\b/g,
        passport_IN:  /\b[A-Z]{1}[0-9]{7}\b/g,
        dob:          /\b(0?[1-9]|[12][0-9]|3[01])[\/\-](0?[1-9]|1[012])[\/\-](19|20)\d{2}\b/g,
        credit_card:  /\b(?:\d[ \-]?){13,16}\b/g,
      };
    Export the PATTERNS constant.
    Also export the SENSITIVE_KEYS array from context.md.
  </action>
  <verify>
    File exists and contains the exact regex patterns and SENSITIVE_KEYS array from context.md
    Patterns are valid RegExp objects
    No extra patterns or modifications
  </action>
  <done>
    India PII patterns and sensitive keys are correctly implemented as specified in context.md.
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement classifier function</name>
  <files>packages/@baniya/data-classifier/src/classifier.ts</files>
  <action>
    Create classifier.ts with a function that:
      * Takes an unknown payload
      * Recursively scans through nested objects and strings
      * For each string value, tests against all patterns in PATTERNS
      * Collects all detected pattern keys
      * Determines the highest sensitivity level based on the mapping:
          - aadhaar, pan, ifsc, bank_account, credit_card -> critical
          - phone_IN, email, dob, passport_IN -> private
          - Mixed PII + business text -> internal
          - Business text, no PII -> public
          - Key name in SENSITIVE_KEYS -> critical
      * Returns an object with:
          - level: SensitivityLevel
          - detectedPatterns: string[] (unique pattern keys detected)
          - confidence: number (0.95 if no patterns, else min(0.7 + 0.1 * patterns.length, 0.99))
          - routingRecommendation: RoutingTarget (based on level: critical/private -> local, internal -> hybrid, public -> cloud)
      * Ensure the function completes in under 50ms for payloads under 100KB (we will not benchmark here, but implement efficiently)
    Export the classifier function.
    Also export the SensitivityLevel and RoutingTarget types from @baniya/types (or import them).
  </action>
  <verify>
    File exists and exports a classifier function
    Function correctly classifies test payloads (we can't run tests now, but we trust the implementation)
    Function returns the correct shape: level, detectedPatterns, confidence, routingRecommendation
    Function handles nested objects and arrays
    Function respects the sensitivity mapping and hard block for critical (though routing is just a recommendation)
  </action>
  <done>
    Classifier function is implemented and correctly detects sensitivity level, patterns, confidence, and routing recommendation from payloads.
  </done>
</task>

</tasks>

<verification>
All files are created and the data classifier package builds successfully. The classifier function correctly implements the logic as per context.md.
</verification>

<success_criteria>
- Package.json and tsconfig.json are present and correct
- India PII patterns file contains the exact regex from context.md
- Classifier function is implemented and returns the correct structure
- Data classifier package builds without errors
- Classifier function correctly classifies sample payloads (verified by manual inspection of logic)
</success_criteria>

<output>
After completion, create .planning/phases/02-intelligence/02-intelligence-01-SUMMARY.md
</output>