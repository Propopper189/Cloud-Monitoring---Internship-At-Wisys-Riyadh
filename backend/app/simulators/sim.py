import random
import json
from datetime import datetime
from sqlalchemy.orm import Session
from backend.app.utils.adapters import GCPAdapter, HuaweiCloudAdapter, MicrosoftEntraAdapter
from backend.app.services.rule_engine import process_normalized_event
from backend.app.models.models import Resource

IP_POOL = [
    "192.0.2.25", "192.0.2.110", "192.0.2.14",
    "198.51.100.12", "198.51.100.45", "198.51.100.22",
    "203.0.113.8", "203.0.113.89", "203.0.113.51"
]

ACTORS = [
    "admin-sec@wisys.sa", "operator-ops@wisys.sa", "gcp-engineer@wisys.sa",
    "huawei-admin@wisys.sa", "entra-audit@wisys.sa", "db-operator@wisys.sa"
]

GCP_TEMPLATE = {
    "insertId": "gcp-insert-id-placeholder",
    "logName": "projects/demo-wisys-prod/logs/cloudaudit.googleapis.com%2Factivity",
    "resource": {
        "type": "gce_instance",
        "labels": {
            "instance_id": "gcp-res-id-placeholder",
            "project_id": "wisys-gcp-prod",
            "zone": "asia-south1-a"
        }
    },
    "protoPayload": {
        "@type": "type.googleapis.com/google.cloud.audit.AuditLog",
        "authenticationInfo": {
            "principalEmail": "gcp-actor-placeholder"
        },
        "requestMetadata": {
            "callerIp": "gcp-ip-placeholder"
        },
        "serviceName": "compute.googleapis.com",
        "methodName": "gcp-method-placeholder",
        "resourceName": "projects/wisys-gcp-prod/zones/asia-south1-a/instances/gcp-res-name-placeholder"
    }
}

HUAWEI_TEMPLATE = {
    "time": 1724018400000,
    "service_type": "ECS",
    "resource_type": "ecs",
    "resource_name": "hw-res-name-placeholder",
    "resource_id": "hw-res-id-placeholder",
    "trace_name": "hw-trace-placeholder",
    "trace_rating": "normal",
    "trace_type": "consoleAction",
    "code": 200,
    "region": "ap-southeast-3",
    "message": "Huawei Trace Operation Executed Successfully",
    "user": {
        "name": "hw-actor-placeholder",
        "domain": {
            "name": "wisys-domain"
        }
    },
    "source_ip": "hw-ip-placeholder"
}

ENTRA_TEMPLATE = {
    "id": "entra-audit-id-placeholder",
    "activityDateTime": "2026-08-18T22:03:00Z",
    "category": "ApplicationManagement",
    "activityDisplayName": "Update application - Certificates and secrets management",
    "loggedByService": "Core Directory",
    "initiatedBy": {
        "user": {
            "userPrincipalName": "entra-actor-placeholder",
            "ipAddress": "entra-ip-placeholder"
        }
    },
    "targetResources": [
        {
            "id": "entra-res-id-placeholder",
            "displayName": "entra-res-name-placeholder",
            "type": "Application",
            "modifiedProperties": []
        }
    ]
}

def generate_random_event(db: Session) -> dict:
    # 1. Fetch active resources currently seeded in the database
    resources = db.query(Resource).all()
    if not resources:
        return {}
        
    resource = random.choice(resources)
    provider = resource.cloud_provider
    actor = random.choice(ACTORS)
    ip = random.choice(IP_POOL)
    
    if provider == "GCP":
        if resource.resource_type == "VM":
            method = random.choice(["v1.compute.instances.stop", "v1.compute.instances.delete"])
        elif resource.resource_type == "Security Group":
            method = "v2.compute.firewalls.patch"
        elif resource.resource_type == "VPC":
            method = "v1.compute.networks.delete"
        elif resource.resource_type == "Alarm Policy":
            method = "monitoring.alertPolicies.delete"
        else:
            method = "v1.compute.instances.stop"
            
        raw_log = json.loads(json.dumps(GCP_TEMPLATE))
        raw_log["protoPayload"]["methodName"] = method
        raw_log["protoPayload"]["authenticationInfo"]["principalEmail"] = actor
        raw_log["protoPayload"]["requestMetadata"]["callerIp"] = ip
        raw_log["resource"]["labels"]["instance_id"] = resource.id
        raw_log["resource"]["labels"]["project_id"] = "wisys-gcp-prod"
        raw_log["protoPayload"]["resourceName"] = f"projects/wisys-gcp-prod/zones/asia-south1-a/instances/{resource.name}"
        
        adapter = GCPAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        return normalized

    elif provider == "Huawei Cloud":
        if resource.resource_type == "ECS":
            trace = random.choice(["stopServer", "deleteServer", "rebootServer"])
        elif resource.resource_type == "Security Group":
            trace = "updateSecurityGroup"
        elif resource.resource_type == "VPC":
            trace = "deleteVpc"
        elif resource.resource_type == "Backup":
            trace = "deleteBackup"
        elif resource.resource_type == "Alarm Policy":
            trace = "disableAlarmPolicy"
        else:
            trace = "stopServer"
            
        raw_log = json.loads(json.dumps(HUAWEI_TEMPLATE))
        raw_log["trace_name"] = trace
        raw_log["user"]["name"] = actor
        raw_log["source_ip"] = ip
        raw_log["resource_id"] = resource.id
        raw_log["resource_name"] = resource.name
        raw_log["message"] = f"Huawei CTS action {trace} executed by {actor} on {resource.name}."
        
        adapter = HuaweiCloudAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        return normalized
        
    else: # Microsoft Entra ID
        trace_action = random.choice(["Update application - Certificates and secrets management", "Update application"])
        
        raw_log = json.loads(json.dumps(ENTRA_TEMPLATE))
        raw_log["activityDisplayName"] = trace_action
        raw_log["initiatedBy"]["user"]["userPrincipalName"] = actor
        raw_log["initiatedBy"]["user"]["ipAddress"] = ip
        raw_log["targetResources"][0]["id"] = resource.id
        raw_log["targetResources"][0]["displayName"] = resource.name
        raw_log["id"] = f"audit-entra-{random.randint(10000, 99999)}"
        
        adapter = MicrosoftEntraAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        return normalized

