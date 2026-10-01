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

REGION_METADATA = {
    "asia-south1-a": {"display_name": "Asia South 1 (Mumbai)", "lat": 19.0760, "lng": 72.8777, "provider": "GCP"},
    "asia-east1-b": {"display_name": "Asia East 1 (Taiwan)", "lat": 25.0330, "lng": 121.5654, "provider": "GCP"},
    "ap-southeast-3": {"display_name": "Asia Southeast 3 (Jakarta)", "lat": -6.2088, "lng": 106.8456, "provider": "Huawei Cloud"},
    "global": {"display_name": "Global HQ (Riyadh / Entra ID)", "lat": 24.7136, "lng": 46.6753, "provider": "Microsoft Entra ID"},
    "us-central1": {"display_name": "US Central 1 (Iowa)", "lat": 41.8781, "lng": -87.6298, "provider": "GCP"},
    "us-east-1": {"display_name": "US East 1 (N. Virginia)", "lat": 38.9072, "lng": -77.0369, "provider": "AWS"},
    "eu-west-1": {"display_name": "EU West 1 (Ireland)", "lat": 53.3498, "lng": -6.2603, "provider": "Azure"},
    "cn-north-4": {"display_name": "China North 4 (Beijing)", "lat": 39.9042, "lng": 116.4074, "provider": "Huawei Cloud"}
}

