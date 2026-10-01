# CSE443 Viva Questions & Answers (50 Q&A)

### 1. General Project & Architecture Questions

**Q1: Why did you choose this project?**
*A:* During my internship at AI Watania Information Systems (WiSys), Riyadh, I worked on infrastructure operations. I noticed that tracking issues across GCP and Huawei Cloud consoles is complex, slow, and prone to credential leakage. I built this project to prototype a centralized monitoring platform that aggregates multi-cloud security event streams safely.

**Q2: How does this project relate to your internship?**
*A:* The project implements the exact alert requirements I configured at WiSys, including VM stops, security group edits, VPC deletions, backup failures, disabled audit logs, and alarm policies. It translates them into a safe local simulation using authentic GCP and Huawei CTS log structures.

**Q3: Why GCP and Huawei Cloud?**
*A:* These are the cloud platforms WiSys uses. GCP manages key compute/analytics workloads, and Huawei Cloud handles critical database platforms.

**Q4: What are the main components of your application?**
*A:* The backend uses Python, FastAPI, and SQLAlchemy (SQLite). The frontend uses React, Vite, TypeScript, and CSS.

**Q5: What is the benefit of a local simulation environment?**
*A:* It allows students and developers to study, test, and verify monitoring logic, rule match configurations, and incident lifecycles locally with zero cost, zero API keys, and zero security risks.

**Q6: What design pattern did you use to support multi-cloud log normalization?**
*A:* The Adapter Pattern. We defined a base `CloudProviderAdapter` interface with subclasses `GCPAdapter` and `HuaweiCloudAdapter` to parse heterogeneous payloads.

**Q7: How is the rule engine implemented?**
*A:* It compares normalized logs with database rules. If a rule is enabled and matches the log event type, it generates an alert record.

**Q8: Explain the security score calculation.**
*A:* It calculates a score from 0 to 100 based on open alerts. Acknowledging an alert halves its deduction, while resolving it removes the deduction completely.

**Q9: What is the purpose of the Audit Log?**
*A:* To track administrative and user actions, ensuring accountability.

**Q10: Why did you choose SQLite?**
*A:* It requires zero configuration, is file-based, runs locally, and integrates with SQLAlchemy.

**Q11: Why did you choose FastAPI over Flask or Django?**
*A:* FastAPI is faster, natively supports async/await, and auto-generates OpenAPI documentation.

**Q12: What is the purpose of the Background Simulator?**
*A:* It simulates background cloud events at configurable intervals (5s, 10s, 30s, 60s) to show the dashboard updating in real-time.

**Q13: How does the application avoid alert storming?**
*A:* It uses alert deduplication. If an alert of the same type is already OPEN on a resource, a new alert is not generated.

**Q14: Explain the difference between an Event and an Alert.**
*A:* An event is a raw log trace. An alert is an actionable ticket triggered by the rule engine.

**Q15: What metadata did you extract from GCP logs?**
*A:* Authentication info (principalEmail), request metadata (callerIp), and methodName (e.g. instances.stop).

**Q16: What metadata did you extract from Huawei CTS logs?**
*A:* service_type, trace_name (e.g., stopServer), user name, domain, and source_ip.

**Q17: How did you implement CORS in FastAPI?**
*A:* By using `CORSMiddleware` to allow communication from the React frontend port (5173).

**Q18: What is Pydantic and how is it used in the project?**
*A:* Pydantic is a data validation library. It defines the schemas for API requests and responses.

**Q19: How are the rules managed dynamically?**
*A:* Operators can toggle rules (enable/disable) or change their severity via the UI, which updates the database.

**Q20: What are the states of an Alert?**
*A:* OPEN, ACKNOWLEDGED, and RESOLVED.

**Q21: Why do acknowledged alerts recover 50% of security score deductions?**
*A:* Acknowledging indicates the security team is actively triaging and mitigating the threat, reducing organizational risk.

**Q22: Explain the notification simulation.**
*A:* When a critical or high alert triggers, the system creates a notification record containing recipient emails, subject, and alert details.

