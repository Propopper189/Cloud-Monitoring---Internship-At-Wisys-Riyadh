# Architecture Design Document

## 1. Pipeline Overview
The Multi-Cloud Monitoring & Alerting Platform utilizes an event-driven design pattern consisting of four major stages:
1. **Event Ingestion & Emulation**: Consumes JSON structures representing raw cloud log triggers.
2. **Event Normalization (Adapter Pattern)**: Maps cloud-specific schemas (GCP AuditLog, Huawei Cloud CTS trace) into a unified internal system event.
3. **Rule Evaluation (Rule Engine)**: Processes normalized events against rule configurations. If an event violates active policy parameters, it generates an incident alert.
4. **Alert Response & Dashboard Telemetry**: Logs alerts to SQLite, sends simulated email alerts, updates the compliance security score, and pushes notifications.

## 2. Component Design
- **Adapters (`GCPAdapter`, `HuaweiCloudAdapter`, `MicrosoftEntraAdapter`)**: Subclasses of a common abstract interface `CloudProviderAdapter`. They normalize incoming JSON data into a uniform schema.
- **Rule Engine (`RuleEngine`)**: A database-driven evaluator that maps event types to rules. It contains alert deduplication logic, preventing incident storming for the same resource.
- **Security Score Engine (`SecurityScoreEngine`)**: Computes compliance metrics (0-100) dynamically. The score drops upon open alerts, recovers partially (50% reduction in penalty) upon alert acknowledgment, and fully recovers (0 deduction) upon resolution.
- **Background Simulator thread**: An async daemon thread that triggers random events at 5s, 10s, 30s, or 60s intervals.
