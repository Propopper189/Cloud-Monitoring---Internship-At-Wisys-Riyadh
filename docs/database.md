# Database Schema & Models

The local SQLite relational database is stored at `backend/monitoring.db`. The tables are configured using SQLAlchemy.

## 1. Table Specifications
- **`users`**: Academic operator profiles.
  - `id` (Integer, Primary Key)
  - `username` (String, Unique)
  - `email` (String, Unique)
  - `role` (String, Default: "operator")
  - `created_at` (DateTime)
  
- **`resources`**: Asset inventory mapping.
  - `id` (String, Primary Key)
  - `name` (String)
  - `cloud_provider` (String)
  - `region` (String)
  - `resource_type` (String)
  - `status` (String)
  - `risk_level` (String)
  - `details_json` (Text)
  - `last_monitored` (DateTime)
  
- **`events`**: Log of raw/normalized events.
  - `id` (String, Primary Key)
  - `timestamp` (DateTime)
  - `cloud_provider` (String)
  - `account_id` (String)
  - `project_id` (String)
  - `region` (String)
  - `resource_id` (String)
  - `resource_name` (String)
  - `resource_type` (String)
  - `event_type` (String)
  - `actor` (String)
  - `source_ip` (String)
  - `severity` (String)
  - `description` (String)
  - `raw_payload` (Text)
  
- **`alerts`**: Incident tickets.
  - `id` (String, Primary Key)
  - `timestamp` (DateTime)
  - `cloud_provider` (String)
  - `category` (String)
  - `event_type` (String)
  - `resource_id` (String)
  - `resource_name` (String)
  - `severity` (String)
  - `actor` (String)
  - `source_ip` (String)
  - `description` (String)
  - `status` (String, Default: "OPEN")
  - `rule_id` (String)
  - `acknowledged_at` (DateTime, Nullable)
  - `resolved_at` (DateTime, Nullable)
  - `acknowledged_by` (String, Nullable)
  - `resolved_by` (String, Nullable)

- **`rules`**: Active alerting policies.
  - `id` (String, Primary Key)
  - `name` (String)
  - `event_type` (String, Unique)
  - `severity` (String)
  - `description` (String)
  - `enabled` (Boolean)
  - `cloud_provider` (String)

- **`audit_logs`**: Internal administrative actions audit trail.
  - `id` (Integer, Primary Key)
  - `timestamp` (DateTime)
  - `actor` (String)
  - `source_ip` (String)
  - `action` (String)
  - `resource` (String)
  - `cloud_provider` (String)
  - `result` (String)

- **`notifications`**: Simulated dispatch records.
  - `id` (String, Primary Key)
  - `alert_id` (String)
  - `recipient` (String)
  - `subject` (String)
  - `message` (String)
  - `timestamp` (DateTime)
  - `status` (String)

- **`security_checks`**: Posture check evaluations.
  - `id` (String, Primary Key)
  - `name` (String)
  - `category` (String)
  - `status` (String)
  - `description` (String)
  - `points_deducted` (Integer)
  - `explanation` (Text)