def compute_instance_map_nodes(db: Session):
    resources = db.query(Resource).filter(Resource.status != "DELETED").all()
    active_alerts = db.query(Alert).filter(Alert.status != "RESOLVED").all()
    
    alert_lookup = {}
    for a in active_alerts:
        if a.severity in ["CRITICAL", "HIGH"]:
            alert_lookup[a.resource_id] = a.description
            
    region_offsets = {}
    nodes = []
    
    for r in resources:
        base_meta = REGION_METADATA.get(r.region, {"lat": 20.0, "lng": 0.0})
        reg = r.region
        
        # Calculate subtle coordinate jitter offset per resource in region so dots don't overlap
        idx = region_offsets.get(reg, 0)
        region_offsets[reg] = idx + 1
        
        lat_offset = (idx % 3 - 1) * 1.8
        lng_offset = (idx // 3) * 2.2
        
        has_alert = r.id in alert_lookup
        is_stopped = r.status in ["STOPPED", "DISABLED", "FAILED", "INACTIVE"]
        
        health_status = "UNHEALTHY" if (has_alert or is_stopped) else "HEALTHY"
        active_desc = alert_lookup.get(r.id) if has_alert else (f"Resource State: {r.status}" if is_stopped else None)
        
        nodes.append({
            "id": r.id,
            "name": r.name,
            "cloud_provider": r.cloud_provider,
            "resource_type": r.resource_type,
            "region": r.region,
            "status": r.status,
            "health": health_status,
            "latitude": base_meta["lat"] + lat_offset,
            "longitude": base_meta["lng"] + lng_offset,
            "active_alert": active_desc
        })
        
    return nodes

def compute_regional_health_data(db: Session):
    resources = db.query(Resource).filter(Resource.status != "DELETED").all()
    active_alerts = db.query(Alert).filter(Alert.status != "RESOLVED").all()
    
    alert_resource_ids = {a.resource_id: a for a in active_alerts if a.severity in ["CRITICAL", "HIGH"]}
    
    regional_buckets = {}
    for res in resources:
        reg = res.region
        if reg not in regional_buckets:
            regional_buckets[reg] = []
        regional_buckets[reg].append(res)
        
    results = []
    for reg, res_list in regional_buckets.items():
        meta = REGION_METADATA.get(reg, {
            "display_name": f"Region {reg}",
            "lat": 20.0,
            "lng": 0.0,
            "provider": res_list[0].cloud_provider if res_list else "Multi-Cloud"
        })
        
        healthy_count = 0
        unhealthy_count = 0
        active_alerts_count = 0
        resource_summaries = []
        
        for r in res_list:
            has_alert = r.id in alert_resource_ids
            is_stopped = r.status in ["STOPPED", "DISABLED", "FAILED", "INACTIVE"]
            
            if has_alert:
                active_alerts_count += 1
                
            if is_stopped or has_alert:
                unhealthy_count += 1
                res_health = "UNHEALTHY"
            else:
                healthy_count += 1
                res_health = "HEALTHY"
                
            resource_summaries.append({
                "id": r.id,
                "name": r.name,
                "resource_type": r.resource_type,
                "status": r.status,
                "health": res_health,
                "cloud_provider": r.cloud_provider
            })
            
        region_status = "UNHEALTHY" if unhealthy_count > 0 else "HEALTHY"
        
        results.append({
            "region": reg,
            "display_name": meta["display_name"],
            "cloud_provider": meta["provider"],
            "latitude": meta["lat"],
            "longitude": meta["lng"],
            "total_resources": len(res_list),
            "healthy_count": healthy_count,
            "unhealthy_count": unhealthy_count,
            "active_alerts_count": active_alerts_count,
            "status": region_status,
            "resources": resource_summaries
        })
        
    return results

@router.get("/resources/map-instances", response_model=List[schemas.InstanceMapNode])
def get_map_instances(db: Session = Depends(get_db)):
    return compute_instance_map_nodes(db)

@router.get("/resources/regional-health", response_model=List[schemas.RegionalHealthItem])
def get_regional_health(db: Session = Depends(get_db)):
    return compute_regional_health_data(db)

@router.get("/dashboard", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_resources = db.query(Resource).filter(Resource.status != "DELETED").count()
    total_events = db.query(Event).count()
    total_alerts = db.query(Alert).count()
    
    critical_alerts = db.query(Alert).filter(Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    high_alerts = db.query(Alert).filter(Alert.severity == "HIGH", Alert.status != "RESOLVED").count()
    warning_alerts = db.query(Alert).filter(Alert.severity == "WARNING", Alert.status != "RESOLVED").count()
    
    open_alerts = db.query(Alert).filter(Alert.status == "OPEN").count()
    ack_alerts = db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").count()
    resolved_alerts = db.query(Alert).filter(Alert.status == "RESOLVED").count()
    
    security_score = recalculate_security_score(db)
    
    gcp_resources = db.query(Resource).filter(Resource.cloud_provider == "GCP", Resource.status != "DELETED").count()
    gcp_events = db.query(Event).filter(Event.cloud_provider == "GCP").count()
    gcp_alerts = db.query(Alert).filter(Alert.cloud_provider == "GCP").count()
    gcp_critical = db.query(Alert).filter(Alert.cloud_provider == "GCP", Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    
    hw_resources = db.query(Resource).filter(Resource.cloud_provider == "Huawei Cloud", Resource.status != "DELETED").count()
    hw_events = db.query(Event).filter(Event.cloud_provider == "Huawei Cloud").count()
    hw_alerts = db.query(Alert).filter(Alert.cloud_provider == "Huawei Cloud").count()
    hw_critical = db.query(Alert).filter(Alert.cloud_provider == "Huawei Cloud", Alert.severity == "CRITICAL", Alert.status != "RESOLVED").count()
    
    severities = ["CRITICAL", "HIGH", "WARNING", "INFO"]
    alerts_by_sev = {sev: db.query(Alert).filter(Alert.severity == sev).count() for sev in severities}
    
    providers = ["GCP", "Huawei Cloud", "Microsoft Entra ID"]
    alerts_by_prov = {prov: db.query(Alert).filter(Alert.cloud_provider == prov).count() for prov in providers}
    events_by_prov = {prov: db.query(Event).filter(Event.cloud_provider == prov).count() for prov in providers}
    
    categories = ["COMPUTE", "STORAGE", "NETWORK", "SECURITY", "MONITORING"]
    alerts_by_cat = {cat: db.query(Alert).filter(Alert.category == cat).count() for cat in categories}
    
    statuses = ["OPEN", "ACKNOWLEDGED", "RESOLVED"]
    alerts_by_stat = {stat: db.query(Alert).filter(Alert.status == stat).count() for stat in statuses}
    
    regional_health = compute_regional_health_data(db)
    instance_nodes = compute_instance_map_nodes(db)
    
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
        "events_by_provider": events_by_prov,
        "regional_health": regional_health,
        "instance_nodes": instance_nodes
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
    normalized = event_req.model_dump()
    if not normalized.get("raw_payload"):
        normalized["raw_payload"] = json.dumps(normalized, indent=2)
        
    event = process_normalized_event(db, normalized, is_manual_injection=True)
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
        
    related_events = db.query(Event).filter(
        Event.resource_id == alert.resource_id
    ).order_by(Event.timestamp.desc()).limit(10).all()
    
    related_audit = db.query(AuditLog).filter(
        AuditLog.resource == alert.resource_name
    ).order_by(AuditLog.timestamp.desc()).limit(10).all()
    
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
        alert = acknowledge_alert(db, id, "wisys-operator@wisys.sa", "192.0.2.25")
        return alert
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/alerts/{id}/resolve", response_model=schemas.AlertResponse)
def api_resolve_alert(id: str, db: Session = Depends(get_db)):
    try:
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

@router.delete("/notifications")
def clear_notifications(db: Session = Depends(get_db)):
    count = db.query(Notification).delete()
    db.commit()
    return {"status": "SUCCESS", "message": f"Cleared {count} notifications from history"}

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