def trigger_scenario(db: Session, scenario_name: str) -> list:
    events_triggered = []
    
    if scenario_name == "vm_stopped_lifecycle":
        raw_log = json.loads(json.dumps(GCP_TEMPLATE))
        raw_log["protoPayload"]["methodName"] = "v1.compute.instances.stop"
        raw_log["protoPayload"]["authenticationInfo"]["principalEmail"] = "operator-ops@wisys.sa"
        raw_log["protoPayload"]["requestMetadata"]["callerIp"] = "192.0.2.14"
        raw_log["resource"]["labels"]["instance_id"] = "inst-sap-99"
        raw_log["protoPayload"]["resourceName"] = "projects/wisys-gcp-prod/zones/asia-south1-a/instances/vm-sap-prod"
        
        existing_res = db.query(Resource).filter(Resource.id == "inst-sap-99").first()
        if not existing_res:
            db_res = Resource(
                id="inst-sap-99",
                name="vm-sap-prod",
                cloud_provider="GCP",
                region="asia-south1-a",
                resource_type="VM",
                status="ACTIVE",
                risk_level="LOW",
                details_json=json.dumps({"owner": "SAP Team", "tier": "Production"})
            )
            db.add(db_res)
            db.commit()
            
        adapter = GCPAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        events_triggered.append(normalized)
        
    elif scenario_name in ("security_group_modified", "security_group_tampering"):
        raw_log = json.loads(json.dumps(HUAWEI_TEMPLATE))
        raw_log["trace_name"] = "updateSecurityGroup"
        raw_log["user"]["name"] = "unauthorized-hacker@wisys.sa"
        raw_log["source_ip"] = "203.0.113.51"
        raw_log["resource_id"] = "sg-92718"
        raw_log["resource_name"] = "sg-hw-database"
        raw_log["message"] = "Huawei CTS action updateSecurityGroup executed. Port 22 opened to 0.0.0.0/0."
        
        existing_res = db.query(Resource).filter(Resource.id == "sg-92718").first()
        if not existing_res:
            db_res = Resource(
                id="sg-92718",
                name="sg-hw-database",
                cloud_provider="Huawei Cloud",
                region="ap-southeast-3",
                resource_type="Security Group",
                status="ACTIVE",
                risk_level="LOW",
                details_json=json.dumps({"rules": "Inbound TCP 3306 only"})
            )
            db.add(db_res)
            db.commit()
            
        adapter = HuaweiCloudAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        events_triggered.append(normalized)
        
    elif scenario_name in ("audit_log_disabled", "audit_logging_disabled"):
        raw_log = json.loads(json.dumps(GCP_TEMPLATE))
        raw_log["protoPayload"]["methodName"] = "logging.config.deleteSink"
        raw_log["protoPayload"]["authenticationInfo"]["principalEmail"] = "rogue-admin@wisys.sa"
        raw_log["protoPayload"]["requestMetadata"]["callerIp"] = "198.51.100.45"
        raw_log["resource"]["labels"]["instance_id"] = "audit-sink-991"
        raw_log["protoPayload"]["resourceName"] = "projects/wisys-gcp-prod/zones/global/loggingSinks/gcp-logging-audit"
        
        existing_res = db.query(Resource).filter(Resource.id == "audit-sink-991").first()
        if not existing_res:
            db_res = Resource(
                id="audit-sink-991",
                name="gcp-logging-audit",
                cloud_provider="GCP",
                region="global",
                resource_type="Security Group",
                status="ACTIVE",
                risk_level="LOW",
                details_json=json.dumps({"type": "Stackdriver Audit Log Sink"})
            )
            db.add(db_res)
            db.commit()
            
        adapter = GCPAdapter()
        normalized = adapter.normalize(raw_log)
        process_normalized_event(db, normalized, is_manual_injection=True)
        events_triggered.append(normalized)
        
    return events_triggered
