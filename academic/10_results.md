# Chapter 10: Results & Discussion

## 10.1 Operational System Execution
The application launches successfully. On initial startup, the SQLite database seeds itself with 11 core resources, 14 default monitoring rules, and baseline security check configurations.

## 10.2 Scenario Verification Results
- **Scenario A (VM Stopped)**: Triggers critical GCP alert, changes resource status to STOPPED, decreases security score to 90. Acknowledging alert increases score to 95. Resolving alert restores score to 100.
- **Scenario B (Security Group Modified)**: Generates Huawei CTS event, alerts security-ops, registers incident on audit log page.
- **Scenario C (Audit Logs Disabled)**: Deducts 20 points from compliance score immediately, shifting security state to WARNING.

All statistics and chart counts on the Dashboard reflect simulator state immediately.
