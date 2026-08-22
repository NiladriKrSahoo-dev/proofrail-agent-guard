# Proofrail: Empirical Evaluation of Hybrid Release Assurance for AI Agents

> **Academic Research Documentation & Benchmark Specification**  
> *A production-oriented research prototype evaluating hybrid deterministic-semantic release gating and client-side privacy preservation for autonomous LLM agents.*

---

## Abstract

Autonomous AI agents powered by Large Language Models (LLMs) are rapidly transitioning from conversational interfaces to autonomous execution engines across high-stakes domains including commercial law, clinical healthcare, financial operations, and customer support. However, their inherent non-determinism presents a fundamental software engineering challenge: traditional unit testing and static code analysis fail to catch behavioral regressions, tool-sequence misorderings, or subtle policy violations introduced during prompt updates, model fine-tuning, or API version shifts. 

We present **Proofrail**, a continuous release assurance framework that converts production telemetry traces into structured regression test suites and evaluates candidate agent releases against plain-language compliance policies. Proofrail employs a **hybrid multi-grader architecture** combining deterministic rule engines, bounded semantic model graders, and automated human ambiguity routing. 

Evaluating Proofrail across a held-out test dataset of 30 scenarios ($N=10$ Monte Carlo trials) yields a **100.0% $\pm$ 0.0% regression detection rate** with a **0.0% $\pm$ 0.0% false-positive rate** and a **13.3% $\pm$ 0.0% human review overhead**, at a mean evaluation latency of **59 ms $\pm$ 0 ms**—outperforming standalone LLM judges (67.5% $\pm$ 12.1% detection rate, 1,048 ms latency) and pure deterministic engines (50.0% $\pm$ 0.0% detection rate). Furthermore, Proofrail incorporates a client-side PII redaction pipeline achieving **97.67% overall precision** and **85.14% recall (0.9098 F1)** on PII detection across complex edge-case payloads.

---

## Problem Statement

Modern software engineering relies on deterministic continuous integration and continuous delivery (CI/CD) pipelines where code changes pass or fail based on predictable unit and integration tests. In contrast, LLM-based autonomous agents exhibit three distinct failure modes that escape traditional CI/CD tooling:

1. **Non-Deterministic Regression**: Minor prompt adjustments or model provider updates can silently alter tool parameter selections, skip mandatory verification checks, or introduce subtle policy drift without throwing explicit runtime exceptions.
2. **Dual-Layer Failure Surfaces**: Agent failures span both *structural/tool-sequence violations* (e.g., executing a contract renewal prior to validating spend caps) and *semantic policy drift* (e.g., introducing binding SLA guarantees in customer support replies). Single-modality evaluators fail to capture both layers simultaneously.
3. **Telemetry Privacy Risk**: Harvesting production agent execution traces for regression benchmarking introduces severe privacy risks, as traces frequently contain Personally Identifiable Information (PII), Protected Health Information (PHI), or confidential financial records.

---

## Research Tracks & Questions

### Track A (Primary Contribution): Agent Release Assurance
> **Primary Research Question**: Can a hybrid evaluation architecture—combining deterministic checks, bounded semantic grading, and historical regression scenarios—improve the reliability of AI-agent release decisions while maintaining low evaluation latency (<100 ms)?

### Track B (Supporting Contribution): Privacy-Preserving Observability
> **Secondary Research Question**: Can useful agent trace evaluation be performed while sensitive information is detected and redacted client-side prior to centralized cloud transmission?

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
│              1. Client-Side PII Detection & Redaction                   │
│      (Regex Pattern Engine: SSN, Cards, Email, Phone, API Keys, IPs)    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │ (Sanitized Traces)
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
│               4. Release Gate Decision & Evidence Vault                 │
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

## Experimental Design & Dataset Partitioning

### 1. Scenario Regression Benchmark Dataset
We constructed a multi-sector benchmark suite of **120 regression scenarios** (30 per sector across **Legal**, **Healthcare**, **FinOps**, and **Support**). The dataset was strictly partitioned into three independent subsets:

* **Development Set (60 scenarios - 50%)**: Used exclusively to build, tune, and parameterize Proofrail evaluation rules.
* **Validation Set (30 scenarios - 25%)**: Used to make hyperparameter and score-threshold design decisions.
* **Held-Out Test Set (30 scenarios - 25%)**: Strictly isolated and never used during system development or threshold tuning.

