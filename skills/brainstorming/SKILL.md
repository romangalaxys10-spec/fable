---
name: fable-brainstorming
description: "Use before any creative work through /fable — creating features, building components, adding functionality, or modifying behavior. Explores user intent, requirements and design through collaborative dialogue (spike / bounded / architectural paths) before implementation. Adapted for fable from obra/superpowers (MIT)."
---

# Brainstorming Ideas Into Designs (fable edition)

Adapted from obra/superpowers `skills/brainstorming` (MIT, © Jesse Vincent) —
pristine copy vendored at `vendor/superpowers-brainstorming/SKILL.md`. The
technique below is upstream's; the **Fable integration** section at the end
routes each path into fable's tooling.

Help turn ideas into fully formed designs and specs through natural collaborative dialogue.

Start by classifying how much process the request needs, then work
through your path: understand the context, refine the idea, present a
design, and get your human partner's approval.

## Establish Shared Understanding

The outcome of brainstorming is an understanding your human partner can
recognize and correct, grounded in what they want to accomplish.

1. **Discover intent.** Use the request and available context to identify
   the intended outcome, who it is for, and what success looks like. When
   that information is missing, ask one focused question about purpose or
   intended use before proposing features or an approach.
2. **Write back your understanding.** Summarize the intended outcome,
   relevant constraints, and success criteria in a short note your partner
   can assess. Separate what they said from assumptions. Invite correction
   and incorporate their answer before treating this as the design brief.
3. **Carry intent into the design.** Preserve the agreed understanding in
   the selected path's design artifact: the written spec for architectural
   work, or the in-chat design/probe for bounded work and spikes. Check
   proposed features and technical choices against that understanding.

When the request already supplies the purpose and constraints, reflect
that understanding instead of asking the same questions again. Keep the
note concise; its accuracy and the opportunity to correct it matter.

<HARD-GATE>
Before taking any implementation action — writing product code,
scaffolding via smart_scaffold.py or produce.py, or installing
dependencies — complete the selected path's prerequisites:

- Spike: the human partner approves the question and probe.
- Bounded: the human partner approves the short in-chat design.
- Architectural: the human partner reviews and approves the written spec,
  then reviews the implementation plan and selects its execution method.

A reply approves the stage actually presented. Resume at the earliest
incomplete stage; do not turn one approval into permission to skip the
rest of the selected path. Read-only exploration and **read-only fable
research** (search.js / retrieve.js / boost.py with default flags — they
never write code or install anything) are allowed while prerequisites
remain incomplete.
</HARD-GATE>

## Three Paths

Before your first question, classify the request and say the
classification out loud — "this looks bounded, so I'll present a short
design here rather than write a spec" — so your human partner can
override it:

- **Spike** — a feasibility question whose output is an answer, not code
  you keep. Present the question and probe plan in 2-3 sentences, get a
  nod, investigate as cheaply as correctness allows, report findings as a
  recommendation. Label anything built as throwaway.
- **Bounded** — a well-scoped change to code that already exists in this
  repo. If there is no existing flow to change, the task is not bounded.
  Ask the clarifying questions that matter, present a short design IN
  CHAT, and STOP. Implementation starts only after your human partner
  says yes.
- **Architectural** — new projects, new subsystems, interface changes.
  Full process: questions, approaches, sectioned design, written spec,
  then the implementation plan (in fable: the smart ledger).

When in doubt between two paths, take the heavier one. The ratchet is
one-way: hidden complexity discovered mid-task upgrades the path — stop,
say so, and step up. Nothing downgrades mid-task.

## Red Flags

| Thought | Reality |
|---------|---------|
| "This is too simple to need a design" | Follow the selected path: bounded gets a short chat design; architectural gets the written spec and plan handoff. |
| "I'll call it bounded and skip the spec" | Reaching for a label to skip work IS the doubt — take the heavier path. |
| "The design is obvious — I'll start while they read it" | The gate is the approval, not the design's length. Present, then stop until you hear yes. |
| "I understand this kind of app, so it's bounded" | Bounded measures the repo, not your familiarity. A new project is architectural. |
| "The spike works, so I'll keep the code" | A spike's output is an answer. Keeping the code is a new request — classify it. |
| "They approved the spike, so the follow-up is approved too" | Each task gets its own classification and its own approval. |

## Checklist

**Spike:**
1. Explore project context — enough to frame the probe
2. Present question + probe plan — 2-3 sentences
3. Get approval — a nod is enough
4. Investigate — as cheaply as correctness allows
5. Report findings — recommendation; label anything built as throwaway

**Bounded:**
1. Explore project context — check files, docs, recent commits
2. Ask clarifying questions — one at a time, the ones that matter
3. Present short design in chat — approach, files touched, testing
4. Get approval — STOP and wait for an explicit yes
5. Implement — normal workflow; then `record.js` the lesson

**Architectural:**
1. Explore project context — check files, docs, recent commits
2. Ask clarifying questions — one at a time
3. Propose 2-3 approaches — with trade-offs and your recommendation
4. Present design — in sections, approval after each
5. Write design doc — `docs/specs/YYYY-MM-DD-<topic>-design.md` (commit it)
6. Spec self-review — placeholders, contradictions, ambiguity, scope
7. User reviews written spec — wait for approval
8. Transition to implementation — **fable smart ledger** (see below)

## The Process

**Understanding the idea:**
- Check current project state first (files, docs, recent commits)
- If the request describes multiple independent subsystems, flag it and
  help decompose before refining details; each sub-project gets its own
  spec → plan → implementation cycle
- Ask questions one at a time; prefer multiple choice when possible;
  focus on purpose, constraints, success criteria

**Exploring approaches:**
- Propose 2-3 approaches with trade-offs; lead with your recommendation
- YAGNI ruthlessly

**Presenting the design:**
- Scale sections to complexity; approval after each
- Cover: architecture, components, data flow, error handling, testing

**Working in existing codebases:**
- Follow existing patterns; include targeted improvements that serve the
  goal; no unrelated refactoring

## Fable integration (routes per path)

- **Any path, before the probe/design:** run
  `node scripts/search.js "<idea>"` then (if useful)
  `python3 scripts/boost/boost.py --task "<idea>"` — read-only research is
  allowed pre-approval and grounds the design in prior agent experience.
- **Spike → done:** `record.js` the recommendation.
- **Bounded → approved:** implement; on completion `record.js`.
- **Architectural → spec approved:** do NOT reach for generic planning —
  run `python3 scripts/boost/smart_scaffold.py --task "<spec title>"
  --criteria "<from the spec>"`, then invoke the `smart` skill so the
  ledger loop (PLAN → IDEATE → TEST-SPEC → WORK → VERIFY) executes the
  approved spec. Seed `notes.md` with the spec path.
- **Hard-gate sync:** the smart loop's VERIFY satisfies the brainstorming
  gate only when its criteria trace back to the approved spec.

## Visual Companion

Upstream offers an optional browser companion for mockups during
brainstorming (`skills/brainstorming/visual-companion.md` in the superpowers
repo). Not vendored here; if a question would genuinely be clearer shown
than told, use an available UI/design tool instead, offered just-in-time as
its own message.
