from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import List, Optional
import json

from backend.app.database import get_db
from backend.app.models.models import Resource, Event, Alert, Rule, AuditLog, Notification, SecurityCheck
from backend.app.schemas import schemas
from backend.app.services.alert_service import acknowledge_alert, resolve_alert
from backend.app.services.security_score import recalculate_security_score
from backend.app.services.rule_engine import process_normalized_event
from backend.app.simulators.sim import generate_random_event, trigger_scenario
from backend.app.utils.adapters import GCPAdapter, HuaweiCloudAdapter
from backend.app.services.notification_service import get_smtp_config, save_smtp_config

router = APIRouter()

@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Total resources
    total_resources = db.query(Resource).filter(Resource.status != "DELETED").count()
    total_events = db.query(Event).count()
    total_alerts = db.query(Alert).count()
    
    # 2. Alert severity counts
    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    high_alerts = db.query(Alert).filter(Alert.severity == "HIGH", Alert.status != "RESOLVED").count()
    warning_alerts = db.query(Alert).filter(Alert.severity == "WARNING", Alert.status != "RESOLVED").count()
    
    # 3. Status counts
    open_alerts = db.query(Alert).filter(Alert.status == "OPEN").count()
    ack_alerts = db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").count()
    resolved_alerts = db.query(Alert).filter(Alert.status == "RESOLVED").count()
    
    # 4. Security score
    security_score = recalculate_security_score(db)
    
    # 5. GCP Summary
    gcp_resources = db.query(Resource).filter(Resource.cloud_provider == "GCP", Resource.status != "DELETED").count()
    gcp_events = db.query(Event).filter(Event.cloud_provider == "GCP").count()
    gcp_alerts = db.query(Alert).filter(Alert.cloud_provider == "GCP").count()
    gcp_critical = db.query(Alert).filter(Alert.cloud_provider == "GCP", Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    
    # 6. Huawei Summary
    hw_resources = db.query(Resource).filter(Resource.cloud_provider == "Huawei Cloud", Resource.status != "DELETED").count()
    hw_events = db.query(Event).filter(Event.cloud_provider == "Huawei Cloud").count()
    hw_alerts = db.query(Alert).filter(Alert.cloud_provider == "Huawei Cloud").count()
    hw_critical = db.query(Alert).filter(Alert.cloud_provider == "Huawei Cloud", Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    
    # Breakdown charts
    severities = ["CRITICAL", "HIGH", "WARNING", "INFO"]
    alerts_by_sev = {sev: db.query(Alert).filter(Alert.severity == sev).count() for sev in severities}
    
    providers = ["GCP", "Huawei Cloud", "Microsoft Entra ID"]
    alerts_by_prov = {prov: db.query(Alert).filter(Alert.cloud_provider == prov).count() for prov in providers}
    events_by_prov = {prov: db.query(Event).filter(Event.cloud_provider == prov).count() for prov in providers}
    
    categories = ["COMPUTE", "STORAGE", "NETWORK", "SECURITY", "MONITORING"]
    alerts_by_cat = {cat: db.query(Alert).filter(Alert.category == cat).count() for cat in categories}
    
    statuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"]
    alerts_by_stat = {stat: db.query(Alert).filter(Alert.status == stat).count() for stat in statuses}
    
    return {
        "total_resources": total_resources,
        "total_events": total_events,
        "total_alerts": total_alerts,
        "critical_alerts": critical_alerts,
        "high_alerts": high_alerts,
        "warning_alerts": warning_alerts,
        "open_alerts": open_alerts,
        "acknowledged_alerts": ack_alerts,
        "resolved_alerts": resolved_alerts,
        "security_score": security_score,
        "gcp_summary": {
            "resources": gcp_resources,
            "events": gcp_events,
            "alerts": gcp_alerts,
            "critical_alerts": gcp_critical
        },
        "huawei_summary": {
            "resources": hw_resources,
            "events": hw_events,
            "alerts": hw_alerts,
            "critical_alerts": hw_critical
        },
        "alerts_by_severity": alerts_by_sev,
        "alerts_by_provider": alerts_by_prov,
        "alerts_by_category": alerts_by_cat,
        "alerts_by_status": alerts_by_stat,
        "events_by_provider": events_by_prov
    }

@router.get("/resources", response_model=List[schemas.ResourceResponse])
def get_resources(
    cloud_provider: Optional[str] = None,
    resource_type: Optional[str] = None,
    status: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Resource)
    if cloud_provider:
        query = query.filter(Resource.cloud_provider == cloud_provider)
    if resource_type:
        query = query.filter(Resource.resource_type == resource_type)
    if status:
        query = query.filter(Resource.status == status)
    if risk_level:
        query = query.filter(Resource.risk_level == risk_level)
    if search:
        query = query.filter(Resource.name.contains(search) | Resource.id.contains(search))
        
    return query.order_by(Resource.last_monitored.desc()).all()

@router.get("/resources/{id}", response_model=schemas.ResourceResponse)
def get_resource_detail(id: str, db: Session = Depends(get_db)):
    res = db.query(Resource).filter(Resource.id == id).first()
    if not res:
        raise HTTPException(status_code=404, detail="Resource not found")
    return res

@router.get("/events", response_model=List[schemas.EventResponse])
def get_events(
    cloud_provider: Optional[str] = None,
    event_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Event)
    if cloud_provider:
        query = query.filter(Event.cloud_provider == cloud_provider)
    if event_type:
        query = query.filter(Event.event_type == event_type)
    return query.order_by(Event.timestamp.desc()).limit(100).all()

@router.post("/events", response_model=schemas.EventResponse)
def create_custom_event(event_req: schemas.EventCreate, db: Session = Depends(get_db)):
    # Standard normalization interface for custom events
    normalized = event_req.model_dump()
    # Format raw payload if not existing
    if not normalized.get("raw_payload"):
        normalized["raw_payload"] = json.dumps(normalized, indent=2)
        
    event = process_normalized_event(db, normalized)
    return event

@router.get("/alerts", response_model=List[schemas.AlertResponse])
def get_alerts(
    severity: Optional[str] = None,
    cloud_provider: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Alert)
    if severity:
        query = query.filter(Alert.severity == severity)
    if cloud_provider:
        query = query.filter(Alert.cloud_provider == cloud_provider)
    if category:
        query = query.filter(Alert.category == category)
    if status:
        query = query.filter(Alert.status == status)
    if search:
        query = query.filter(
            Alert.resource_name.contains(search) | 
            Alert.description.contains(search) | 
            Alert.actor.contains(search)
        )
        
    return query.order_by(Alert.timestamp.desc()).all()

@router.get("/alerts/{id}", response_model=schemas.AlertDetailResponse)
def get_alert_detail(id: str, db: Session = Depends(get_db)):
    alert = db.query(Alert).filter(Alert.id == id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
        
    # Get recent events related to this resource
    related_events = db.query(Event).filter(
        Event.resource_id == alert.resource_id
    ).order_by(Event.timestamp.desc()).limit(10).all()
    
    # Get audit logs related to this resource
    related_audit = db.query(AuditLog).filter(
        AuditLog.resource == alert.resource_name
    ).order_by(AuditLog.timestamp.desc()).limit(10).all()
    
    # Serializer helpers for audit logs to pass typing
    audit_list = []
    for a in related_audit:
        audit_list.append({
            "id": a.id,
            "timestamp": a.timestamp,
            "actor": a.actor,
            "source_ip": a.source_ip,
            "action": a.action,
            "resource": a.resource,
            "cloud_provider": a.cloud_provider,
            "result": a.result
        })
        
    return {
        "alert": alert,
        "related_events": related_events,
        "related_audit_logs": audit_list
    }

@router.patch("/alerts/{id}/acknowledge", response_model=schemas.AlertResponse)
def api_acknowledge_alert(id: str, db: Session = Depends(get_db)):
    try:
        # Simulate operator acknowledging from UI
        alert = acknowledge_alert(db, id, "wisys-operator@wisys.sa", "192.0.2.25")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/alerts/{id}/resolve", response_model=schemas.AlertResponse)
def api_resolve_alert(id: str, db: Session = Depends(get_db)):
    try:
        # Simulate operator resolving from UI
        alert = resolve_alert(db, id, "wisys-operator@wisys.sa", "192.0.2.25")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/rules", response_model=List[schemas.RuleResponse])
def get_rules(db: Session = Depends(get_db)):
    return db.query(Rule).all()

@router.patch("/rules/{id}", response_model=schemas.RuleResponse)
def update_rule(id: str, rule_update: schemas.RuleUpdate, db: Session = Depends(get_db)):
    rule = db.query(Rule).filter(Rule.id == id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    update_data = rule_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rule, key, value)
        
    # Track policy changes in audit trail
    audit = AuditLog(
        actor="admin-sec@wisys.sa",
        source_ip="192.0.2.25",
        action=f"Updated Rule config {id} - {update_data}",
        resource=rule.name,
        cloud_provider=rule.cloud_provider,
        result="SUCCESS"
    )
    db.add(audit)
    db.commit()
    db.refresh(rule)
    
    # Trigger security score update as policy triggers may have changed
    recalculate_security_score(db)
    
    return rule

@router.get("/audit-logs", response_model=List[schemas.AuditLogResponse])
def get_audit_logs(
    actor: Optional[str] = None,
    cloud_provider: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if actor:
        query = query.filter(AuditLog.actor == actor)
    if cloud_provider:
        query = query.filter(AuditLog.cloud_provider == cloud_provider)
    if search:
        query = query.filter(AuditLog.action.contains(search) | AuditLog.resource.contains(search))
    return query.order_by(AuditLog.timestamp.desc()).all()

@router.get("/notifications", response_model=List[schemas.NotificationResponse])
def get_notifications(db: Session = Depends(get_db)):
    return db.query(Notification).order_by(Notification.timestamp.desc()).all()

@router.get("/security-score", response_model=schemas.SecurityScoreResponse)
def get_security_score(db: Session = Depends(get_db)):
    score = recalculate_security_score(db)
    checks = db.query(SecurityCheck).all()
    
    passed = [schemas.SecurityCheckResponse.model_validate(c) for c in checks if c.status == "PASSED"]
    warning = [schemas.SecurityCheckResponse.model_validate(c) for c in checks if c.status == "WARNING"]
    failed = [schemas.SecurityCheckResponse.model_validate(c) for c in checks if c.status == "FAILED"]
    
    return {
        "score": score,
        "passed_checks": passed,
        "warning_checks": warning,
        "failed_checks": failed
    }

@router.post("/simulator/random", response_model=schemas.EventResponse)
def trigger_random_sim_event(db: Session = Depends(get_db)):
    normalized = generate_random_event(db)
    # Fetch the newly created event from DB
    event = db.query(Event).filter(Event.raw_payload.contains(normalized["resource_id"])).order_by(Event.timestamp.desc()).first()
    return event

@router.post("/simulator/scenario", response_model=List[schemas.EventResponse])
def run_scenario(req: schemas.ScenarioRequest, db: Session = Depends(get_db)):
    triggered = trigger_scenario(db, req.scenario_name)
    if not triggered:
        raise HTTPException(status_code=400, detail="Scenario execution failed or invalid scenario name")
        
    res_list = []
    for t in triggered:
        ev = db.query(Event).filter(Event.resource_id == t["resource_id"], Event.event_type == t["event_type"]).order_by(Event.timestamp.desc()).first()
        if ev:
            res_list.append(ev)
            
    return res_list

@router.get("/smtp/config")
def get_smtp_cfg():
    cfg = get_smtp_config()
    masked_pw = ""
    if cfg["smtp_password"]:
        masked_pw = "********"
    return {
        "smtp_server": cfg["smtp_server"],
        "smtp_port": cfg["smtp_port"],
        "smtp_username": cfg["smtp_username"],
        "smtp_password_masked": masked_pw,
        "alert_recipient": cfg["alert_recipient"]
    }

@router.post("/smtp/config")
def post_smtp_cfg(payload: dict):
    existing = get_smtp_config()
    new_pw = payload.get("smtp_password", "")
    if new_pw == "********" or not new_pw:
        new_pw = existing["smtp_password"]
    
    cfg = {
        "smtp_server": payload.get("smtp_server", ""),
        "smtp_port": int(payload.get("smtp_port", 587)),
        "smtp_username": payload.get("smtp_username", ""),
        "smtp_password": new_pw,
        "alert_recipient": payload.get("alert_recipient", "")
    }
    save_smtp_config(cfg)
    return {"status": "SUCCESS", "message": "SMTP configurations saved successfully"}
