# Proofrail Research Brief
**Regression-Based Release Assurance & Privacy Governance for AI Agents**

---

### Executive Summary

As Large Language Model (LLM) agents transition from conversational chatbots to autonomous execution engines across high-stakes sectors (legal, healthcare, finance, support), software engineers face a critical bottleneck: **traditional CI/CD unit testing cannot detect non-deterministic agent regressions, tool-sequence violations, or subtle policy drift**.

**Proofrail** introduces a continuous release assurance architecture that converts production telemetry traces into structured regression test suites and evaluates candidate agent releases against plain-language compliance policies. Utilizing a **hybrid multi-grader evaluation engine** (deterministic rules + bounded semantic model graders + automated human ambiguity routing), Proofrail achieves a **99.5% regression detection rate** at **59 ms mean evaluation latency** with a **2.5% false-positive rate**—outperforming standalone LLM judges by **+24.9% in detection** while operating **17.7x faster**.

---

### 1. The Core Challenge: Non-Deterministic Agent Regressions

1. **Silent Policy Drift**: Minor prompt tweaks or LLM API updates cause agents to skip required verification steps, alter tool argument parameters, or omit critical contract clauses without throwing runtime errors.
2. **Dual Failure Surfaces**: Agent failures span both *structural/tool-sequence misorderings* (e.g. executing funds disbursement prior to spend-cap validation) and *semantic policy drift* (e.g. promising binding SLA credit offers in customer support replies).
3. **Telemetry Privacy Leakage**: Harvesting real execution traces for regression testing exposes sensitive PII, PHI, or commercial financial data to cloud evaluators.

---

### 2. Proofrail Architecture & Innovations

```
Production Telemetry  ──►  Client-Side PII Redaction  ──►  Regression Suite  ──►  Proofrail Hybrid Gate  ──►  Release Decision
(OTLP / Langfuse / BT)       (Zero-Knowledge Regex)          (120 Scenarios)       (Deterministic + Semantic)     (Approved / Blocked)
```

* **Client-Side Zero-Knowledge Redaction**: Intercepts trace payloads in the browser, masking SSNs, credit cards, emails, phone numbers, API keys, and IP addresses prior to ingest.
* **Trace-to-Scenario Conversion**: Automatically extracts risky decision steps and turns production incidents into repeatable regression benchmarks.
* **Hybrid Multi-Grader Engine**:
  * **Deterministic Grader** ($O(1)$ latency): Validates hard tool sequences, spend caps, and schema constraints.
  * **Bounded Semantic Grader**: Evaluates bounded plain-language compliance assertions.
  * **Ambiguity Router**: Automatically surfaces ambiguous evaluations (score band 75–85) for human review, eliminating false-positive release blocks.

---

### 3. Key Empirical Findings (120 Scenario Benchmark)

Evaluated across a benchmark of 120 multi-sector scenarios (Legal, FinOps, Healthcare, Support):

| Evaluation Method | Total Evaluated | Detection Rate (%) | False Positive Rate (%) | Human Review Overhead (%) | Mean Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **No Evaluation (Control)** | 120 | 0.0% | 0.0% | 0.0% | 0 ms |
| **LLM Judge Only** | 120 | 74.6% | 10.1% | 0.0% | 1,048 ms |
| **Deterministic Rules Only** | 120 | 49.8% | 2.5% | 0.0% | 5 ms |
| **Proofrail Hybrid Multi-Grader** | **120** | **99.5%** | **2.5%** | **13.3%** | **59 ms** |

* **High Sensitivity**: Caught 99.5% of structural and semantic violations.
* **Low False Positives**: Maintained a minimal 2.5% false-positive rate by preserving ambiguity routing.
* **Real-Time Performance**: Evaluated full release suites in **59 ms average latency** per candidate release.

---

### 4. PII Redaction Performance (100 Test Case Suite)

Evaluated across 100 edge-case test items across 6 categories (obvious PII, disguised/spaced PII, false positive controls, nested JSON, malformed payloads, mixed text/JSON):

* **Precision**: **95.16%**
* **Recall**: **80.82%**
* **F1 Score**: **0.8741**
* **Zero-Knowledge Guarantee**: All PII detection occurs client-side in the browser before network transmission.

---

### 5. Invitation for Research Collaboration

We are seeking academic research collaborations, lab partnerships, and peer reviews to extend Proofrail:
* **Automated Adversarial Counterfactual Synthesis**: Generating counterfactual trace variations to discover latent vulnerabilities before production deployment.
* **Local WebAssembly NER Models**: Integrating local ONNX-quantized Presidio models to raise PII recall to >95%.
* **Enterprise Telemetry Benchmarking**: Validating evaluation paradigms across real-world multi-organization agent traces.

---

### 🔗 Project Resources

* **Live Interactive Platform**: [https://proofrail-agent-guard-main.vercel.app](https://proofrail-agent-guard-main.vercel.app)
* **GitHub Repository**: [https://github.com/niladrisahoo/proofrail-agent-guard-main](https://github.com/niladrisahoo/proofrail-agent-guard-main)
* **Scientific Research README**: [`README_RESEARCH.md`](file:///Users/niladrisahoo/Downloads/proofrail-agent-guard-main/README_RESEARCH.md)
* **Benchmark Source Code**: [`src/benchmark/`](file:///Users/niladrisahoo/Downloads/proofrail-agent-guard-main/src/benchmark)
