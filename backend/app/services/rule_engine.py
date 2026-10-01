from sqlalchemy.orm import Session
from backend.app.models.models import Event, Alert, Rule, Resource, AuditLog
from backend.app.services.notification_service import send_alert_notification
from backend.app.services.security_score import recalculate_security_score
from datetime import datetime
import uuid
import json

CATEGORY_MAP = {
    "VM_STARTED": "COMPUTE",
    "VM_STOPPED": "COMPUTE",
    "VM_RESTARTED": "COMPUTE",
    "VM_DELETED": "COMPUTE",
    "VM_HEALTH_CHECK_FAILED": "COMPUTE",
    "DISK_UTILIZATION_HIGH": "STORAGE",
    "BACKUP_FAILED": "STORAGE",
    "SECURITY_GROUP_MODIFIED": "NETWORK",
    "VPC_DELETED": "NETWORK",
    "AUDIT_LOG_DISABLED": "SECURITY",
    "IAM_POLICY_CHANGED": "SECURITY",
    "IAM_ROLE_CHANGED": "SECURITY",
    "ALARM_POLICY_DELETED": "MONITORING",
    "ALARM_POLICY_DISABLED": "MONITORING"
}

def process_normalized_event(db: Session, event_data: dict) -> Event:
    event = Event(
        id=str(uuid.uuid4()),
        cloud_provider=event_data["cloud_provider"],
        account_id=event_data.get("account_id"),
        project_id=event_data.get("project_id"),
        region=event_data["region"],
        resource_id=event_data["resource_id"],
        resource_name=event_data["resource_name"],
        resource_type=event_data["resource_type"],
        event_type=event_data["event_type"],
        actor=event_data["actor"],
        source_ip=event_data["source_ip"],
        severity=event_data["severity"],
        description=event_data["description"],
        raw_payload=event_data.get("raw_payload")
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    
    update_resource_inventory(db, event)
    
    # Audit log entry for security audit events
    if event.event_type in ["SECURITY_GROUP_MODIFIED", "VPC_DELETED", "AUDIT_LOG_DISABLED", "IAM_POLICY_CHANGED", "IAM_ROLE_CHANGED", "ALARM_POLICY_DELETED", "ALARM_POLICY_DISABLED"]:
        audit = AuditLog(
            actor=event.actor,
            source_ip=event.source_ip,
            action=event.description,
            resource=event.resource_name,
            cloud_provider=event.cloud_provider,
            result="SUCCESS"
        )
        db.add(audit)
        db.commit()

    rule = db.query(Rule).filter(Rule.event_type == event.event_type).first()
    if rule and rule.enabled:
        existing_alert = db.query(Alert).filter(
            Alert.resource_id == event.resource_id,
            Alert.event_type == event.event_type,
            Alert.status == "OPEN"
        ).first()
        
        if not existing_alert:
            if event.event_type not in ["VM_STARTED"]:
                alert = Alert(
                    id="ALT-" + str(uuid.uuid4())[:8].upper(),
                    timestamp=datetime.utcnow(),
                    cloud_provider=event.cloud_provider,
                    category=CATEGORY_MAP.get(event.event_type, "GENERAL"),
                    event_type=event.event_type,
                    resource_id=event.resource_id,
                    resource_name=event.resource_name,
                    severity=rule.severity,
                    actor=event.actor,
                    source_ip=event.source_ip,
                    description=rule.description or event.description,
                    status="OPEN",
                    rule_id=rule.id
                )
                db.add(alert)
                db.commit()
                db.refresh(alert)
                
                if alert.severity in ["CRITICAL", "HIGH"]:
                    send_alert_notification(db, alert)
                    
                recalculate_security_score(db)
                
    return event

def update_resource_inventory(db: Session, event: Event):
    resource = db.query(Resource).filter(Resource.id == event.resource_id).first()
    
    status_map = {
        "VM_STARTED": "ACTIVE",
        "VM_STOPPED": "STOPPED",
        "VM_RESTARTED": "ACTIVE",
        "VM_DELETED": "DELETED",
        "VM_HEALTH_CHECK_FAILED": "FAILED",
        "SECURITY_GROUP_MODIFIED": "MODIFIED",
        "VPC_DELETED": "DELETED",
        "AUDIT_LOG_DISABLED": "DISABLED",
        "ALARM_POLICY_DISABLED": "DISABLED",
        "ALARM_POLICY_DELETED": "DELETED",
        "DISK_UTILIZATION_HIGH": "WARNING",
        "BACKUP_FAILED": "FAILED"
    }
    
    new_status = status_map.get(event.event_type)
    if new_status:
        risk_map = {
            "ACTIVE": "LOW",
            "STOPPED": "HIGH",
            "DELETED": "CRITICAL",
            "FAILED": "CRITICAL",
            "MODIFIED": "MEDIUM",
            "DISABLED": "CRITICAL",
            "WARNING": "MEDIUM"
        }
        risk_level = risk_map.get(new_status, "LOW")
        
        if not resource:
            resource = Resource(
                id=event.resource_id,
                name=event.resource_name,
                cloud_provider=event.cloud_provider,
                region=event.region,
                resource_type=event.resource_type,
                status=new_status,
                risk_level=risk_level,
                details_json=json.dumps({"description": f"Auto-discovered resource during {event.event_type} event."})
            )
            db.add(resource)
        else:
            resource.status = new_status
            resource.risk_level = risk_level
            details = {}
            if resource.details_json:
                try:
                    details = json.loads(resource.details_json)
                except Exception:
                    pass
            details["last_event"] = event.event_type
            details["updated_by"] = event.actor
            resource.details_json = json.dumps(details)
            
        db.commit()
