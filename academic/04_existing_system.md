# Chapter 4: Existing System Analysis

## 4.1 Cloud-Native Monitoring Frameworks
Existing cloud monitoring rely on vendor-locked tools:
- **Google Cloud Operations Suite** (formerly Stackdriver): Collects logs, metrics, and traces for GCP resources.
- **Huawei Cloud Eye & Cloud Trace Service (CTS)**: Tracks resource modifications and alarm configurations inside Huawei Cloud tenants.

## 4.2 Limitations of the Existing Architecture
1. **Lack of Centralized Auditing**: No out-of-the-box system aggregates GCP logging sinks, Huawei CTS traces, and Microsoft Entra ID audit streams into a single dashboard without paid third-party SIEM platforms (like Splunk or Sentinel).
2. **Subscription & API Complexity**: Connecting real-time webhooks across providers requires complex IAM setups, credential rotations, and generates significant API execution costs.
3. **Inconsistent Resource State Tracking**: When a VM stops in GCP, there is no automatic alignment with firewall status or backup states managed in other providers.
4. **Licensing & Resource Overhead**: Existing enterprise SIEM platforms are cost-prohibitive for academic study and small-to-medium enterprises.
