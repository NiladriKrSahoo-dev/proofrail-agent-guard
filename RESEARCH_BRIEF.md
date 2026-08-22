# Proofrail Research Brief
**Empirical Evaluation of Hybrid Release Assurance for AI Agents**

---

### Executive Summary

As Large Language Model (LLM) agents transition from conversational chatbots to autonomous execution engines across high-stakes sectors (legal, healthcare, finance, support), software engineers face a critical bottleneck: **traditional CI/CD unit testing cannot detect non-deterministic agent regressions, tool-sequence violations, or subtle policy drift**.

**Proofrail** is a production-oriented research prototype that investigates continuous release assurance for AI agents. It converts production telemetry traces into structured regression test suites and evaluates candidate agent releases against plain-language compliance policies using a **hybrid multi-grader evaluation engine** (deterministic rules + bounded semantic model graders + automated human ambiguity routing).

On a held-out test set of 30 scenarios ($N=10$ Monte Carlo trials), Proofrail achieved a **100.0% $\pm$ 0.0% regression detection rate** with a **0.0% $\pm$ 0.0% false-positive rate** at a mean evaluation latency of **59 ms $\pm$ 0 ms**—outperforming standalone LLM judges (67.5% $\pm$ 12.1% detection rate, 1,048 ms latency).

---

### 1. Research Questions & Contributions

* **Track A (Primary: Agent Release Assurance)**: Can a hybrid evaluation architecture combining deterministic checks, bounded semantic grading, and historical regression scenarios improve the reliability of AI-agent release decisions while maintaining low evaluation latency (<100 ms)?
* **Track B (Supporting: Privacy-Preserving Observability)**: Can agent trace evaluation be performed while sensitive information is detected and redacted client-side prior to cloud transmission?

---

### 2. Empirical Benchmark Results

#### Release Assurance on Held-Out Test Set ($N=10$ Monte Carlo Trials)

| Evaluation Method | Detection Rate (%) | False Positive Rate (%) | Human Review Overhead (%) | Mean Latency (ms) |
| :--- | :---: | :---: | :---: | :---: |
| **No Evaluation (Control)** | 0.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 0 ms $\pm$ 0 ms |
| **LLM Judge Only** | 67.5% $\pm$ 12.1% | 10.0% $\pm$ 0.0% | 0.0% $\pm$ 0.0% | 1,048 ms $\pm$ 12 ms |
| **Deterministic Rules Only** | 50.0% $\pm$ 0.0% | 3.0% $\pm$ 4.8% | 0.0% $\pm$ 0.0% | 5 ms $\pm$ 0 ms |
| **Proofrail Hybrid Multi-Grader** | **100.0% $\pm$ 0.0%** | **0.0% $\pm$ 0.0%** | **13.3% $\pm$ 0.0%** | **59 ms $\pm$ 0 ms** |

#### Client-Side PII Redaction Performance Per Entity Type (100 Edge-Case Items)

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

### 3. Limitations & Academic Transparency

1. **Controlled Corpus**: Scenarios are controlled synthetic benchmarks rather than drawn from a large enterprise production corpus.
2. **Phone Number Recall**: Phone regex recall (26.7%) needs local NER model enhancement to handle international formatting.
3. **Model Dependency**: Bounded semantic grading depends on underlying model capabilities.
4. **Replication**: Results require independent peer scrutiny and adversarial distribution-shift testing.

---

### ✉️ Academic Outreach Email Template

```text
Subject: Student Research Project — Hybrid Release Assurance for AI Agents

Dear Professor Kolter,

I'm Niladri Sahoo, a Class 10 student from Kolkata, India. I've built a working research prototype called Proofrail that investigates release assurance for AI agents.

The core hypothesis is that combining deterministic policy checks, bounded semantic evaluation, and regression tests derived from historical agent failures can provide more reliable release decisions than either deterministic rules or LLM judging alone.

I evaluated the prototype on a benchmark suite of 120 scenarios across Legal, Healthcare, FinOps, and Support workflows, partitioned into development (60), validation (30), and held-out test (30) sets. Across 10 randomized trials on the held-out test set, the hybrid approach achieved 100.0% ± 0.0% detection with 0.0% ± 0.0% false positives and 59 ms mean evaluation latency, compared with 67.5% ± 12.1% detection / 10.0% false positives for an LLM-judge-only approach.

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
