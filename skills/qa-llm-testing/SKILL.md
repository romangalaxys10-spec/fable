---
name: qa-llm-testing
title: AI & LLM Systems Quality Assurance
category: Flagship Differentiator
author: Principal QA Architect & Systems Staff Engineer
---

# qa-llm-testing — AI & LLM Quality Engineering

Flagship enterprise testing methodology for verifying generative AI applications, LLM reasoning pipelines, tool-calling agents, and RAG systems.

---

## 1. Purpose
Ensures that language models and AI components produce deterministic, schema-compliant, grounded, and safe outputs while guarding against prompt regressions, jailbreaks, and cost blowouts.

---

## 2. When to Activate
- When changes touch system prompts, few-shot exemplars, or model parameters (temperature, top_p).
- When validating structured output schemas (JSON mode, Zod schemas, function calling).
- When evaluating RAG retrieval faithfulness, hallucination rates, or citation accuracy.
- When conducting adversarial security reviews (prompt injection, jailbreak robustness).

---

## 3. Inputs
- System prompt templates and user prompt test suites.
- Golden evaluation datasets (inputs with expected schemas & assertions).
- Tool definitions and JSON schemas.
- Model latency, token usage, and cost telemetry.

---

## 4. Preconditions
- Target model endpoint or reasoning provider interface configured.
- Structured output schemas defined via Zod or JSON Schema.
- Isolated test environment with budget caps.

---

## 5. Decision Rules
1. **Schema Compliance is Absolute**: If the LLM output fails `schema.safeParse()`, the test fails immediately regardless of semantic quality.
2. **Grounding Before Eloquence**: Citations and claims must be directly verifiable against the provided retrieval context; ungrounded claims are scored as hallucinations.
3. **Adversarial Resilience**: Models must uphold safety boundaries and system instruction hierarchy even when user prompts inject `Ignore previous instructions`.
4. **Token & Cost Budgeting**: Fail CI if prompt token inflation exceeds +25% or response latency exceeds $p_{95} > 2000\text{ms}$.

---

## 6. The 10 Evaluation Dimensions
1. **Accuracy**: Correctness of business logic and factual calculations.
2. **Faithfulness**: Absence of hallucinations; statements strictly supported by context.
3. **Relevance**: Direct answer to user intent without tangential verbosity.
4. **Safety & Policy**: Refusal of harmful, toxic, or unauthorized commands.
5. **Robustness**: Resistance to adversarial jailbreaks and Unicode/escape injections.
6. **Consistency**: Deterministic results across identical runs ($T = 0$).
7. **Tool Correctness**: Valid tool names, parameter types, and calling sequence.
8. **Instruction Hierarchy**: System developer prompts take absolute precedence over untrusted user input.
9. **Latency**: Wall-clock duration within defined SLA boundaries.
10. **Cost & Token Efficiency**: Monitored token consumption against budget targets.

---

## 7. Workflow
```
1. DEFINE       ──▶ Golden test dataset & Zod output schemas
2. PROBE        ──▶ Inject adversarial prompt variations (jailbreaks, injections)
3. EXECUTE      ──▶ Multi-run evaluation with deterministic temperature (T = 0)
4. VALIDATE     ──▶ Strict schema parsing & invariant verification
5. GROUND       ──▶ Automated claim extraction & context citation checking
6. BENCHMARK    ──▶ Measure token economy, latency percentiles, and cost
7. REPORT       ──▶ Output radar chart & release gate evaluation
```

---

## 8. Anti-Patterns
- 🚫 **Subjective Vibe Checks**: Rating AI output as "looks good" without programmatic assertions.
- 🚫 **Unconstrained Free-Text**: Consuming raw text without structured JSON schema validation.
- 🚫 **Ignoring Token Drift**: Failing to track context ballooning across prompt revisions.

---

## 9. Failure Handling
- **Schema Failure**: Log exact JSON diff and re-test with structured prompt correction.
- **Hallucination Detection**: Flag ungrounded entity claims and lower confidence score.
- **Prompt Injection Breach**: Block release immediately as P0 security vulnerability.

---

## 10. Evidence Requirements
`artifacts/llm-eval-<runId>/{eval-matrix.json, prompt-diff.md, token-usage.json, jailbreak-results.md}`.

---

## 11. Output Contract
```json
{
  "suite": "LLM Quality Evaluation",
  "dimensions": {
    "schemaCompliance": "100%",
    "faithfulness": "96.4%",
    "adversarialRobustness": "100%",
    "toolCallingAccuracy": "98.1%"
  },
  "tokenMetrics": {
    "promptTokensAvg": 412,
    "completionTokensAvg": 84,
    "p95LatencyMs": 840
  },
  "verdict": "PASS"
}
```

---

## 12. Verification Checklist
- [ ] Output conforms to Zod schema on 100% of test runs.
- [ ] Adversarial prompt injection test suite verified clean refusal.
- [ ] Zero ungrounded claims detected in RAG citation audit.
- [ ] Token usage within allocated budget limits.
