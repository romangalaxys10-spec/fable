# Skills-root auto-trigger snippet for zcode-smart-skill.
# Append this section to your agent instructions file (AGENTS.md / CLAUDE.md)
# so the skill also fires automatically — not just via /smart.

# Smart mode (auto-trigger + /smart)

- The `smart` skill (GVS5H ledger orchestration: plan → ideate distinct approaches →
  one-task fresh-subagent workers → verify by running code → switch-when-stuck) is the
  designated heavy-reasoning mode.
- AUTO-INVOKE it when a task matches its trigger list: hard algorithm/optimization/
  concurrency work, a fix that already failed twice, architecture with subtle invariants,
  competitive-programming-style problems, or user says "smart/hard/properly".
- ALWAYS invoke it when the user types `/smart`.
- When invoked, announce "Entering smart mode (ledger orchestration)" so the user
  knows the cost profile changed. Its own guards (max 10 iters, verify-before-done,
  blocked-loop stop) apply.
