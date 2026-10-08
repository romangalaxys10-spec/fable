---
name: token-efficiency
title: Universal Token Efficiency Protocol (v3.3.0 — Universal Edition)
description: >
  Universal Token Efficiency Protocol derived from Pi coding agent (pi.dev),
  Databricks MemEx harness architectures, and Marcos Hernanz's 60B-token behavioral rules.
  Works across ALL AI coding agents and IDEs (Antigravity, Z.ai ZCode, Claude Code, Cursor, Windsurf, Cline, Aider).
  Enforces AST-first file access, progressive disclosure, dynamic output compression (DTOC),
  subagent scoping, phase compaction, session caches, and OS memory guard protocols.
category: agent-efficiency
domain: token-optimization
version: 3.3.0
target-tokens-per-task: 35000
baseline-tokens-avoided: 120000
license: MIT
---

# Universal Token Efficiency Protocol (v3.3.0 — Universal Edition)

## Derived from Pi Coding Agent + Databricks MemEx + Marcos Hernanz 60B Agent Rules

> **Core Principle**: The context window is working memory, not a junk drawer.  
> Every token loaded must earn its place. Load the minimum required to decide what to load next.

---

## Tool Abstraction Mapping Table

This protocol applies universally regardless of the specific tool names used by your agent harness:

| Protocol Primitive | Antigravity / AI Studio | Claude Code / CLI | Cursor / Windsurf | Cline / Roo Code | Aider / Shell |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Literal Search** | `grep_search` / `run_command grep` | `Grep` | `codebase_search` | `grep_search` | `grep -rn` |
| **Targeted Read** | `view_file(StartLine, EndLine)` | `View(offset, limit)` | `read_file(range)` | `read_file(range)` | `sed -n 'N,Mp'` |
| **Directory List** | `list_dir` | `LS` | `file_search` / `ls` | `list_dir` | `ls -la \| head` |
| **Run Command** | `run_command` | `Bash` | `terminal` | `execute_command` | `bash` |
| **Spawn Subagent** | `invoke_subagent` / Task | `Agent` | Sub-task agent | Task / MCP tool | Background task |

---

## 1. 🎯 AST-First File Access (Never Read Whole Files Blindly)

When you need to understand a file's structure or locate code:

```
Tier 1: grep -n 'pattern' file          ← literal string match (cheapest)
Tier 2: grep -n 'pattern|other' file    ← regex only when literal won't suffice
Tier 3: sed -n 'start,endp' file         ← read ONLY the line range you need
Tier 4: cat file                         ← LAST RESORT: full read only when:
                                           • File is < 50 lines, OR
                                           • You've already grepped and confirmed
                                             every line is relevant
```

* **Forbidden**: `cat` or `read` on files > 100 lines without first running `grep` or `sed -n`.
* **Forbidden**: `Read` tool on files > 200 lines without specifying offset+limit range.
* **Always prefer**: `view_file(StartLine=N, EndLine=M)` over unconstrained full file reads.

---

## 2. 🔍 Search Hierarchy (Cheapest Match First)

When searching across files for a symbol, pattern, or definition:

```bash
# Step 1: Literal grep (fastest, cheapest)
grep -rn 'exact_function_name' src/ | head -n 20

# Step 2: Regex grep (only if step 1 returns nothing useful)
grep -rn 'function_name\|varName\|className' src/ | head -n 20

# Step 3: Targeted file reads (ONLY after steps 1-2 narrowed it to < 5 locations)
sed -n '42,67p' src/file.ts
```

* **Rule**: Never run recursive `grep` without `-l` (files-with-matches mode) or `head -n 20` to count hits.
* If `grep -rl` returns > 20 files, narrow the directory scope before proceeding.

---

## 3. ⚡ Dynamic Tool Output Compression (DTOC Table & Protocol)

All command outputs must be truncated before being sent to the LLM context.

### Hard Output Limits Table

| Output Type | Max Lines | Fallback Shell Command |
| :--- | :--- | :--- |
| **File listings** (`ls`, `find`) | **20** | `head -n 20` |
| **Process lists** (`ps`, `pstree`) | **15** | `head -n 15` |
| **Config dumps** (`json`, `yaml`, `env`) | **80** | `head -n 80` |
| **Log output** | **30** | `tail -n 30` |
| **Package manifests** (`npm ls`, `pip list`) | **30** | `head -n 30` |
| **Diff output** | **100** | `head -n 100` |
| **Generic unknown output** | **30** | `head -n 30` |

---

