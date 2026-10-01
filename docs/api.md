# REST API Reference

The FastAPI backend exposes swagger documentation at `http://127.0.0.1:8000/docs`.

## 1. Endpoints List

### Dashboard
- **`GET /api/dashboard`**: Returns global statistics, breakdown counts for severities, provider alerts, status distributions, and charts data.

### Resources
- **`GET /api/resources`**: List assets. Supports parameters `cloud_provider`, `resource_type`, `status`, `risk_level`, `search`.
- **`GET /api/resources/{id}`**: Returns individual resource details.

### Events
- **`GET /api/events`**: Returns log of normalized events.
- **`POST /api/events`**: Inject custom manually generated events.

### Alerts
- **`GET /api/alerts`**: Returns active/resolved alerts list. Supports filtering parameters.
- **`GET /api/alerts/{id}`**: Detailed incident record with related raw events and audit logs.
- **`PATCH /api/alerts/{id}/acknowledge`**: Transitions alert status to `ACKNOWLEDGED` (halving its compliance deduction score).
- **`PATCH /api/alerts/{id}/resolve`**: Transitions alert status to `RESOLVED` (clearing points deduction and restoring resource health).

### Rules
- **`GET /api/rules`**: Returns list of alarm policies.
- **`PATCH /api/rules/{id}`**: Modify rule severity, description, or disable/enable toggle.

### Audit Logs & Notifications
- **`GET /api/audit-logs`**: Administrative audit logs list.
- **`GET /api/notifications`**: Simulated dispatch email records.
- **`GET /api/security-score`**: Lists checklist checks (PASSED/WARNING/FAILED), points deducted, and compliance score.

### Simulator Control
- **`GET /api/simulator/config`**: Gets simulator running status.
- **`POST /api/simulator/control`**: Start, pause, or stop background random events simulator.
- **`POST /api/simulator/random`**: Triggers single random cloud event.
- **`POST /api/simulator/scenario`**: Runs structured scenarios (e.g. `vm_stopped_lifecycle`, `security_group_modified`, `audit_log_disabled`).
