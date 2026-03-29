---
phase: 02-intelligence
plan: 03
type: execute
wave: 2
depends_on: [01]
files_modified: [
  "packages/@baniya/data-classifier/src/__tests__/classifier.test.ts",
  "packages/@baniya/data-classifier/src/__tests__/patterns.test.ts"
]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "Unit tests for data classifier patterns are written and passing"
    - "Unit tests for data classifier function are written and passing"
    - "Tests cover various payload structures and edge cases"
    - "Tests verify sensitivity level detection, pattern detection, confidence calculation, and routing recommendation"
  artifacts:
    - path: "packages/@baniya/data-classifier/src/__tests__/classifier.test.ts"
      provides: "Test file for classifier function"
      min_lines: 20
    - path: "packages/@baniya/data-classifier/src/__tests__/patterns.test.ts"
      provides: "Test file for India PII patterns"
      min_lines: 15
  key_links:
    - from: "packages/@baniya/data-classifier/src/__tests__/classifier.test.ts"
      to: "packages/@baniya/data-classifier/src/classifier.ts"
      via: "import"
      pattern: "from.*classifier"
    - from: "packages/@baniya/data-classifier/src/__tests__/patterns.test.ts"
      to: "packages/@baniya/data-classifier/src/patterns/india-pii.ts"
      via: "import"
      pattern: "from.*patterns/india-pii"
---

<objective>
Write unit tests for the data classifier package to ensure correctness of PII detection and classification logic.

Purpose: Create a test suite that validates the data classifier's ability to detect Indian PII patterns, determine sensitivity levels, calculate confidence, and provide routing recommendations.
Output: Test files for the classifier function and patterns that can be run with Vitest to verify correct behavior.
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
@.planning/phases/02-intelligence/02-intelligence-01-SUMMARY.md
@.planning/phases/02-intelligence/02-intelligence-02-SUMMARY.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Set up test directory and write pattern tests</name>
  <files>packages/@baniya/data-classifier/src/__tests__/patterns.test.ts</files>
  <action>
    Create the __tests__ directory if it doesn't exist.
    Write tests for the India PII patterns that:
      * Import the PATTERNS and SENSITIVE_KEYS from the patterns file
      * Test each regex pattern against valid and invalid inputs
      * Verify that the patterns match the expected format (e.g., Aadhaar numbers, PAN cards, etc.)
      * Test edge cases and boundary conditions
      * Ensure no false positives for similar but invalid patterns
    Use Vitest syntax (describe, test, expect).
  </action>
  <verify>
    Test file exists and contains test cases for each pattern
    Tests follow Vitest conventions
    No syntax errors in the test file
  </action>
  <done>
    Unit tests for India PII patterns are written and ready to run, covering validation of each regex pattern.
  </done>
</task>

<task type="auto">
  <name>Task 2: Write classifier function tests</name>
  <files>packages/@baniya/data-classifier/src/__tests__/classifier.test.ts</files>
  <action>
    Write tests for the classifier function that:
      * Import the classifier function
      * Test various payloads (flat objects, nested objects, arrays, strings)
      * Verify that the correct sensitivity level is returned for different combinations of PII
      * Check that detected patterns are correctly identified and deduplicated
      * Verify confidence calculation matches the formula (0.95 for no patterns, else min(0.7 + 0.1 * patterns.length, 0.99))
      * Ensure routing recommendation is correct based on sensitivity level
      * Test edge cases: empty payload, deeply nested objects, large payloads (performance not tested here)
      * Test the hard block scenario (though the classifier only recommends, we verify the logic)
    Use Vitest syntax with appropriate test cases.
  </action>
  <verify>
    Test file exists and contains comprehensive test cases for the classifier
    Tests follow Vitest conventions
    No syntax errors in the test file
  </action>
  <done>
    Unit tests for the classifier function are written and ready to run, covering correctness of sensitivity detection, pattern recognition, confidence calculation, and routing recommendation.
  </done>
</task>

</tasks>

<verification>
Test files are created and ready to be run with Vitest. They cover the patterns and classifier function of the data classifier package.
</verification>

<success_criteria>
- Test directory exists with the two test files
- Pattern tests cover each regex pattern with valid and invalid inputs
- Classifier tests cover various payload structures and verify all output fields
- Tests are written in Vitest syntax and are syntactically correct
- No implementation logic is changed; only tests are added
</success_criteria>

<output>
After completion, create .planning/phases/02-intelligence/02-intelligence-03-SUMMARY.md
</output>