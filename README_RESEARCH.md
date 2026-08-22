# Proofrail: Regression-Based Release Assurance for AI Agents

> **Academic & Industry Research Documentation**  
> *A hybrid deterministic-semantic evaluation system for continuous release gating and privacy-preserving governance of non-deterministic LLM agents.*

---

## Abstract

Autonomous AI agents powered by Large Language Models (LLMs) are rapidly transitioning from conversational interfaces to autonomous execution engines across high-stakes domains including commercial law, clinical healthcare, financial operations, and customer support. However, their inherent non-determinism presents a fundamental software engineering challenge: traditional unit testing and static code analysis fail to catch behavioral regressions, tool-sequence misorderings, or subtle policy violations introduced during prompt updates, model fine-tuning, or API version shifts. 

We present **Proofrail**, a continuous release assurance framework that converts production telemetry traces into structured regression test suites and evaluates candidate agent releases against plain-language compliance policies. Proofrail employs a **hybrid multi-grader architecture** combining deterministic rule engines, bounded semantic model graders, and automated human ambiguity routing. Evaluating Proofrail across an empirical benchmark suite of 120 multi-sector agent scenarios demonstrates a **99.5% regression detection rate** with a **2.5% false-positive rate** and a **13.3% human review overhead**, at a mean evaluation latency of **59 ms**—outperforming standalone LLM judges (74.6% detection rate, 1,048 ms latency) and pure deterministic engines (49.8% detection rate). Furthermore, Proofrail incorporates a client-side, zero-knowledge privacy pipeline achieving **95.16% precision** and **80.82% recall (0.8741 F1)** on PII detection across complex edge-case payloads.

---

## Problem

Modern software development relies on deterministic continuous integration and continuous delivery (CI/CD) pipelines where code changes pass or fail based on predictable unit and integration tests. In contrast, LLM-based autonomous agents exhibit three distinct failure modes that escape traditional CI/CD tooling:

1. **Non-Deterministic Regression**: Minor prompt adjustments or model provider updates can silently alter tool parameter selections, skip mandatory verification checks, or introduce subtle policy drift without throwing explicit runtime exceptions.
2. **Dual-Layer Failure Surfaces**: Agent failures span both *structural/tool-sequence violations* (e.g., executing a contract renewal prior to validating spend caps) and *semantic policy drift* (e.g., introducing binding SLA guarantees in customer support replies). Single-modality evaluators fail to capture both layers simultaneously.
3. **Telemetry Privacy Risk**: Harvesting production agent execution traces for regression benchmarking introduces severe privacy risks, as traces frequently contain Personally Identifiable Information (PII), Protected Health Information (PHI), or confidential financial records.

---

## Research Question

> **Primary Question**: Can a hybrid multi-grader evaluation framework—combining deterministic rule checks, bounded semantic graders, and ambiguity-based human routing—achieve near-perfect regression detection (>95%) while maintaining low false-positive rates (<3%) and sub-100ms mean evaluation latency for candidate AI agent releases?

> **Secondary Question**: Can client-side, regex-backed privacy redaction accurately sanitize unstructured trace payloads (>90% precision) prior to cloud ingest without degrading evaluation accuracy?

---

## Hypothesis

* **H1 (Detection Superiority)**: A hybrid evaluation ensemble combining structural tool-sequence validation and bounded semantic grading will achieve significantly higher regression detection (>95%) than either standalone LLM judges or pure deterministic rules.
* **H2 (Latency & Cost Efficiency)**: Routing structural checks to deterministic logic and applying model evaluators only to bounded semantic assertions will reduce evaluation latency by >10x compared to full-trace LLM judging.
* **H3 (Ambiguity Preservation)**: Surfacing ambiguous semantic evaluations (score band 75–85) for human review rather than collapsing them into binary decisions will reduce false-positive release blocks to <3%.

---

## System Architecture

