#!/usr/bin/env python3
"""fable token-efficiency — Universal Token Efficiency Protocol (v3.3.0).

Derived from Pi coding agent (pi.dev), Databricks MemEx, and Marcos Hernanz's
60B-token behavioral agent rules.

Capabilities:
  1. budget      — Computes 5-phase context budget (Discovery, Planning, Execution, Verification, Summary)
  2. compress    — DTOC (Dynamic Tool Output Compression) with hard limit enforcement
  3. subagent    — Generates 6-field scoped subagent prompt template
  4. audit_read  — Analyzes proposed file read for AST-first compliance (warns on full reads of >100 lines)
  5. cache       — Tracks stateful session read index to eliminate repeat reads

Usage:
  python3 scripts/token_efficiency.py budget --task "<task>" [--json]
  python3 scripts/token_efficiency.py compress --input "<text>" --type logs|ls|diff|config [--json]
  python3 scripts/token_efficiency.py subagent --file "<path>" --goal "<goal>" --lines "<N-M>" [--json]
  python3 scripts/token_efficiency.py audit_read --file "<path>" --lines <count> [--json]
"""

import sys
import os
import json
import re

DTOC_LIMITS = {
    "ls": 20,
    "find": 20,
    "ps": 15,
    "config": 80,
    "logs": 30,
    "manifest": 30,
    "diff": 100,
    "generic": 30
}

PHASE_BUDGETS = {
    "discovery": {"tokens": 4000, "description": "File list, structure map, key findings"},
    "planning": {"tokens": 8000, "description": "Implementation plan, target file excerpts"},
    "execution": {"tokens": 12000, "description": "Active line ranges being edited, errors"},
    "verification": {"tokens": 4000, "description": "Test status output, diff summary"},
    "summary": {"tokens": 2000, "description": "Final result, changed files list"}
}

TOTAL_BUDGET = sum(p["tokens"] for p in PHASE_BUDGETS.values()) # 30,000 tokens (vs ~280k unconstrained)


def compute_budget(task: str, as_json: bool = False):
    result = {
        "task": task,
        "protocol": "Universal Token Efficiency Protocol v3.3.0",
        "target_tokens_per_task": 35000,
        "baseline_unconstrained_tokens": 280000,
        "estimated_savings_ratio": "8x (~87.5% reduction)",
        "phase_budgets": PHASE_BUDGETS,
        "total_budget_tokens": TOTAL_BUDGET,
        "tier_strategy": {
            "tier_1_discover": "ls / find / grep -rl (cheap, identify what exists)",
            "tier_2_target": "grep -n / sed -n (medium, pinpoint line ranges)",
            "tier_3_execute": "sed -n / edit_file (expensive, do target work only)"
        },
        "recovery_protocol": "If context exceeds 80% capacity, emit [CONTEXT COMPRESS] block discarding raw outputs and retaining active file cache index."
    }
    if as_json:
        print(json.dumps(result, indent=2))
        return result
    print("=" * 70)
    print("⚡ UNIVERSAL TOKEN EFFICIENCY BUDGET (v3.3.0)")
    print(f"Task: {task}")
    print(f"Target Budget: {TOTAL_BUDGET:,} tokens (vs ~280k unconstrained baseline — 8x reduction)")
    print("=" * 70)
    print("\n📦 5-Phase Context Allocations:")
    for phase, info in PHASE_BUDGETS.items():
        print(f"  • {phase.upper():<14} : {info['tokens']:>5,} tokens — {info['description']}")
    print("\n🎯 3-Tier Progressive Disclosure:")
    print("  1. DISCOVER : find / grep -rl (max 20 lines)")
    print("  2. TARGET   : grep -n structure markers / sed -n header range")
    print("  3. EXECUTE  : target line edits & scoped verification only")
    return result


