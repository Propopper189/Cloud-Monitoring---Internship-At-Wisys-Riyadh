import json
from abc import ABC, abstractmethod
from typing import Dict, Any

class CloudProviderAdapter(ABC):
    @abstractmethod
    def normalize(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        pass

class GCPAdapter(CloudProviderAdapter):
    def normalize(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        proto_payload = raw_log.get("protoPayload", {})
        resource = raw_log.get("resource", {})
        labels = resource.get("labels", {})
        auth_info = proto_payload.get("authenticationInfo", {})
        req_metadata = proto_payload.get("requestMetadata", {})
        
        method = proto_payload.get("methodName", "")
        event_type = "UNKNOWN"
        category = "COMPUTE"
        
        if "instances.stop" in method:
            event_type = "VM_STOPPED"
            category = "COMPUTE"
        elif "instances.start" in method:
            event_type = "VM_STARTED"
            category = "COMPUTE"
        elif "instances.reset" in method or "instances.restart" in method:
            event_type = "VM_RESTARTED"
            category = "COMPUTE"
        elif "instances.delete" in method:
            event_type = "VM_DELETED"
            category = "COMPUTE"
        elif "firewalls" in method or "networks.updateSecurityGroup" in method:
            event_type = "SECURITY_GROUP_MODIFIED"
            category = "NETWORK"
        elif "networks.delete" in method:
            event_type = "VPC_DELETED"
            category = "NETWORK"
        elif "logging.config" in method or "logging.disable" in method:
            event_type = "AUDIT_LOG_DISABLED"
            category = "SECURITY"
        elif "setIamPolicy" in method:
            event_type = "IAM_POLICY_CHANGED"
            category = "SECURITY"
        elif "roles.update" in method or "roles.create" in method:
            event_type = "IAM_ROLE_CHANGED"
            category = "SECURITY"
        elif "monitoring.alertPolicies" in method:
            event_type = "ALARM_POLICY_DISABLED" if "disable" in method else "ALARM_POLICY_DELETED"
            category = "MONITORING"
            
        severity = "INFO"
        if event_type in ["VM_STOPPED", "VM_RESTARTED", "VM_DELETED", "VPC_DELETED", "SECURITY_GROUP_MODIFIED", "AUDIT_LOG_DISABLED", "BACKUP_FAILED", "ALARM_POLICY_DELETED"]:
            severity = "CRITICAL"
        elif event_type in ["IAM_POLICY_CHANGED", "IAM_ROLE_CHANGED"]:
            severity = "HIGH"
        elif event_type in ["DISK_UTILIZATION_HIGH", "ALARM_POLICY_DISABLED"]:
            severity = "WARNING"
            
        res_name = proto_payload.get("resourceName", "").split("/")[-1] or labels.get("instance_id", "unknown-gcp-resource")
        
        return {
            "cloud_provider": "GCP",
            "account_id": labels.get("project_id", "wisys-gcp-project"),
            "project_id": labels.get("project_id", "wisys-gcp-project"),
            "region": labels.get("zone", "asia-east1-a"),
            "resource_id": labels.get("instance_id", res_name),
            "resource_name": res_name,
            "resource_type": "VM" if category == "COMPUTE" else ("VPC" if "network" in res_name.lower() else "Security Group"),
            "event_type": event_type,
            "actor": auth_info.get("principalEmail", "anonymous@wisys.sa"),
            "source_ip": req_metadata.get("callerIp", "192.0.2.1"),
            "severity": severity,
            "description": f"GCP event {event_type} detected on resource {res_name}.",
            "raw_payload": json.dumps(raw_log, indent=2)
        }

class HuaweiCloudAdapter(CloudProviderAdapter):
    def normalize(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        trace_name = raw_log.get("trace_name", "")
        service_type = raw_log.get("service_type", "")
        
        event_type = "UNKNOWN"
        category = "COMPUTE"
        
        if trace_name == "stopServer":
            event_type = "VM_STOPPED"
            category = "COMPUTE"
        elif trace_name == "startServer":
            event_type = "VM_STARTED"
            category = "COMPUTE"
        elif trace_name == "rebootServer":
            event_type = "VM_RESTARTED"
            category = "COMPUTE"
        elif trace_name == "deleteServer":
            event_type = "VM_DELETED"
            category = "COMPUTE"
        elif trace_name in ["updateSecurityGroup", "createSecurityGroupRule", "deleteSecurityGroupRule"]:
            event_type = "SECURITY_GROUP_MODIFIED"
            category = "NETWORK"
        elif trace_name == "deleteVpc":
            event_type = "VPC_DELETED"
            category = "NETWORK"
        elif trace_name == "disableAudit":
            event_type = "AUDIT_LOG_DISABLED"
            category = "SECURITY"
        elif trace_name in ["updateBackupPolicy", "deleteBackup"]:
            event_type = "BACKUP_FAILED"
            category = "STORAGE"
        elif trace_name == "deleteAlarmPolicy":
            event_type = "ALARM_POLICY_DELETED"
            category = "MONITORING"
        elif trace_name == "disableAlarmPolicy":
            event_type = "ALARM_POLICY_DISABLED"
            category = "MONITORING"
            
        severity = "INFO"
        if event_type in ["VM_STOPPED", "VM_RESTARTED", "VM_DELETED", "VPC_DELETED", "SECURITY_GROUP_MODIFIED", "AUDIT_LOG_DISABLED", "BACKUP_FAILED", "ALARM_POLICY_DELETED"]:
            severity = "CRITICAL"
        elif event_type in ["IAM_POLICY_CHANGED", "IAM_ROLE_CHANGED"]:
            severity = "HIGH"
        elif event_type in ["DISK_UTILIZATION_HIGH", "ALARM_POLICY_DISABLED"]:
            severity = "WARNING"
            
        user = raw_log.get("user", {})
        
        return {
            "cloud_provider": "Huawei Cloud",
            "account_id": user.get("domain", {}).get("name", "wisys-hw-domain"),
            "project_id": user.get("domain", {}).get("name", "wisys-hw-domain"),
            "region": raw_log.get("region", "ap-southeast-3"),
            "resource_id": raw_log.get("resource_id", "unknown-hw-resource"),
            "resource_name": raw_log.get("resource_name", "unknown-hw-resource"),
            "resource_type": "ECS" if category == "COMPUTE" else ("VPC" if "vpc" in trace_name.lower() else "Security Group"),
            "event_type": event_type,
            "actor": user.get("name", "hw-operator@wisys.sa"),
            "source_ip": raw_log.get("source_ip", "198.51.100.1"),
            "severity": severity,
            "description": raw_log.get("message", f"Huawei Cloud trace {trace_name} registered."),
            "raw_payload": json.dumps(raw_log, indent=2)
        }

class MicrosoftEntraAdapter(CloudProviderAdapter):
    def normalize(self, raw_log: Dict[str, Any]) -> Dict[str, Any]:
        activity = raw_log.get("activityDisplayName", "")
        initiated_by = raw_log.get("initiatedBy", {})
        user_info = initiated_by.get("user", {})
        target_resources = raw_log.get("targetResources", [{}])
        target = target_resources[0] if target_resources else {}
        
        event_type = "UNKNOWN"
        category = "SECURITY"
        
        if "Certificates and secrets management" in activity or "credential" in activity.lower():
            event_type = "IAM_POLICY_CHANGED"
        
        severity = "HIGH"
        
        return {
            "cloud_provider": "Microsoft Entra ID",
            "account_id": "wisys-entra-tenant",
            "project_id": "wisys-entra-tenant",
            "region": "global",
            "resource_id": target.get("id", "entra-app-id"),
            "resource_name": target.get("displayName", "entra-app-name"),
            "resource_type": "Application",
            "event_type": event_type,
            "actor": user_info.get("userPrincipalName", "entra-admin@wisys.sa"),
            "source_ip": user_info.get("ipAddress", "203.0.113.1"),
            "severity": severity,
            "description": f"Microsoft Entra ID audit log: {activity} on application {target.get('displayName')}.",
            "raw_payload": json.dumps(raw_log, indent=2)
        }
