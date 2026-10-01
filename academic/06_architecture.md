# Chapter 6: Architecture Design

## 6.1 Logical Architecture
The architecture is structured around four primary layers:
1. **Simulator Layer**: Emulates raw cloud actions (VM stops, VPC deletions) producing realistic JSON payloads.
2. **Ingestion & Normalization Layer**: Uses `GCPAdapter`, `HuaweiCloudAdapter`, and `MicrosoftEntraAdapter` to transform logs.
3. **Core Services Layer**:
   - **Rule Engine**: Evaluates logs against criteria.
   - **Security Score Engine**: Adjusts score dynamically based on unresolved alerts.
   - **Alerting & Notification Service**: Dispatches mock notifications and manages acknowledgement states.
4. **Data & API Layer**: SQLite for storage, FastAPI for REST routing, and React TypeScript for visualization.

## 6.2 Normalization Data Flow
```
[Raw GCP Log] ----------> GCPAdapter ----------\
                                               v
[Raw Huawei CTS Log] ---> HuaweiCloudAdapter -> [Normalized Event] -> Rule Engine -> Alert Generation
                                               ^
[Raw Entra Log] --------> MicrosoftEntraAdapter //
```