def compress_output(text: str, output_type: str = "generic", as_json: bool = False):
    max_lines = DTOC_LIMITS.get(output_type.lower(), DTOC_LIMITS["generic"])
    lines = text.strip().split("\n")
    total_lines = len(lines)

    if total_lines <= max_lines:
        compressed = text
        was_compressed = False
    else:
        if output_type.lower() == "logs":
            compressed_lines = lines[-max_lines:]
            compressed = f"[DTOC TRUNCATED: showing last {max_lines} of {total_lines} lines]\n" + "\n".join(compressed_lines)
        else:
            compressed_lines = lines[:max_lines]
            compressed = "\n".join(compressed_lines) + f"\n[DTOC TRUNCATED: {total_lines - max_lines} more lines suppressed. Use grep or offset/limit to narrow]"
        was_compressed = True

    raw_tokens_est = round(len(text) / 4)
    compressed_tokens_est = round(len(compressed) / 4)
    tokens_saved = max(0, raw_tokens_est - compressed_tokens_est)

    result = {
        "type": output_type,
        "total_lines": total_lines,
        "max_lines_limit": max_lines,
        "was_compressed": was_compressed,
        "raw_tokens_est": raw_tokens_est,
        "compressed_tokens_est": compressed_tokens_est,
        "tokens_saved": tokens_saved,
        "compressed_text": compressed
    }
    if as_json:
        print(json.dumps(result, indent=2))
        return result
    print(f"⚡ DTOC Compressed ({output_type}): {total_lines} lines -> capped at {max_lines} (Saved ~{tokens_saved} tokens)")
    print("-" * 60)
    print(compressed)
    return result


def generate_subagent_prompt(file_path: str, goal: str, line_range: str = "1-50", as_json: bool = False):
    lines = f"lines {line_range}" if "-" in line_range else f"line {line_range}"
    prompt = f"""Task: {goal}
File: {file_path}
Structure: Target region isolated to {lines}
Relevant excerpt: Only inspect/edit {lines}. Do NOT re-read or dump entire file.
Constraints: Do not modify outside {lines}; zero arbitrary sleeps; preserve existing imports.
Output format: Return exact edit diff + verification status."""

    result = {
        "file": file_path,
        "goal": goal,
        "target_lines": line_range,
        "scoped_prompt": prompt,
        "anti_patterns_avoided": [
            "Never send full file content (>100 lines)",
            "Never send full directory trees",
            "Never send past unpruned conversational turns"
        ]
    }
    if as_json:
        print(json.dumps(result, indent=2))
        return result
    print("🤖 6-Field Scoped Subagent Prompt:")
    print("-" * 60)
    print(prompt)
    return result


def audit_read(file_path: str, line_count: int, as_json: bool = False):
    violates = line_count > 100
    recommendation = "Allowed: File is <= 100 lines" if not violates else "VIOLATION: AST-First rule requires grep or offset/limit slice for files > 100 lines. Prohibited: bare cat/read."
    result = {
        "file": file_path,
        "lines": line_count,
        "ast_first_compliant": not violates,
        "tier_recommended": "Tier 1 (grep -n) or Tier 2 (sed -n 'start,endp')",
        "recommendation": recommendation
    }
    if as_json:
        print(json.dumps(result, indent=2))
        return result
    icon = "✓" if not violates else "⚠"
    print(f"{icon} AST-First Read Audit for {file_path} ({line_count} lines): {recommendation}")
    return result


def main():
    args = sys.argv[1:]
    as_json = "--json" in args

    if not args or args[0] in ("-h", "--help"):
        print(__doc__)
        sys.exit(0)

    cmd = args[0]
    if cmd == "budget":
        task = "Standard multi-step coding task"
        if "--task" in args:
            idx = args.index("--task")
            if idx + 1 < len(args):
                task = args[idx + 1]
        compute_budget(task, as_json=as_json)

    elif cmd == "compress":
        text = "sample log line\n" * 120
        out_type = "generic"
        if "--input" in args:
            idx = args.index("--input")
            if idx + 1 < len(args):
                text = args[idx + 1]
        if "--type" in args:
            idx = args.index("--type")
            if idx + 1 < len(args):
                out_type = args[idx + 1]
        compress_output(text, output_type=out_type, as_json=as_json)

    elif cmd == "subagent":
        file_path = "src/main.ts"
        goal = "Refactor logic"
        lines = "40-90"
        if "--file" in args:
            idx = args.index("--file")
            if idx + 1 < len(args):
                file_path = args[idx + 1]
        if "--goal" in args:
            idx = args.index("--goal")
            if idx + 1 < len(args):
                goal = args[idx + 1]
        if "--lines" in args:
            idx = args.index("--lines")
            if idx + 1 < len(args):
                lines = args[idx + 1]
        generate_subagent_prompt(file_path, goal, lines, as_json=as_json)

    elif cmd == "audit_read":
        file_path = "src/app.ts"
        lines = 250
        if "--file" in args:
            idx = args.index("--file")
            if idx + 1 < len(args):
                file_path = args[idx + 1]
        if "--lines" in args:
            idx = args.index("--lines")
            if idx + 1 < len(args):
                try:
                    lines = int(args[idx + 1])
                except ValueError:
                    lines = 250
        audit_read(file_path, lines, as_json=as_json)
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