**Q23: How does resolving an alert affect the resource status?**
*A:* Resolving reverts the resource status (e.g., from STOPPED to ACTIVE) and sets its risk level back to LOW.

**Q24: What IP addresses did you use in the simulator?**
*A:* Standard reserved documentation IPs (RFC 5737): 192.0.2.x, 198.51.100.x, and 203.0.113.x.

**Q25: What is the role of TypeScript in the project?**
*A:* It provides compile-time type safety, reducing runtime errors.

**Q26: What charting libraries did you use?**
*A:* Recharts, to render responsive SVG charts on the frontend.

**Q27: How does database initialization work?**
*A:* On backend startup, `Base.metadata.create_all` creates the SQLite database tables and seeds them if empty.

**Q28: How do you run automated tests?**
*A:* Using `pytest` on the command line.

**Q29: Explain the in-memory test database setup.**
*A:* The test suite uses `sqlite://` (in-memory) to run tests in isolation, tearing it down afterward.

**Q30: How many tests did you implement?**
*A:* 20 tests verifying parsers, scoring, rules, alerts, and APIs.

**Q31: What happens when a VM is deleted?**
*A:* It generates a VM_DELETED event, triggers a CRITICAL alert, dispatches a notification, and updates resource status to DELETED.

**Q32: Explain the "Audit Log Disabled" threat.**
*A:* Disabling audit logs hides attacker actions. The platform treats this as CRITICAL, deducts 20 points, and fails the security check.

**Q33: What is Microsoft Entra ID?**
*A:* Microsoft's identity service. We simulated Entra ID credential management logs to monitor credential changes.

**Q33b: How are Entra ID logs parsed?**
*A:* The `MicrosoftEntraAdapter` normalizes them, identifying credential updates as potential security changes.

**Q34: How does the random simulator generate logs?**
*A:* It selects a random provider template, fills it with realistic IPs and actors, and processes it through the rule engine.

**Q35: What is the difference between metric-based and log-based alerts?**
*A:* Metric alerts trigger on thresholds (e.g., CPU >= 90%). Log alerts trigger on specific events (e.g., v1.compute.instances.stop).

**Q36: What is a CTS Trace log?**
*A:* A Huawei Cloud Trace Service record logging console or API operations.

**Q37: What is the risk of manual cloud monitoring?**
*A:* Human error, slow response times, and difficulty correlating logs across vendors.

**Q38: How does the system handle security checks dynamically?**
*A:* `recalculate_security_score` runs checks on database tables on every alert update.

**Q39: What is the project's folder layout?**
*A:* A clean split: backend/, frontend/, database/, tests/, docs/, and academic/.

**Q40: How does the dashboard poll data?**
*A:* The React frontend queries the dashboard and score endpoints every 3 seconds to update stats.

**Q41: How would this platform be deployed on real cloud infrastructure?**
*A:* By using GCP Pub/Sub triggers and Huawei CTS trackers to push events to our ingestion endpoints.

**Q42: What is the future scope of this project?**
*A:* Adding real-time WebSockets, integrating automated Terraform rollbacks, and implementing OAuth2 authentication.

**Q43: What is the limitation of SQLite in production?**
*A:* SQLite lacks support for high-concurrency writes, which would require PostgreSQL or MySQL in production.

**Q44: What did you learn about team collaboration?**
*A:* I learned how security teams use alerts to coordinate incidents.

**Q45: Explain the structure of the simulated notification table.**
*A:* It holds notification ID, alert ID, recipient, subject, message body, timestamp, and SENT status.

**Q46: How does the project help WiSys?**
*A:* It provides a safe simulation sandbox to train junior operations engineers on incident workflows.

**Q47: Why did you avoid Tailwind CSS?**
*A:* To keep the frontend lightweight, compliant with requirements, and custom-styled.

**Q48: How are Pydantic v2 schemas configured for SQLAlchemy models?**
*A:* By using `model_config = ConfigDict(from_attributes=True)` on base schemas.

**Q49: What Python version did you use?**
*A:* Python 3, ensuring compatibility with standard libraries.

**Q50: How do you verify that your rules are working?**
*A:* By triggering simulated scenarios and verifying alert generation on the dashboard and in the database.
