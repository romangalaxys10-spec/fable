# Code Review — methodology (vendored into fable)

Captures the review discipline of the `feature-dev:code-reviewer` agent
(ZCode built-in, MIT): read-only reviews for bugs, logic errors, security
vulnerabilities, code quality issues, and project-convention adherence —
with **confidence-based filtering** so only issues that truly matter are
reported.

## The discipline (what makes this reviewer good)

1. **Read-only.** The reviewer never modifies code — it reports. Fixing is a
   separate, approved step. This keeps review and authorship separated (same
   principle as the smart loop's adversarial test-writer).
2. **Confidence-based filtering.** Every finding carries a confidence estimate
   (~90%, ~80%…). Below ~75% confidence, don't report — false positives burn
   the reader's trust and bury real issues.
3. **Severity tiers, enforced:**
   - **Critical** — crashes, data loss, security holes, broken fallback paths
   - **Important** — silent misbehavior, model/ version mismatches, stale caches
   - **Non-issues checked and cleared** — explicitly list what was checked and
     found fine (shell injection, deserialization, zero-guards…) so the reader
     knows the review was thorough, not lazy.
4. **No nitpicks.** Style preferences, "ugly but works" imports, and formatting
   are excluded unless they hide a real problem. Report issues that *matter*.
5. **Concrete fixes.** Every finding includes the exact corrected pattern, not
   "consider refactoring".

## Fable wiring

- After any non-trivial code change, spawn the reviewer:
  Task tool → subagent_type `feature-dev:code-reviewer`, with a focused brief
  (files touched + "confidence-based filtering, <300 words").
- When the reviewer agent is unavailable, self-review against the checklist
  above (severity tiers, confidence, non-issues-cleared) — never skip review.
- Findings flow into the same propose → approve → fix → verify loop as
  security findings: the user decides "fix" or "ignore" per item.
- Fixed findings get a `record.js` lesson card.
