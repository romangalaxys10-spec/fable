# Quality Graph Architecture (`packages/graph`)

The **Quality Graph** represents the bi-directional enterprise traceability network linking requirements to production defects:

```
Requirement ──▶ Feature ──▶ Code ──▶ API / UI ──▶ Test ──▶ Execution ──▶ Evidence ──▶ Defect
```

And for Change Impact Analysis:
```
Commit ──▶ Changed file ──▶ Changed symbol ──▶ Affected feature ──▶ Affected risk ──▶ Relevant tests
```

---

## 1. Node Taxonomy

| Node Type | Description | Key Attributes |
|---|---|---|
| `requirement` | High-level business specification or customer capability | `id`, `criticality` (P0–P3), `acceptanceCriteria[]` |
| `feature` | Encapsulated system functional capability | `id`, `domain`, `owner` |
| `code` | Source file, class, or service implementation | `path`, `symbols[]`, `complexity` |
| `api` | Public or internal HTTP/gRPC route | `method`, `path`, `schemaVersion` |
| `ui` | Frontend component or user page | `componentName`, `route`, `locators[]` |
| `test` | Automated test spec across pyramid layers | `layer` (unit/integration/e2e), `tags[]`, `framework` |
| `execution` | Execution event in CI or local runner | `runId`, `timestamp`, `status`, `durationMs` |
| `evidence` | Concrete execution artifact bundle | `traceZip`, `screenshotPng`, `consoleLog`, `networkHar` |
| `defect` | Triaged failure or production bug report | `severity`, `category`, `rootCauseHypothesis` |

---

## 2. Impact Query Flow

When a pull request is submitted:
1. `qa impact HEAD~1..HEAD` runs AST & symbol diffing to identify changed symbols.
2. The Quality Graph traces from `code` nodes back to `feature` nodes.
3. The graph retrieves all `test` nodes with a `verifies` edge pointing to those features.
4. Instead of executing 4,000 irrelevant tests, the runner selects the minimal high-confidence test subset.
