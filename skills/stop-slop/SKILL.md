---
name: stop-slop
title: Anti-AI Slop Heuristics Engine & Human Craft Standard
source: https://github.com/hardikpandya/stop-slop.git
category: Craftsmanship & Writing Discipline
version: 1.0.0
license: MIT
---

# stop-slop — Anti-AI Slop Heuristics & Human Craft Standard

Derived from Hardik Pandya's [`stop-slop`](https://github.com/hardikpandya/stop-slop.git).

> **Core Principle**: AI-generated text and UI have predictable, formulaic "tells." Good engineering and design demand authentic, human-crafted specificity. Eliminate generic filler, over-explained concepts, and visual cliches.

---

## 1. The 8 Core Anti-Slop Rules

1. **Cut Filler & Throat-Clearing**:
   - 🚫 *Forbidden*: "In today's fast-paced digital world", "It is important to remember", "Delve into", "At the end of the day", "In order to".
   - ✅ *Rule*: Start directly with the substance. Cut the first two sentences if they only restate the premise.
2. **Break Formulaic Structures**:
   - 🚫 *Forbidden*: Predictable three-item parallel lists, rhetorical self-answering questions ("Why does this matter? Because..."), false binary contrasts ("Not just X, but Y").
   - ✅ *Rule*: Vary structure organically; use asymmetrical details.
3. **Active Voice & Concrete Specificity**:
   - 🚫 *Forbidden*: Vague abstractions ("enhances user experience", "streamlines workflows", "robust solution").
   - ✅ *Rule*: State exact metrics, mechanisms, and tools: "Saves 140ms on SQLite write locks using WAL mode."
4. **Put the Reader in the Room**:
   - Use concrete domain nouns, actual file paths, command flags, and error codes rather than generic metaphors.
5. **Vary Sentence & Structural Rhythm**:
   - Short. Long, meandering sentences that follow the natural flow of thought. Then a punchy one.
6. **Trust the Reader**:
   - Do not explain elementary concepts to experienced engineers. Skip the patronizing "Remember to always backup your database before running migrations."
7. **Cut "Quotables" & Marketing Platitudes**:
   - 🚫 *Forbidden*: "Empowering developers to unleash full potential", "Seamless synergy", "A game changer".
8. **Eliminate AI Visual Tells (UI Anti-Slop)**:
   - 🚫 *Forbidden*: Generic pill buttons everywhere, gratuitous purple/magenta neon glows, floating card cascades with no purpose, fake chatbot popups, and placeholder lorem ipsum.
   - ✅ *Rule*: Clean typographic hierarchy, purposeful whitespace, crisp borders, and zero decorative fluff.

---

## 2. The 5-Dimension Craft Scoring Rubric (Total: 50 Points)

| Dimension | Points | Evaluation Standard |
|---|---|---|
| **1. Voice & Authenticity** | 10 pts | Sounds like a real practitioner with skin in the game; zero corporate AI boilerplate. |
| **2. Specificity & Evidence** | 10 pts | Grounded in exact names, version numbers, benchmarks, and reproducible evidence. |
| **3. Structural Variation** | 10 pts | Organic pacing; absence of formulaic 3-bullet parallelisms and throat-clearing. |
| **4. Density & Utility** | 10 pts | Maximum information per token; zero padding; every sentence earns its place. |
| **5. Visual & Layout Craft** | 10 pts | Purpose-built layout; clean functional UI; absence of neon slop and fake widgets. |

- **Score $\ge 42/50$**: Exceptional human craft. Ready for production.
- **Score $35 - 41/50$**: Acceptable with minor edits.
- **Score $< 35/50$**: **REJECTED (SLOP DETECTED)**. Must be automatically rewritten.
