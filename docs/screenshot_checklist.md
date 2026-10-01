# Report Screenshot Checklist

Capture the following 20 screenshots from the running platform to attach to the final CSE443 project report:

1. **Dashboard Overview**: showing baseline stats, 100% Security Score, empty alert tables, and initial cloud summaries.
2. **Resource Inventory**: lists GCP `vm-sap-prod`, Huawei `ecs-billing-app` in active green states.
3. **Event Simulator Control Panel**: displaying input fields, scenario dropdowns, and "Start Simulator" buttons.
4. **Triggering VM Stopped Scenario**: screenshot of clicking the "Run Scenario" button.
5. **Critical Alert Alerting**: Dashboard updated with a CRITICAL red alert banner.
6. **Detailed Alert Inspector**: clicking on the alert to view its JSON raw payload (`protoPayload` from GCP).
7. **Simulated Notification Log**: showing the email draft to `gcp-alerts@wisys.sa` with subject, body, and client details.
8. **Acknowledge Action**: clicking Acknowledge and seeing the status update to ACKNOWLEDGED.
9. **Acknowledged State Score**: showing the Security Score has recovered to 95.
10. **Resolve Action**: clicking Resolve, transitioning the alert to RESOLVED.
11. **Resolved Resources**: showing `vm-sap-prod` status returning to ACTIVE.
12. **Hacker Security Group Change**: triggering the Huawei Security Group Modified scenario.
13. **Security Audit Log Entry**: showing unauthorized user audit line in red.
14. **Audit Logs Table**: illustrating the audit history filter by GCP and Huawei providers.
15. **Audit Sink Disabled Event**: triggering Scenario C where logs are disabled.
16. **Failed Security Score Page**: showing Audit Logging Configuration check in FAILED state (red) with 20 points deduction.
17. **Rules Configuration Dashboard**: viewing the 14 rules in the rules table.
18. **Disabling Rules**: toggling "Enabled" switch off for `rule-vm-stopped`.
19. **FastAPI OpenAPI Swagger Documentation**: showing `http://127.0.0.1:8000/docs` with all endpoints list.
20. **Pytest CLI Terminal Success**: showing terminal execution output of `pytest -v` with all 20 test cases green.