### 2. PII Benchmark Dataset Construction
We constructed a **100-item PII test suite** spanning 6 challenge categories:
* **Obvious PII**: Standard SSNs, credit cards, emails, phone numbers, API keys, IPv4/IPv6 addresses.
* **Disguised / Spaced PII**: Obfuscated formats (e.g., `1 2 3 - 4 5 - 6 7 8 9`, `user [at] domain [dot] com`).
* **False Positive Controls**: Product SKUs (`SKU-123-45-678`), git commit hashes, version numbers (`v1.2.3`), UUIDs, order numbers.
* **Deeply Nested JSON**: PII embedded inside deep JSON object hierarchies.
* **Malformed Payloads**: Unparsed/corrupted log strings containing PII.
* **Mixed Prose + JSON**: Natural language narratives with embedded JSON telemetry strings.

---

## Empirical Results

All evaluations were executed programmatically via the automated benchmark runner (`src/benchmark/runner.ts`). Held-out test evaluations reflect **$N=10$ randomized Monte Carlo trials** reporting mean $\pm$ standard error.

### 1. Release Assurance Performance on Held-Out Test Set ($N=10$ Trials)

| Evaluation Method | Detection Rate (%) | False Positive Rate (%) | Human Review Overhead (%) | Mean Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
| **No Evaluation (Control)** | 0.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 0 ms $\pm$ 0 ms |
| **LLM Judge Only** | 67.5% $\pm$ 12.1% | 10.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 1,048 ms $\pm$ 12 ms |
| **Deterministic Rules Only** | 50.0% $\pm$ 0.0% | 3.0% $\pm$ 4.8% | 0.0% $\pm$ 0.0% | 5 ms $\pm$ 0 ms |
| **Proofrail Hybrid Multi-Grader** | **100.0% $\pm$ 0.0%** | **0.0% $\pm$ 0.0%** | **13.3% $\pm$ 0.0%** | **59 ms $\pm$ 0 ms** |

> **Key Finding**: On held-out test scenarios, Proofrail's hybrid multi-grader achieved a **100.0% detection rate** at **59 ms mean latency**, outperforming standalone LLM judges (+32.5% detection) while operating **17.7x faster**.

---

### 2. Per-Entity Type PII Redaction Performance (100 Test Cases)

| PII Entity Type | Precision (%) | Recall (%) | F1 Score | True Positives | False Positives | False Negatives |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **EMAIL** | **100.0%** | **94.29%** | **0.9706** | 33 | 0 | 2 |
| **CREDIT_CARD** | **100.0%** | **96.97%** | **0.9846** | 32 | 0 | 1 |
| **IP_ADDRESS** | **100.0%** | **86.67%** | **0.9286** | 13 | 0 | 2 |
| **API_KEY** | **100.0%** | **86.67%** | **0.9286** | 13 | 0 | 2 |
| **SSN** | **93.94%** | **88.57%** | **0.9118** | 31 | 2 | 4 |
| **PHONE** | **80.00%** | **26.67%** | **0.4000** | 4 | 1 | 11 |
| **OVERALL** | **97.67%** | **85.14%** | **0.9098** | **126** | **3** | **22** |

---

## Limitations

1. **Controlled Benchmark Corpus**: The current scenario dataset consists of 120 synthetic scenarios across four sectors rather than a large multi-organization production trace corpus.
2. **Phone Number Recall**: Phone number extraction recall (26.67%) is currently limited due to regex variance across international formatting conventions.
3. **Semantic Grader Dependency**: The semantic evaluation layer relies on underlying model capability; severe prompt injection or adversarial jailbreaks in trace logs could affect grader scoring.
4. **Independent Replication Required**: These initial empirical results reflect a prototype execution environment and require independent peer replication and adversarial distribution-shift testing.

---

## Future Work

1. **Local Named Entity Recognition (NER)**: Integrating a WebAssembly-quantized ONNX model (e.g. Presidio / RoBERTa) to raise PII phone recall from 26.7% to >90% while maintaining client-side execution.
2. **Automated Counterfactual Synthesis**: Synthesizing adversarial counterfactual trace variations to discover hidden vulnerabilities before release.
3. **Multi-Organization Deployment Audits**: Validating evaluation performance across live enterprise production agent telemetry.

---

## Repository & References

* **Live Prototype**: [https://proofrail-agent-guard-main.vercel.app](https://proofrail-agent-guard-main.vercel.app)
* **GitHub Repository**: [https://github.com/NiladriKrSahoo-dev/proofrail-agent-guard](https://github.com/NiladriKrSahoo-dev/proofrail-agent-guard)
* **Benchmark Source Code**: [`src/benchmark/`](file:///Users/niladrisahoo/Downloads/proofrail-agent-guard-main/src/benchmark)
