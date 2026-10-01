from sqlalchemy.orm import Session
from datetime import datetime
from backend.app.models.models import Alert, Resource, AuditLog
from backend.app.services.security_score import recalculate_security_score

def acknowledge_alert(db: Session, alert_id: str, operator_email: str, source_ip: str) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise ValueError(f"Alert with ID {alert_id} not found.")
        
    if alert.status == "OPEN":
        alert.status = "ACKNOWLEDGED"
        alert.acknowledged_at = datetime.utcnow()
        alert.acknowledged_by = operator_email
        
        audit = AuditLog(
            actor=operator_email,
            source_ip=source_ip,
            action=f"Acknowledged alert {alert_id} ({alert.event_type})",
            resource=alert.resource_name,
            cloud_provider=alert.cloud_provider,
            result="SUCCESS"
        )
        db.add(audit)
        db.commit()
        
        recalculate_security_score(db)
        
    return alert

def resolve_alert(db: Session, alert_id: str, operator_email: str, source_ip: str) -> Alert:
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise ValueError(f"Alert with ID {alert_id} not found.")
        
    if alert.status in ["OPEN", "ACKNOWLEDGED"]:
        alert.status = "RESOLVED"
        alert.resolved_at = datetime.utcnow()
        alert.resolved_by = operator_email
        
        resource = db.query(Resource).filter(Resource.id == alert.resource_id).first()
        if resource:
            if alert.event_type in ["VM_STOPPED", "VM_HEALTH_CHECK_FAILED"]:
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
            elif alert.event_type == "SECURITY_GROUP_MODIFIED":
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
            elif alert.event_type == "AUDIT_LOG_DISABLED":
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
            elif alert.event_type == "ALARM_POLICY_DISABLED":
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
            elif alert.event_type == "DISK_UTILIZATION_HIGH":
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
            elif alert.event_type == "BACKUP_FAILED":
                resource.status = "ACTIVE"
                resource.risk_level = "LOW"
                
        audit = AuditLog(
            actor=operator_email,
            source_ip=source_ip,
            action=f"Resolved alert {alert_id} ({alert.event_type}) - Restored baseline resource security",
            resource=alert.resource_name,
            cloud_provider=alert.cloud_provider,
            result="SUCCESS"
        )
        db.add(audit)
        db.commit()
        
        recalculate_security_score(db)
        
    return alert
