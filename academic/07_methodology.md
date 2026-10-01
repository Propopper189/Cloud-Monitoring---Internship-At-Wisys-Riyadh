# Chapter 7: Methodology

## 7.1 Development Lifecycle
This project utilizes Agile software development principles, splitting implementation into distinct phases:
- **Phase 1: Analysis**: Researching GCP Cloud Logging and Huawei CTS schemas based on WiSys internship experiences.
- **Phase 2: Database Modeling**: Designing relational schemas representing resources, alerts, audit trails, and rules.
- **Phase 3: Service Engineering**: Writing adapters, rules, and scoring services.
- **Phase 4: API Integration**: Structuring endpoint routes.
- **Phase 5: UI Construction**: Implementing the React sidebar navigation, dashboards, and detailed alert models.
- **Phase 6: Testing**: Validating code logic via unit tests.

## 7.2 Log Structure Emulation
To maintain academic rigor, the raw payloads were extracted from public documentation and WiSys logs, using standard non-routable IPs (RFC 5737: 192.0.2.x, 198.51.100.x, 203.0.113.x) to ensure compliance.
