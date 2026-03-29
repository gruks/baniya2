---
phase: 02-intelligence
plan: 02
type: execute
wave: 1
depends_on: []
files_modified: [
  "packages/@baniya/llm-router/package.json",
  "packages/@baniya/llm-router/tsconfig.json",
  "packages/@baniya/llm-router/src/router.ts",
  "packages/@baniya/llm-router/src/providers/",
  "packages/@baniya/llm-router/src/sanitizer.ts",
  "packages/@baniya/llm-router/src/cost-estimator.ts"
]
autonomous: true
user_setup: []

must_haves:
  truths:
    - "LLM router package is properly configured and builds successfully"
    - "Local provider detection works for Ollama and LM Studio"
    - "Cloud provider initialization works with API keys from environment variables"
    - "Sanitizer correctly replaces PII with placeholders and maintains reversible map"
    - "Cost estimator calculates costs using token prices from context.md"
    - "Router correctly routes based on classification result"
    - "Hard block prevents critical data from being routed to cloud"
  artifacts:
    - path: "packages/@baniya/llm-router/package.json"
      provides: "Package.json for LLM router"
      min_lines: 5
    - path: "packages/@baniya/llm-router/tsconfig.json"
      provides: "TypeScript configuration extending base"
      min_lines: 5
    - path: "packages/@baniya/llm-router/src/router.ts"
      provides: "Main router implementation"
      min_lines: 30
    - path: "packages/@baniya/llm-router/src/providers/"
      provides: "Provider adapters directory"
      min_lines: 0
    - path: "packages/@baniya/llm-router/src/sanitizer.ts"
      provides: "Sanitizer implementation for hybrid routing"
      min_lines: 15
    - path: "packages/@baniya/llm-router/src/cost-estimator.ts"
      provides: "Cost estimation utility"
      min_lines: 10
  key_links:
    - from: "packages/@baniya/llm-router/src/router.ts"
      to: "packages/@baniya/data-classifier/src/classifier.ts"
      via: "import"
      pattern: "from.*classifier"
    - from: "packages/@baniya/llm-router/src/router.ts"
      to: "packages/@baniya/llm-router/src/sanitizer.ts"
      via: "import"
      pattern: "from.*sanitizer"
    - from: "packages/@baniya/llm-router/src/router.ts"
      to: "packages/@baniya/llm-router/src/cost-estimator.ts"
      via: "import"
      pattern: "from.*cost-estimator"
    - from: "packages/@baniya/llm-router/src/providers/*"
      to: "packages/@baniya/llm-router/src/router.ts"
      via: "import"
      pattern: "from.*providers"
---

<objective>
Set up the LLM router package with provider adapters, sanitizer, cost estimator, and routing logic.

Purpose: Create the core routing functionality that determines where LLM requests should be sent based on data sensitivity, with support for local and cloud providers.
Output: A properly configured LLM router package that can classify payloads, determine routing target, sanitize data for hybrid routing, estimate costs, and enforce hard blocks for critical data.
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
</context>

<tasks>

<task type="auto">
  <name>Task 1: Set up LLM router package configuration</name>
  <files>packages/@baniya/llm-router/package.json, packages/@baniya/llm-router/tsconfig.json</files>
  <action>
    Create package.json with:
      * Name: @baniya/llm-router
      * Version: 0.1.0
      * Main: dist/index.js
      * Types: dist/index.d.ts
      * Private: true
      * License: MIT
      * Dependencies: 
          - "openai": "^4.0.0"
          - "@anthropic-ai/sdk": "^0.10.0"
          - "@google/generative-ai": "^0.1.0"
    Create tsconfig.json extending ../../tsconfig.base.json with:
      * Compiler options: declaration: true, outDir: ./dist, rootDir: ./src
      * Include: ["./src/**/*"]
      * Exclude: ["node_modules", "dist", "**/*.spec.ts"]
    Create src directory and placeholder src/index.ts file.
    Create src/providers/ directory.
  </action>
  <verify>
    pnpm --filter @baniya/llm-router install completes successfully
    pnpm --filter @baniya/llm-router build runs without errors
    Package.json has correct name, version, main fields, and dependencies
    Tsconfig.json extends the base configuration
  </action>
  <done>
    LLM router package is properly configured with package.json and tsconfig.json, src directory with placeholder index.ts, providers directory, and builds successfully.
  </done>
</task>

<task type="auto">
  <name>Task 2: Implement provider adapters for local and cloud LLMs</name>
  <files>packages/@baniya/llm-router/src/providers/ollama.ts, packages/@baniya/llm-router/src/providers/lmstudio.ts, packages/@baniya/llm-router/src/providers/openai.ts, packages/@baniya/llm-router/src/providers/anthropic.ts, packages/@baniya/llm-router/src/providers/gemini.ts</files>
  <action>
    Create provider adapter files that each export a class or function with:
      * A method to check if the provider is available (health check)
      * A method to send a prompt and get a completion
      * For local providers (Ollama, LM Studio): use fetch to call localhost endpoints
      * For cloud providers: use their respective SDKs
      * Handle errors appropriately (timeouts, connection failures, etc.)
      * Return results in a consistent format: { text, model, tokensIn, tokensOut, costUSD, latencyMs }
    For Ollama: POST to http://localhost:11434/api/generate with model and prompt
    For LM Studio: POST to http://localhost:1234/v1/chat/completions with OpenAI-compatible format
    For OpenAI: use OpenAI SDK with API key from process.env.OPENAI_API_KEY
    For Anthropic: use Anthropic SDK with API key from process.env.ANTHROPIC_API_KEY
    For Gemini: use Google Generative AI SDK with API key from process.env.GOOGLE_API_KEY
  </action>
  <verify>
    Each provider file exists and exports a provider adapter
    Provider adapters have methods for availability checking and completion
    Local providers attempt to connect to correct ports
    Cloud providers attempt to use correct SDKs with env vars
    No actual network calls are made during build/verify (implementation logic only)
  </action>
  <done>
    Provider adapters are implemented for Ollama, LM Studio, OpenAI, Anthropic, and Gemini with appropriate interfaces for availability checking and text completion.
  </done>
