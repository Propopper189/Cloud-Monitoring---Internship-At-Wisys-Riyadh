# Chapter 2: Problem Statement

## 2.1 Multi-Cloud Visibility Silos
When managing GCP and Huawei Cloud concurrently, operations engineers must inspect separate portals (GCP Cloud Operations Suite and Huawei Cloud Eye/CTS) to track infrastructure events. This fragmentation increases response times, delays threat recognition, and raises the likelihood of operational oversight.

## 2.2 Unmanaged Configuration Drift & Security Risks
Critical infrastructure actions, such as:
- VPC network deletions (causing absolute network failure),
- Firewall/Security Group modifications (opening administrative ports like TCP 22/3389 to public traffic),
- Disabling Audit Logging (leaving security teams blind to malicious insider actions),
often happen without immediate notification. Manual verification is incapable of catching these events in real-time.

## 2.3 Alert Fatigue and Inconsistent Severity Mapping
Different cloud providers report severity scores and event categories using disparate schemas. Without a central parsing layer that normalizes severities, security teams suffer from alert fatigue—drowning in low-priority logs while critical service outages are missed. There is a critical academic and practical need for a unified rule engine that normalizes multi-cloud telemetry locally.