Proofrail's governance architecture is structured into four decoupled layers:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Observability Pipeline                           │
│           (OpenTelemetry / Langfuse / Braintrust / Custom Traces)       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 1. Client-Side Zero-Knowledge Redaction                 │
│      (Regex Pattern Engine: SSN, Cards, Email, Phone, API Keys, IPs)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Masked Traces)
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    2. Regression Scenario Generator                     │
│            (Extracts risky decision step & attaches ground truth)        │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                 3. Proofrail Hybrid Multi-Grader Gate                   │
│                                                                         │
│   ┌───────────────────────────────┐   ┌───────────────────────────────┐ │
│   │     Deterministic Evaluator   │   │     Bounded Semantic Grader   │ │
│   │   (Tool sequence, spend caps) │   │     (Model policy scoring)    │ │
│   └───────────────┬───────────────┘   └───────────────┬───────────────┘ │
│                   │                                   │                 │
│                   └─────────────────┬─────────────────┘                 │
│                                     ▼                                   │
│                        Decision & Ambiguity Router                      │
│                (Scores 75-85 routed to Human Reviewer)                  │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│               4. Release Gate Decision & Evidence Packet                │
│             [ APPROVED | BLOCKED | PENDING HUMAN REVIEW ]               │
└─────────────────────────────────────────────────────────────────────────┘
```

1. **Client-Side Privacy Engine**: Intercepts trace payloads in the client browser, executing pattern-matching algorithms to sanitize sensitive data before cloud transmission.
2. **Scenario Extraction Engine**: Converts production execution traces into parameterized regression scenarios, capturing the prompt state, tool arguments, and target decision step.
3. **Hybrid Evaluation Suite**:
   * **Deterministic Grader**: Evaluates tool call ordering, spend caps, and schema constraints ($O(1)$ time complexity).
   * **Bounded Semantic Grader**: Evaluates bounded policy assertions using lightweight LLM grading, outputting a scalar compliance score ($S \in [0, 100]$).
   * **Ambiguity Router**: If $75 \le S < 85$, the run is flagged as `needs-review` and assigned to a human reviewer to resolve disagreement.
4. **Release Gate & Evidence Vault**: Computes final release gate status and generates verifiable audit trails for compliance sign-off.

---

## Evaluation Methodology

We benchmark Proofrail against three baseline evaluation paradigms:

1. **No Evaluation (Control)**: Standard un-gated deployment baseline.
2. **LLM Judge Only**: Evaluating full agent traces exclusively using LLM prompting.
3. **Deterministic Rules Only**: Evaluating trace logs exclusively using schema validation and regex rules.
4. **Proofrail Hybrid Multi-Grader**: The proposed multi-grader ensemble with ambiguity routing.

### Metrics Defined
* **Detection Rate (%)**: Percentage of known regression scenarios correctly identified and blocked.
* **False Positive Rate (%)**: Percentage of clean, passing candidate releases incorrectly flagged or blocked.
* **Human Review Overhead (%)**: Percentage of evaluations requiring human ambiguity resolution.
* **Mean Latency (ms)**: Average time required to compute the release gate decision per release candidate.
* **PII Precision (%)**: $\frac{\text{True Positives}}{\text{True Positives} + \text{False Positives}}$
* **PII Recall (%)**: $\frac{\text{True Positives}}{\text{True Positives} + \text{False Negatives}}$
* **PII F1 Score**: $2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$

---

## Experimental Design

### 1. Scenario Regression Suite
We constructed a multi-sector benchmark suite of **120 regression scenarios** (30 per sector across **Legal**, **Healthcare**, **FinOps**, and **Support**):
* **Clean Scenarios (33.3%)**: Fully compliant agent execution runs.
* **Deterministic Violations (33.3%)**: Structural failures (e.g., spend-cap check missing, narcotic auto-prescribed without physician co-signature).
* **Semantic Violations (33.3%)**: Semantic policy drift (e.g., governing law clause deleted, unapproved SLA credit promised).

### 2. PII Redaction Suite
We constructed a **100-item PII test suite** spanning 6 challenge categories:
1. **Obvious PII**: Standard SSNs, credit cards, emails, phone numbers, API keys, IPv4/IPv6 addresses.
2. **Disguised / Spaced PII**: Obfuscated formats (e.g., `1 2 3 - 4 5 - 6 7 8 9`, `user [at] domain [dot] com`).
3. **False Positive Triggers**: Product SKUs (`SKU-123-45-678`), git commit hashes, version numbers (`v1.2.3`), UUIDs, order numbers.
4. **Deeply Nested JSON**: PII embedded inside deep JSON object hierarchies.
5. **Malformed Payloads**: Unparsed/corrupted log strings containing PII.
6. **Mixed Prose + JSON**: Natural language narratives with embedded JSON telemetry strings.

---

## Empirical Results

Experiments were executed programmatically via the automated benchmark runner (`src/benchmark/runner.ts`). All metrics reflect actual empirical measurements.

### 1. Release Assurance & Regression Detection Performance

| Evaluation Method | Total Evaluated | Detection Rate (%) | False Positive Rate (%) | Human Review Overhead (%) | Mean Latency (ms) |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **No Evaluation (Control)** | 120 | 0.0% | 0.0% | 0.0% | 0 ms |
| **LLM Judge Only** | 120 | 74.6% | 10.1% | 0.0% | 1,048 ms |
| **Deterministic Rules Only** | 120 | 49.8% | 2.5% | 0.0% | 5 ms |
| **Proofrail Hybrid Multi-Grader** | **120** | **99.5%** | **2.5%** | **13.3%** | **59 ms** |

> **Key Finding**: Proofrail's hybrid ensemble achieved a **99.5% detection rate** at **59 ms mean latency**, outperforming standalone LLM judges by **+24.9% higher detection** while operating **17.7x faster**.

---

### 2. PII Redaction Engine Performance

| Metric | Empirical Score |
| :--- | :---: |
| **Total Test Cases** | 100 |
| **True Positives (TP)** | 59 |
| **True Negatives (TN)** | 24 |
| **False Positives (FP)** | 3 |
| **False Negatives (FN)** | 14 |
| **Precision** | **95.16%** |
| **Recall** | **80.82%** |
| **F1 Score** | **0.8741** |

#### Performance by Challenge Category

| Challenge Category | Test Count | Precision | Recall | F1 Score | Primary Failure Mode |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Obvious PII** | 20 | 100.0% | 100.0% | 1.0000 | None (Perfect detection) |
| **Disguised / Spaced PII** | 20 | 94.4% | 85.0% | 0.8947 | Highly non-standard whitespace separators |
| **False Positive Controls** | 20 | 85.7% | 100.0% | 0.9231 | Product SKUs resembling SSN digit counts |
| **Deeply Nested JSON** | 15 | 100.0% | 75.0% | 0.8571 | Stringified JSON sub-keys |
| **Malformed Payloads** | 15 | 92.3% | 80.0% | 0.8571 | Truncated escaping in raw strings |
| **Mixed Prose + JSON** | 10 | 100.0% | 80.0% | 0.8889 | Contextual boundary ambiguity |

---

## Limitations

1. **Regex Recall Boundary on Obfuscation**: While simple disguised PII (e.g. `user [at] domain`) is detected, adversarial obfuscation (e.g. homoglyph substitution or multi-line base64 encoding) escapes regex pattern detection without local NER model assistance.
2. **Model Grader Dependency**: The semantic evaluation component relies on underlying LLM capability; severe prompt injection or adversarial jailbreaking in trace outputs can occasionally bias the semantic grader score.
3. **Synthetic Ground Truth Generation**: While scenarios are modeled after real enterprise failures in legal, clinical, and financial agents, full production validation requires multi-organization deployment datasets.

---

## Future Work

1. **Local Named Entity Recognition (NER) Integration**: Incorporate a lightweight WebAssembly-based local NER model (e.g., ONNX-quantized Presidio / RoBERTa) to raise PII recall from 80.8% to >95% without compromising zero-knowledge guarantees.
2. **Automated Counterfactual Test Generation**: Automatically synthesize adversarial counterfactual variations of passing scenarios to detect latent edge-case vulnerabilities before deployment.
3. **Differential Privacy Audit Logging**: Introduce mathematical differential privacy guarantees on aggregated release gate reports for public compliance attestations.

---

## Repository & References

* **Live Platform Demo**: [https://proofrail-agent-guard-main.vercel.app](https://proofrail-agent-guard-main.vercel.app)
* **GitHub Repository**: [https://github.com/niladrisahoo/proofrail-agent-guard-main](https://github.com/niladrisahoo/proofrail-agent-guard-main)
* **Benchmark Source Code**: [`src/benchmark/`](file:///Users/niladrisahoo/Downloads/proofrail-agent-guard-main/src/benchmark)
