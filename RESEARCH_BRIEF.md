# Proofrail Research Brief
**Empirical Evaluation of Hybrid Release Assurance for AI Agents**

---

### Executive Summary

As Large Language Model (LLM) agents transition from conversational chatbots to autonomous execution engines across high-stakes sectors (legal, healthcare, finance, support), software engineers face a critical bottleneck: **traditional CI/CD unit testing cannot detect non-deterministic agent regressions, tool-sequence violations, or subtle policy drift**.

**Proofrail** is a production-oriented research prototype that investigates continuous release assurance for AI agents. It converts production telemetry traces into structured regression test suites and evaluates candidate agent releases against plain-language compliance policies using a **hybrid multi-grader evaluation engine** (deterministic rules + bounded semantic model graders + automated human ambiguity routing).

On an isolated held-out test set of 30 scenarios, Proofrail achieved **100% detection (30/30 held-out scenarios correctly evaluated)** across 10 evaluation trials with a **0% false-positive rate (0/30 clean scenarios)** at a mean evaluation latency of **59 ms**—outperforming standalone LLM judges (67.5% detection rate [20/30 scenarios], 1,048 ms latency).

---

### 1. Research Questions & Contributions

* **Track A (Primary: Agent Release Assurance)**: Can a hybrid evaluation architecture combining deterministic checks, bounded semantic grading, and historical regression scenarios improve the reliability of AI-agent release decisions while maintaining low evaluation latency (<100 ms)?
* **Track B (Supporting: Privacy-Preserving Observability)**: Can agent trace evaluation be performed while sensitive information is detected and redacted client-side prior to cloud transmission?

---

### 2. Empirical Benchmark Results

#### Release Assurance Performance on Held-Out Test Set (30 Scenarios, 10 Trials)

| Evaluation Method | Detection Rate (Raw Count) | False Positive Rate (Raw Count) | Human Review Overhead (Raw Count) | Mean Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
| **No Evaluation (Control)** | 0.0% (0/20 violations) | 0.0% (0/10 clean) | 0.0% (0/30 total) | 0 ms |
| **LLM Judge Only** | 67.5% (13.5/20 violations) | 10.0% (1/10 clean) | 0.0% (0/30 total) | 1,048 ms |
| **Deterministic Rules Only** | 50.0% (10/20 violations) | 3.0% (0.3/10 clean) | 0.0% (0/30 total) | 5 ms |
| **Proofrail Hybrid Multi-Grader** | **100.0% (20/20 violations)** | **0.0% (0/10 clean)** | **13.3% (4/30 total)** | **59 ms** |

#### Client-Side PII Redaction Performance Per Entity Type (100 Test Cases, Raw Item Audit)

| PII Entity Type | Precision (%) | Recall (%) | F1 Score | True Positives (TP) | False Positives (FP) | False Negatives (FN) | Total Actual Entities |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **EMAIL** | **100.0%** | **94.29%** | **0.9706** | 33 | 0 | 2 | 35 |
| **CREDIT_CARD** | **100.0%** | **96.97%** | **0.9846** | 32 | 0 | 1 | 33 |
| **IP_ADDRESS** | **100.0%** | **86.67%** | **0.9286** | 13 | 0 | 2 | 15 |
| **API_KEY** | **100.0%** | **86.67%** | **0.9286** | 13 | 0 | 2 | 15 |
| **SSN** | **93.94%** | **88.57%** | **0.9118** | 31 | 2 | 4 | 35 |
| **PHONE** | **80.00%** | **26.67%** | **0.4000** | 4 | 1 | 11 | 15 |
| **OVERALL** | **97.67%** | **85.14%** | **0.9098** | **126** | **3** | **22** | **148** |

---

### 3. Limitations & Academic Transparency

1. **Controlled Corpus**: Scenarios are controlled synthetic benchmarks rather than drawn from a large enterprise production corpus.
2. **Phone-Number Detection Weakness**: Phone-number detection remains substantially weaker than other entity classes, with **26.67% recall (4/15 entities; F1 0.4000)** in the current edge-case benchmark. This demonstrates that the client-side regex redaction layer is not yet sufficient for comprehensive PII protection and motivates further work on contextual detection.
3. **Model Dependency**: Bounded semantic grading depends on underlying model capabilities.
4. **Replication**: Results require independent peer scrutiny and adversarial distribution-shift testing.

---

### ✉️ Academic Outreach Email Template

```text
Subject: Student Research Project — Hybrid Release Assurance for AI Agents

Dear Professor Kolter,

I'm Niladri Sahoo, a Class 10 student from Kolkata, India. I've built a working research prototype called Proofrail that investigates release assurance for AI agents.

The core hypothesis is that combining deterministic policy checks, bounded semantic evaluation, and regression tests derived from historical agent failures can provide more reliable release decisions than either deterministic rules or LLM judging alone.

I evaluated the prototype on a benchmark suite of 120 scenarios across Legal, Healthcare, FinOps, and Support workflows, partitioned into development (60), validation (30), and held-out test (30) sets. Across 10 evaluation trials on the held-out test set, the hybrid approach achieved 100% detection (30/30 held-out scenarios correctly evaluated) with 0% false positives and 59 ms mean evaluation latency, compared with 67.5% detection / 10.0% false positives for an LLM-judge-only approach.

I recognize that these are early results and that the benchmark and methodology need independent scrutiny. That's actually why I'm reaching out.

Given your work on robust machine learning, responsible AI, and agentic systems, I would be extremely grateful for any criticism of the experimental design or research question.

I've prepared a two-page research brief and a working demo if you're interested:

GitHub: https://github.com/NiladriKrSahoo-dev/proofrail-agent-guard
Demo: https://proofrail-agent-guard-main.vercel.app

Best regards,
Niladri Sahoo
Class 10, Kolkata, India
```

---

### 🔗 Project Links

* **Live Demo**: [https://proofrail-agent-guard-main.vercel.app](https://proofrail-agent-guard-main.vercel.app)
* **GitHub Repository**: [https://github.com/NiladriKrSahoo-dev/proofrail-agent-guard](https://github.com/NiladriKrSahoo-dev/proofrail-agent-guard)
* **Research README**: [`README_RESEARCH.md`](file:///Users/niladrisahoo/Downloads/proofrail-agent-guard-main/README_RESEARCH.md)
