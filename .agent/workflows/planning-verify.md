---
description: Verify a Baniya phase achieved its goals against requirements
---

# Planning Verify

Verify that the current or specified phase achieved its goals. Checks code against requirements and marks phase complete.

## Steps

1. Read `.planning/STATE.md` to find the current phase
2. Read `.planning/ROADMAP.md` to confirm all plans in the phase are marked `[x]`
3. Read `.planning/REQUIREMENTS.md` to find requirements assigned to this phase

4. For each requirement assigned to this phase:
   - Check if the corresponding code exists and is functional
   - Verify against the verification steps in each plan's PLAN.md file
   - Mark as PASS or FAIL

5. Display verification report:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 BANIYA ► VERIFICATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase {X}: {Name}

Requirements:
  ✅ REQ-XX: {description} — PASS
  ✅ REQ-XX: {description} — PASS
  ❌ REQ-XX: {description} — FAIL: {reason}

Score: {passed}/{total}
```

6. If all requirements pass:
   - Create `.planning/phases/{phase_dir}/VERIFICATION.md` with results
   - Mark phase as "✅ Complete" in ROADMAP.md
   - Update STATE.md to advance to next phase
   - Display: "Phase verified! Run `/planning-next` to continue."

7. If any requirements fail:
   - List the failures with specific details on what's missing
   - Suggest fix: "Run `/planning-execute` to fix gaps, then `/planning-verify` again."
   - Do NOT mark phase as complete