## 4. 📦 Progressive Disclosure / JIT Loading (3-Tier Model)

Never load everything upfront. Follow this 3-tier progressive cascade:

```
TIER 1 — DISCOVER (cheap):
  ls -la dir/ | head -n 20
  find dir/ -maxdepth 2 -type f | head -n 20
  grep -rl 'keyword' dir/ | head -n 10
  → Goal: Identify WHAT exists and WHERE

TIER 2 — TARGET (medium cost):
  sed -n '1,50p' file                      # read headers/imports
  grep -n 'class\|function\|export' file    # find structure markers
  wc -l file                               # know total size before reading
  → Goal: Pinpoint exact regions of interest

TIER 3 — EXECUTE (expensive — do last):
  sed -n '78,134p' file                    # read target lines
  Edit file with exact line range          # perform edit
  Run build/test verification              # verify fix
  → Goal: Perform the actual work
```

* **HARD RULE**: When starting any task: **Always begin at Tier 1**. Never jump to Tier 3 unless the user explicitly asks for a full-file operation on a known-small file.

---

## 5. 🤖 Subagent Context Scoping & 6-Field Prompt Template

When dispatching subagents, **minimize their context payload**:

```text
Task: [one-line goal]
File: [path] ([N] lines)
Structure: [line ranges with 1-line descriptions]
Relevant excerpt: [only the 20-50 lines actually needed]
Constraints: [scope boundary — what NOT to touch]
Output format: [what to return]
```

### 🚫 Subagent Anti-Patterns:
- 🛑 NEVER send full file contents (> 100 lines).
- 🛑 NEVER send full directory trees.
- 🛑 NEVER send unpruned conversational history.

---

## 6. 🧠 Session-Aware File Cache (No Repeat Reads)

Maintain a stateful index of read files during the session.
Before ANY `Read`, `cat`, `sed`, or `grep` on a file already touched:
1. Check: *"Have I already read this file or line range?"*
2. If yes → reference the earlier read. Re-read **only** if:
   - The file was modified since last read, OR
   - You need a different line range than previously read.
3. If re-reading is needed, read **only the new range delta**.

---

## 7. 🧹 Phase Completion & Context Compaction

### Context Budget Per Task Phase:

| Phase | Max Context Tokens | What to Keep |
| :--- | :--- | :--- |
| **Discovery** | **~4,000** | File list, structure map, key findings |
| **Planning** | **~8,000** | Implementation plan, target file excerpts |
| **Execution** | **~12,000** | Active line ranges being edited, errors |
| **Verification** | **~4,000** | Test status output, diff summary |
| **Summary** | **~2,000** | Final result, changed files list |

### Context Limit Recovery Protocol (>80% Window Used):
If context window usage exceeds 80%:
1. Emit a `[CONTEXT COMPRESS]` block summarizing completed work.
2. Discard raw tool outputs from finished phases.
3. Retain ONLY: current working state + pending goals + active file cache index.

---

## 8. 🛡️ OS System Resource & Memory Guard Protocol

Mandatory system rules to prevent OOM kernel kills and CPU lag:
1. **Global Node.js / V8 Heap Memory Limits**:
   - Always enforce `--max-old-space-size=2048 --optimize-for-size` in environment options (`NODE_OPTIONS`).
2. **ZRAM Compression Tuning**:
   - High-ratio `zstd` compressed RAM swap (`/dev/zram0`) active with `vm.swappiness=180` and `vm.page-cluster=0`.
3. **Electron & Dev Server Execution Safety**:
   - On Linux environments, call `app.disableHardwareAcceleration()` and set `--disable-gpu`.

---

## 9. 🧠 Marcos Hernanz 60B-Token Behavioral Agent Rules

1. **Research Before Design**: Inspect established implementations and existing architecture before designing new solutions.
2. **Simplicity Over Abstraction**: Avoid premature abstraction or guessing future requirements.
3. **Iterative E2E Delivery**: Build a minimum working end-to-end version first, verify it works in runtime, then add features incrementally.
4. **Code Hygiene & Modular Scope**: Never swap working code for unfinished complexity.
5. **Audit Before Re-inventing**: Search pre-existing utilities and libraries before writing custom helpers.
6. **Verify Dependency Specs**: Read authoritative package definitions and docs before assuming a library lacks a feature.
7. **Long-Term Architecture**: Make decisions with long-term perspective. Avoid superficial patches that create technical debt.
8. **Living Protocol**: Treat instructions as a living document, updating them based on empirical failure logs.