</task>

<task type="auto">
  <name>Task 3: Implement sanitizer for hybrid routing</name>
  <files>packages/@baniya/llm-router/src/sanitizer.ts</files>
  <action>
    Create sanitizer.ts with:
      * A function to sanitize payload: recursively replace PII values with typed placeholders
      * A map to store placeholder -> original value mappings (in-memory only, keyed by requestId)
      * A function to desanitize response: replace placeholders with original values using the map
      * A function to clear the map after desanitization
      * Placeholder format: [TYPE_INDEX] where TYPE is uppercase pattern key (EMAIL, AADHAAR, etc.) and INDEX is a number
      * Ensure the map is cleared after use to prevent memory leaks
      * Never write originals to disk or logs
    Export the sanitize, desanitize, and clearMap functions.
  </action>
  <verify>
    File exists and exports sanitize, desanitize, and clearMap functions
    Sanitizer function correctly identifies PII in payloads and replaces with placeholders
    Desanitizer function correctly restores originals from placeholders using the map
    Map is cleared after desanitization
    Implementation handles nested objects and arrays
    No actual PII storage or logging occurs in the implementation
  </action>
  <done>
    Sanitizer is implemented for hybrid routing, correctly replacing PII with typed placeholders and maintaining a reversible in-memory map that is cleared after use.
  </done>
</task>

<task type="auto">
  <name>Task 4: Implement cost estimator</name>
  <files>packages/@baniya/llm-router/src/cost-estimator.ts</files>
  <action>
    Create cost-estimator.ts with:
      * A constant object containing token prices from context.md:
          - gpt-4o: $0.005 in / $0.015 out per 1K tokens
          - gpt-4o-mini: $0.00015 in / $0.0006 out per 1K tokens
          - claude-sonnet-4-6: $0.003 in / $0.015 out per 1K tokens
          - claude-haiku-4-5: $0.00025 in / $0.00125 out per 1K tokens
          - gemini-1.5-flash: $0.000075 in / $0.0003 out per 1K tokens
          - gemini-1.5-pro: $0.00125 in / $0.005 out per 1K tokens
          - ollama/*: $0 / $0
          - lmstudio/*: $0 / $0
      * A function to calculate cost: (tokensIn / 1000) * priceIn + (tokensOut / 1000) * priceOut
      * A function to estimate cost for a provider/model combination
    Export the token prices and cost calculation functions.
  </action>
  <verify>
    File exists and exports token prices and cost calculation functions
    Token prices match exactly those specified in context.md
    Cost calculation function correctly computes cost from token counts
    No hardcoded values that don't match the context.md table
  </action>
  <done>
    Cost estimator is implemented with token prices from context.md and functions to calculate costs for LLM usage.
  </done>
</task>

<task type="auto">
  <name>Task 5: Implement main router logic</name>
  <files>packages/@baniya/llm-router/src/router.ts</files>
  <action>
    Implement the main router in router.ts that:
      * Imports classifier, sanitizer, cost estimator, and provider adapters
      * Implements local provider detection with caching (Ollama on 11434, LM Studio on 1234, cache for 30 seconds)
      * Initializes cloud providers with API keys from environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY)
      * Implements routing logic:
          - Classify the payload using the classifier
          - If level is critical and target would be cloud, throw HardBlockError
          - If level is critical or private -> try local providers (Ollama first, then LM Studio)
          - If level is internal -> use hybrid path (sanitize, send to cloud, desanitize)
          - If level is public -> send directly to cloud
          - For cloud selection: pick cheapest available based on which API keys are set (priority: gemini-1.5-flash → gpt-4o-mini → claude-haiku-4-5)
      * Implements timeouts: 30 seconds for local, 60 seconds for cloud
      * Returns LLMResponse object with all required fields (text, model, tokensIn, tokensOut, costUSD, latencyMs, routing, sensitivity, sanitizerApplied)
      * Handles errors appropriately (LocalProviderUnavailableError for local failures, etc.)
    Export the main router function and any necessary types/classes.
  </action>
  <verify>
    File exists and exports the main router function
    Router logic correctly implements classification-based routing
    Hard block is enforced for critical -> cloud routing
    Local provider detection includes caching and timeout
    Cloud provider selection follows priority order
    Timeouts are implemented (30s local, 60s cloud)
    Returns properly formatted LLMResponse
    Error handling for unavailable providers
  </action>
  <done>
    Main router logic is implemented with proper routing based on classification, hard block for critical data, local/provider detection with caching, hybrid sanitization, and cost estimation.
  </done>
</task>

</tasks>

<verification>
All files are created and the LLM router package builds successfully. The router correctly implements classification-based routing, provider detection, sanitization, cost estimation, and hard block for critical data.
</verification>

<success_criteria>
- Package.json and tsconfig.json are present and correct with proper dependencies
- Provider adapters exist for all required local and cloud providers
- Sanitizer correctly implements hybrid routing with in-memory map clearing
- Cost estimator uses exact token prices from context.md
- Main router implements correct routing logic with hard block, caching, timeouts, and provider selection
- LLM router package builds without errors
- All key functionality is present as verified by manual inspection of the implementation logic
</success_criteria>

<output>
After completion, create .planning/phases/02-intelligence/02-intelligence-02-SUMMARY.md
</output>