---
description: Execute the next incomplete plan in the current Baniya phase
---

# Planning Execute

Execute the next incomplete plan in the active phase. Each plan is a self-contained task file with clear objectives, files to modify, and verification steps.

## Steps

// turbo-all

1. Read `.planning/STATE.md` to find the current active phase and plan
2. Read `.planning/ROADMAP.md` to find the first incomplete plan (unchecked `[ ]` item)
3. Read the corresponding plan file from `.planning/phases/{phase_dir}/{plan_id}-PLAN.md`

4. Display what you're about to execute:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BANIYA ► EXECUTING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Plan: {plan_id} — {plan_name}
Phase: {phase_number} — {phase_name}
Tasks: {task_count}
```

5. Read the canonical spec files for implementation context:
   - `context.md` — for types, patterns, schemas, design tokens, constraints
   - `prompt.md` — for detailed implementation instructions
   - Only read sections relevant to the current plan

6. Execute each task in the plan sequentially:
   - For each task, implement the code changes described
   - Follow the spec from `context.md` and `prompt.md` exactly
   - Use the design tokens from §14 of context.md
   - Use inline SVG for all icons (no icon library)
   - No UI component library (hand-build everything)

7. After completing all tasks, run the verification steps from the plan

8. Create a summary file `.planning/phases/{phase_dir}/{plan_id}-SUMMARY.md`:

```markdown
# Summary: {plan_name}

## What Was Built
- {list of files created/modified}

## Key Decisions
- {any decisions made during implementation}

## Issues
- {any issues encountered, or "None"}

## Verification
- {verification results}
```

9. Update `.planning/ROADMAP.md`:
   - Mark the completed plan with `[x]`

10. Update `.planning/STATE.md`:
    - Update "Active Plan" to the next incomplete plan
    - Add completion note to the "What's Done" section
    - If all plans in the phase are done, advance "Active Phase" to the next phase

11. Update `.planning/REQUIREMENTS.md`:
    - Move any addressed requirements from Active to Validated

12. Display completion:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BANIYA ► PLAN COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completed: {plan_id} — {plan_name}
Next: {next_plan_id} — {next_plan_name}

Run `/planning-execute` to continue, or `/planning-progress` to review.
```
