# Chapter 3: Objectives

## 3.1 Primary Goal
The primary objective of this project is to design, develop, and evaluate a prototype Multi-Cloud Infrastructure Monitoring and Security Alerting Platform. The platform must consume raw cloud audit traces, normalize them, and trigger instant security alerts based on static compliance rules, running entirely in a local environment.

## 3.2 Key Technical Objectives
1. **Log Normalization Interface**: Build a normalized ingestion interface using adapter patterns (`GCPAdapter` and `HuaweiCloudAdapter`) to translate heterogeneous JSON logs.
2. **Rule-Based Evaluation Engine**: Create a rule engine to compare incoming normalized logs with user-defined rules and trigger alerts.
3. **Simulated Notification Loop**: Replicate notification workflows (simulated SMTP outputs) for critical events.
4. **Dynamic Security Score Metrics**: Implement a compliance calculation algorithm that updates a security posture score (0-100) dynamically when events occur.
5. **Interactive Operator Dashboard**: Design an enterprise-grade dashboard displaying alert counts, cloud-provider stats, inventory maps, audit trails, and simulator scenarios.
6. **Zero-Cost Simulation Architecture**: Ensure the entire system executes locally on SQLite and FastAPI with zero cloud cost or dependency.
