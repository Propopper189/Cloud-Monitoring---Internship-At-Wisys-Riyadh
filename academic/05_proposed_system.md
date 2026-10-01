# Chapter 5: Proposed System

## 5.1 System Overview
The proposed system is an event-driven, rule-based infrastructure monitoring platform that acts as a local security information center. It normalizes GCP Audit Logs, Huawei CTS trace logs, and Entra ID application logs, processing them through a centralized pipeline.

```
Cloud Event Log -> Normalization Adapters -> Rule Engine -> DB Storage -> REST API -> React Dashboard
                                                         -> Notifications (Email Simulator)
```

## 5.2 Benefits of the Proposed Platform
- **Unified Event Queue**: Normalizes multi-vendor syntax into a single model, ensuring unified severity ratings.
- **Dynamic Risk Evaluation**: Changes resource risk states (LOW to CRITICAL) dynamically when events occur.
- **Local Incident Lifecycle Simulation**: Allows operators to acknowledge and resolve simulated incidents directly from the UI, restoring resource health and compliance scores.
- **Zero Credentials Requirement**: By simulating log generation locally, it eliminates security risks associated with API credential leakage.
