#!/usr/bin/env python3
"""QA Skills Engine & QA-Architect Planner (inspired by PramodDutta/qaskills).

Provides testing mental models, curated skill catalog, and automated
QA-Architect test plan decomposition for AI coding agents.

Usage:
  python3 vendor/qa-skills/qa_skills.py list [--json]
  python3 vendor/qa-skills/qa_skills.py search <query> [--json]
  python3 vendor/qa-skills/qa_skills.py inspect <skill_id>
  python3 vendor/qa-skills/qa_skills.py plan --task "<feature description>" [--json]
"""

import os
import sys
import json
import re

HERE = os.path.dirname(os.path.abspath(__file__))
SEEDS_DIR = os.path.join(HERE, "seed-skills")


def load_skills():
    skills = []
    if not os.path.exists(SEEDS_DIR):
        return skills
    for entry in sorted(os.listdir(SEEDS_DIR)):
        skill_path = os.path.join(SEEDS_DIR, entry, "SKILL.md")
        if os.path.isfile(skill_path):
            with open(skill_path, "r", encoding="utf-8") as f:
                content = f.read()
            # Parse YAML frontmatter
            meta = {}
            if content.startswith("---"):
                parts = content.split("---", 2)
                if len(parts) >= 3:
                    frontmatter = parts[1]
                    for line in frontmatter.strip().split("\n"):
                        if ":" in line:
                            k, v = line.split(":", 1)
                            meta[k.strip()] = v.strip()
            skills.append({
                "id": entry,
                "name": meta.get("name", entry),
                "title": meta.get("title", entry.replace("-", " ").title()),
                "category": meta.get("category", "Automation"),
                "path": skill_path,
                "snippet": content[:300].replace("\n", " "),
                "full_content": content
            })
    return skills


def list_skills(as_json=False):
    skills = load_skills()
    if as_json:
        print(json.dumps({"count": len(skills), "skills": skills}, indent=2))
        return
    print(f"📦 Curated QA Skills Catalog ({len(skills)} skills):")
    for s in skills:
        print(f"  • [{s['category']}] {s['id']} — {s['title']}")


def search_skills(query, as_json=False):
    skills = load_skills()
    q = query.lower()
    matches = [s for s in skills if q in s["id"].lower() or q in s["title"].lower() or q in s["category"].lower() or q in s["full_content"].lower()]
    if as_json:
        print(json.dumps({"query": query, "count": len(matches), "skills": matches}, indent=2))
        return
    print(f"🔍 Found {len(matches)} matching QA skills for '{query}':")
    for s in matches:
        print(f"  • {s['id']} ({s['category']}): {s['title']}")


def inspect_skill(skill_id):
    skills = load_skills()
    skill = next((s for s in skills if s["id"] == skill_id), None)
    if not skill:
        print(f"Error: Skill '{skill_id}' not found.", file=sys.stderr)
        sys.exit(1)
    print(skill["full_content"])


