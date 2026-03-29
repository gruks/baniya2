---
description: Show current Baniya project progress and what to do next
---

# Planning Progress

Show the current state of the Baniya project — what's done, what's active, and what's next.

## Steps

1. Read `.planning/STATE.md` to understand current position
2. Read `.planning/ROADMAP.md` to see phase completion status
3. Read `.planning/REQUIREMENTS.md` to see requirement coverage

4. Display a summary in this format:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BANIYA ► PROGRESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase Status:
  ✅ Phase 1: Foundation (3/3 plans)
  ✅ Phase 2: Intelligence (3/3 plans)
  ✅ Phase 3: Engine (3/3 plans)
  ⚠️  Phase 4: Server (3/4 plans — 04-04 remaining)
  ⚠️  Phase 5: Editor (3/5 plans — 05-04, 05-05 remaining)
  ⚠️  Phase 6: Dashboard & Polish (1/4 plans — 06-02, 06-03, 06-04 remaining)

Currently Active:
  → Phase 4, Plan 04-04: Zod validation on all routes

Requirements:
  ✅ 13/29 validated
  ⏳ 16/29 active

Next Steps:
  1. Execute plan 04-04 (Zod validation)
  2. Execute plan 05-04 (missing editor components)
  3. Execute plan 05-05 (dashboard sub-components)
```

5. If there is an active plan, show its objective from the corresponding PLAN.md file

6. Suggest the next command: "Run `/planning-execute` to execute the next plan"
