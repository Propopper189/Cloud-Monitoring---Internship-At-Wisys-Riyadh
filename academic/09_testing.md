# Chapter 9: Testing & Verification

## 9.1 Verification Strategy
The system's correctness is validated using automated unit tests written in `pytest`, using an isolated SQLite in-memory database (`sqlite://`) to avoid database pollution.

## 9.2 Test Suite Coverage
We implemented 20 distinct tests in `tests/test_monitoring.py` covering:
- Provider log parsers (GCP, Huawei Cloud, Entra ID).
- Auto-discovery of resource instances.
- Alert triggers and deduplication rules.
- Alert lifecycle transitions (Acknowledge, Resolve).
- Scoring logic (Baseline 100, deduction rules, acknowledgement mitigation, resolution recovery).
- FastAPI REST API routing.
- Interactive demo scenarios.
