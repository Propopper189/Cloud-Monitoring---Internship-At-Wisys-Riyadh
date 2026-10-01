# Testing & Verification Guide

## 1. Test Architecture
The test suite utilizes `pytest` and FastAPI's `TestClient` class. To prevent database corruption and preserve developer states:
- A temporary, in-memory SQLite connection is spawned before testing (`sqlite://`).
- Relational tables are generated, seeded with test structures, and drop automatically upon test tear-down.
- App database dependency (`get_db`) is overridden for client routing.

## 2. Running the Tests
Execute the testing command within the workspace root:
```bash
pytest -v
```

## 3. List of Test Scenarios Verified
- **Log Parsing Norms**: `test_gcp_adapter_normalization_vm_stopped`, `test_gcp_adapter_normalization_vpc_deleted`, `test_hw_adapter_normalization_stop_server`, `test_hw_adapter_normalization_disable_audit`, `test_entra_adapter_normalization`.
- **Logic & Rules**: `test_resource_auto_discovery`, `test_alert_generation_on_rule_match`, `test_alert_deduplication`, `test_disabled_rule_no_alert`, `test_security_audit_events_logging`.
- **Workflow & Scoring**: `test_notification_sent_on_critical_alert`, `test_alert_acknowledgement`, `test_alert_resolution_restores_resource`, `test_security_score_baseline`, `test_security_score_decreases_on_alert`, `test_security_score_halved_on_acknowledgement`, `test_security_score_recovers_on_resolution`.
- **REST APIs**: `test_api_get_rules`, `test_api_patch_rule`, `test_api_run_scenario`.