def generate_qa_architect_plan(task, as_json=False):
    """Core QA-Architect reasoning: Decompose any task into a holistic QA Strategy."""
    lower = task.lower()

    # Determine framework recommendations
    is_ui = any(k in lower for k in ["ui", "button", "page", "modal", "screen", "frontend", "react", "view"])
    is_api = any(k in lower for k in ["api", "endpoint", "rest", "graphql", "route", "post", "get", "put", "delete"])
    is_perf = any(k in lower for k in ["latency", "speed", "scale", "throughput", "load", "concurrent", "k6"])

    # Determine QA skills to link
    recommended_skills = ["test-case-decomposition", "jest-vitest-unit"]
    if is_ui:
        recommended_skills.extend(["playwright-e2e", "axe-accessibility"])
    if is_api:
        recommended_skills.append("api-testing-rest")
    if is_perf:
        recommended_skills.append("k6-performance")
    recommended_skills.append("flaky-test-quarantine")

    # Generate 4-quadrant decomposition
    plan = {
        "task": task,
        "role": "Principal QA Architect (QASkills.sh)",
        "strategy_summary": f"Comprehensive quality architecture for '{task}', enforcing 4-quadrant test decomposition, zero arbitrary timeouts, and strict contract verification.",
        "pyramid_distribution": {
            "unit": "60% (Vitest fast-isolation invariants)",
            "integration_api": "30% (Schema validation & contract envelopes)",
            "e2e_ui": "10% (Playwright user journeys & web-first assertions)"
        },
        "four_quadrants": {
            "q1_positive_happy_path": [
                f"Valid request parameters generate expected 200/201 response and state transition",
                f"Complete end-to-end user journey executes cleanly with verified UI locator visibility"
            ],
            "q2_negative_error_handling": [
                f"Missing or malformed payload fields rejected with structured 400 Bad Request error",
                f"Unauthorized request without Bearer token rejected with 401 Unauthorized envelope",
                f"Non-existent entity ID returns clean 404 response without unhandled promise crash"
            ],
            "q3_boundary_resilience": [
                f"Boundary limits tested at min, min-1, max, and max+1 thresholds",
                f"Network latency injection (200ms-1500ms delay) handled gracefully without UI freezing",
                f"Rapid duplicate submissions verified for idempotency (no duplicate charge or write)"
            ],
            "q4_security_accessibility": [
                f"SQL injection and XSS input sanitization verified against malicious payloads",
                f"WCAG 2.1 AA automated audit checks zero critical violations and valid tab order"
            ]
        },
        "recommended_qa_skills": recommended_skills,
        "sample_test_scaffold": f"""// QA-Architect Generated Spec for: {task}
import {{ describe, it, expect, beforeEach }} from 'vitest';

describe('{task} — Test Suite', () => {{
  beforeEach(() => {{
    // Pristine test state
  }});

  it('Q1: executes primary happy-path workflow with valid contract', async () => {{
    // Arrange & Act
    const result = {{ status: 'success' }};
    // Assert
    expect(result.status).toBe('success');
  }});

  it('Q2: rejects invalid input with structured validation error', async () => {{
    // Verify explicit error envelope
    expect(() => {{ throw new Error('Validation failed'); }}).toThrow(/Validation failed/);
  }});

  it('Q3: handles boundary threshold without data corruption', () => {{
    // Boundary check
    expect(true).toBe(true);
  }});
}});
""",
        "quality_gates": [
            "All unit and integration tests passing (100% green)",
            "Zero flaky tests: intermittent failures quarantined immediately",
            "Zero critical accessibility violations detected by Axe",
            "95th percentile API response latency strictly under 300ms SLA"
        ]
    }

    if as_json:
        print(json.dumps(plan, indent=2))
        return

    print("=" * 70)
    print("🏛️  QA-ARCHITECT STRATEGY BRIEF")
    print(f"Target Feature: {task}")
    print("=" * 70)
    print("\n📐 Test Pyramid Distribution:")
    for k, v in plan["pyramid_distribution"].items():
        print(f"  • {k.upper()}: {v}")
    print("\n🎯 4-Quadrant Test Decomposition:")
    for quad, cases in plan["four_quadrants"].items():
        print(f"  [{quad.upper()}]:")
        for c in cases:
            print(f"    - {c}")
    print("\n📦 Recommended QA Skills:")
    for sk in plan["recommended_qa_skills"]:
        print(f"  • {sk}")
    print("\n🛡️ Quality Gates:")
    for g in plan["quality_gates"]:
        print(f"  ✓ {g}")


if __name__ == "__main__":
    args = sys.argv[1:]
    if not args or args[0] in ["--help", "-h"]:
        print(__doc__)
        sys.exit(0)

    cmd = args[0]
    as_json = "--json" in args

    if cmd == "list":
        list_skills(as_json=as_json)
    elif cmd == "search":
        if len(args) < 2 or args[1] == "--json":
            print("Error: query required for search.", file=sys.stderr)
            sys.exit(1)
        search_skills(args[1], as_json=as_json)
    elif cmd == "inspect":
        if len(args) < 2:
            print("Error: skill_id required for inspect.", file=sys.stderr)
            sys.exit(1)
        inspect_skill(args[1])
    elif cmd == "plan":
        task_str = "Feature implementation"
        if "--task" in args:
            idx = args.index("--task")
            if idx + 1 < len(args):
                task_str = args[idx + 1]
        elif len(args) > 1 and not args[1].startswith("--"):
            task_str = args[1]
        generate_qa_architect_plan(task_str, as_json=as_json)
    else:
        print(f"Unknown command: {cmd}", file=sys.stderr)
        sys.exit(1)
