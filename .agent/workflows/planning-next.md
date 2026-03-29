---
description: Auto-detect and run the next logical step in Baniya development
---

# Planning Next

Automatically determine what to do next and do it. This is the "just keep building" command.

## Steps

// turbo-all

1. Read `.planning/STATE.md` and `.planning/ROADMAP.md`

2. Determine the next action based on state:

   **If there's an incomplete plan in the current phase:**
   → Execute it (follow the `/planning-execute` workflow steps)

   **If the current phase is complete but not verified:**
   → Run verification (follow the `/planning-verify` workflow steps)

   **If the current phase is verified and there's a next phase:**
   → Advance to the next phase and execute its first plan

   **If all phases are complete:**
   → Display "🎉 All phases complete! Run end-to-end verification." and suggest Plan 06-04.

3. After completing the action, display:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BANIYA ► NEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Just completed: {what was done}
Up next: {what's coming}

Run `/planning-next` to continue building.
```
