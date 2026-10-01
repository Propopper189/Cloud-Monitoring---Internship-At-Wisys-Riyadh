# Chapter 14: Future Scope

## 14.1 Production Deployments
In a production deployment, this local prototype would be expanded by:
1. **Real-time Webhook Ingestion**: Creating API endpoints that receive real-time GCP Pub/Sub pushes and Huawei Cloud SMS/CTS notifications.
2. **Terraform Integration**: Triggering automatic infrastructure remediation when security groups are modified (e.g. automatically reverting rules).
3. **IAM Role Based Access (RBAC)**: Integrating Microsoft Entra ID authentication for user logins.
4. **WebSocket Push**: Pushing events to the UI in real-time instead of polling.
