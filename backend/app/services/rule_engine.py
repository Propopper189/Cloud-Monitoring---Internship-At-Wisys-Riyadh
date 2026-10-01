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

def process_normalized_event(db: Session, event_data: dict, is_manual_injection: bool = False) -> Event:
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
    
    # 1. Update Resource Inventory State
    update_resource_inventory(db, event)
    
    # 2. Immutable Audit Log Entry created for event
    audit = AuditLog(
        actor=event.actor,
        source_ip=event.source_ip,
        action=f"Injected {event.event_type} - {event.description}" if is_manual_injection else f"Event {event.event_type} - {event.description}",
        resource=event.resource_name,
        cloud_provider=event.cloud_provider,
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()

    # 3. Rule Evaluation & Alert Triggering
    rule = db.query(Rule).filter(Rule.event_type == event.event_type).first()
    
    should_alert = False
    alert_severity = event.severity
    rule_id = None
    rule_desc = event.description

    if rule:
        if rule.enabled:
            should_alert = True
            alert_severity = rule.severity
            rule_id = rule.id
            if rule.description:
                rule_desc = rule.description
    elif event.severity in ["CRITICAL", "HIGH", "WARNING"]:
        should_alert = True

    if should_alert and event.event_type not in ["VM_STARTED"]:
        existing_alert = db.query(Alert).filter(
            Alert.resource_id == event.resource_id,
            Alert.event_type == event.event_type,
            Alert.status == "OPEN"
        ).first()
        
        target_alert = existing_alert
        if not existing_alert:
            alert = Alert(
                id="ALT-" + str(uuid.uuid4())[:8].upper(),
                timestamp=datetime.utcnow(),
                cloud_provider=event.cloud_provider,
                category=CATEGORY_MAP.get(event.event_type, "SECURITY"),
                event_type=event.event_type,
                resource_id=event.resource_id,
                resource_name=event.resource_name,
                severity=alert_severity,
                actor=event.actor,
                source_ip=event.source_ip,
                description=rule_desc,
                status="OPEN",
                rule_id=rule_id
            )
            db.add(alert)
            db.commit()
            db.refresh(alert)
            target_alert = alert
            
        # Send Notification Log & Email ONLY when a MANUAL event is injected through the simulation page
        if is_manual_injection and target_alert and target_alert.severity in ["CRITICAL", "HIGH", "WARNING"]:
            send_alert_notification(db, target_alert)
                
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
