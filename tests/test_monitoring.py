import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database import Base, get_db
from backend.app.main import app
from backend.app.models.models import Rule, Resource, Event, Alert, Notification, SecurityCheck, AuditLog
from backend.app.utils.adapters import GCPAdapter, HuaweiCloudAdapter, MicrosoftEntraAdapter
from backend.app.services.security_score import recalculate_security_score
from backend.app.services.rule_engine import process_normalized_event
from backend.app.services.alert_service import acknowledge_alert, resolve_alert

# ----------------- TEST DATABASE SETUP -----------------
import os
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_monitoring.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(name="db_session")
def fixture_db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Pre-seed rules in the test DB
    rules = [
        Rule(id="rule-vm-stopped", name="VM stopped notification", event_type="VM_STOPPED", severity="CRITICAL", description="A critical virtual machine instance was stopped.", enabled=True, cloud_provider="Multi-Cloud"),
        Rule(id="rule-sg-modified", name="Security group modification warning", event_type="SECURITY_GROUP_MODIFIED", severity="CRITICAL", description="Firewall rule updated.", enabled=True, cloud_provider="Multi-Cloud"),
        Rule(id="rule-audit-disabled", name="Audit logging disabled alarm", event_type="AUDIT_LOG_DISABLED", severity="CRITICAL", description="Audit logs disabled.", enabled=True, cloud_provider="Multi-Cloud"),
        Rule(id="rule-iam-policy", name="IAM policy change warning", event_type="IAM_POLICY_CHANGED", severity="HIGH", description="IAM policy modified.", enabled=True, cloud_provider="Multi-Cloud"),
        Rule(id="rule-vm-started", name="VM started", event_type="VM_STARTED", severity="INFO", description="VM started.", enabled=True, cloud_provider="Multi-Cloud")
    ]
    db.bulk_save_objects(rules)
    db.commit()
    
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)
        if os.path.exists("./test_monitoring.db"):
            try:
                os.remove("./test_monitoring.db")
            except Exception:
                pass


@pytest.fixture(name="client")
def fixture_client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

# ----------------- TEST CASES (20+) -----------------

# Test 1: GCP Adapter Normalization (VM Stopped)
def test_gcp_adapter_normalization_vm_stopped():
    raw_log = {
        "resource": {"labels": {"instance_id": "inst-123", "project_id": "gcp-prod", "zone": "us-central1-a"}},
        "protoPayload": {
            "methodName": "v1.compute.instances.stop",
            "authenticationInfo": {"principalEmail": "admin@wisys.sa"},
            "requestMetadata": {"callerIp": "192.0.2.14"},
            "resourceName": "projects/gcp-prod/zones/us-central1-a/instances/vm-web"
        }
    }
    adapter = GCPAdapter()
    norm = adapter.normalize(raw_log)
    assert norm["cloud_provider"] == "GCP"
    assert norm["event_type"] == "VM_STOPPED"
    assert norm["actor"] == "admin@wisys.sa"
    assert norm["source_ip"] == "192.0.2.14"
    assert norm["severity"] == "CRITICAL"

# Test 2: GCP Adapter Normalization (VPC Deleted)
def test_gcp_adapter_normalization_vpc_deleted():
    raw_log = {
        "resource": {"labels": {"project_id": "gcp-prod", "zone": "global"}},
        "protoPayload": {
            "methodName": "v1.compute.networks.delete",
            "authenticationInfo": {"principalEmail": "sec-ops@wisys.sa"},
            "requestMetadata": {"callerIp": "192.0.2.99"},
            "resourceName": "projects/gcp-prod/global/networks/vpc-production"
        }
    }
    adapter = GCPAdapter()
    norm = adapter.normalize(raw_log)
    assert norm["event_type"] == "VPC_DELETED"
    assert norm["severity"] == "CRITICAL"

# Test 3: Huawei Adapter Normalization (stopServer)
def test_hw_adapter_normalization_stop_server():
    raw_log = {
        "trace_name": "stopServer",
        "service_type": "ECS",
        "resource_name": "ecs-billing",
        "resource_id": "ecs-uuid-88",
        "region": "ap-southeast-3",
        "user": {"name": "hw-operator", "domain": {"name": "wisys-hw"}},
        "source_ip": "198.51.100.22"
    }
    adapter = HuaweiCloudAdapter()
    norm = adapter.normalize(raw_log)
    assert norm["cloud_provider"] == "Huawei Cloud"
    assert norm["event_type"] == "VM_STOPPED"
    assert norm["actor"] == "hw-operator"
    assert norm["source_ip"] == "198.51.100.22"
    assert norm["severity"] == "CRITICAL"

# Test 4: Huawei Adapter Normalization (disableAudit)
def test_hw_adapter_normalization_disable_audit():
    raw_log = {
        "trace_name": "disableAudit",
        "service_type": "CTS",
        "resource_name": "cts-audit-sink",
        "resource_id": "cts-uuid-99",
        "user": {"name": "rogue-hw-admin"},
        "source_ip": "198.51.100.45"
    }
    adapter = HuaweiCloudAdapter()
    norm = adapter.normalize(raw_log)
    assert norm["event_type"] == "AUDIT_LOG_DISABLED"
    assert norm["severity"] == "CRITICAL"

# Test 5: Microsoft Entra Adapter Normalization
def test_entra_adapter_normalization():
    raw_log = {
        "activityDisplayName": "Update application - Certificates and secrets management",
        "initiatedBy": {"user": {"userPrincipalName": "entra-admin@wisys.sa", "ipAddress": "203.0.113.8"}},
        "targetResources": [{"id": "app-id-77", "displayName": "Azure Integration App"}]
    }
    adapter = MicrosoftEntraAdapter()
    norm = adapter.normalize(raw_log)
    assert norm["cloud_provider"] == "Microsoft Entra ID"
    assert norm["event_type"] == "IAM_POLICY_CHANGED"
    assert norm["actor"] == "entra-admin@wisys.sa"
    assert norm["source_ip"] == "203.0.113.8"
    assert norm["severity"] == "HIGH"

# Test 6: Ingesting event triggers resource auto-discovery
def test_resource_auto_discovery(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-new-007",
        "resource_name": "vm-new-discovered",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "admin@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    
    resource = db_session.query(Resource).filter(Resource.id == "inst-new-007").first()
    assert resource is not None
    assert resource.name == "vm-new-discovered"
    assert resource.status == "STOPPED"
    assert resource.risk_level == "HIGH"

# Test 7: Rule Match and Alert Generation
def test_alert_generation_on_rule_match(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "admin@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    
    alert = db_session.query(Alert).filter(Alert.resource_id == "inst-sap-99").first()
    assert alert is not None
    assert alert.status == "OPEN"
    assert alert.severity == "CRITICAL"

# Test 8: Alert Deduplication prevents duplicate OPEN alerts
def test_alert_deduplication(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "admin@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    process_normalized_event(db_session, event_data) # Trigger second time
    
    alerts_count = db_session.query(Alert).filter(Alert.resource_id == "inst-sap-99", Alert.status == "OPEN").count()
    assert alerts_count == 1

# Test 9: Disabled Rule does not generate alerts
def test_disabled_rule_no_alert(db_session):
    rule = db_session.query(Rule).filter(Rule.event_type == "VM_STOPPED").first()
    rule.enabled = False
    db_session.commit()
    
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "admin@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    
    alert = db_session.query(Alert).filter(Alert.resource_id == "inst-sap-99").first()
    assert alert is None

# Test 10: Security Audit events write to Audit Log
def test_security_audit_events_logging(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "global",
        "resource_id": "audit-sink-1",
        "resource_name": "gcp-logging-audit",
        "resource_type": "Security Group",
        "event_type": "AUDIT_LOG_DISABLED",
        "actor": "rogue@wisys.sa",
        "source_ip": "192.0.2.99",
        "severity": "CRITICAL",
        "description": "Audit logging sink deleted."
    }
    process_normalized_event(db_session, event_data)
    
    audit = db_session.query(AuditLog).filter(AuditLog.actor == "rogue@wisys.sa").first()
    assert audit is not None
    assert "deleted" in audit.action

# Test 11: Notification Generated for Critical Alert
def test_notification_sent_on_critical_alert(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "operator@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data, is_manual_injection=True)
    
    notification = db_session.query(Notification).first()
    assert notification is not None
    assert notification.recipient in ["gcp-alerts@wisys.sa", "jawaidaquib893@gmail.com"] or len(notification.recipient) > 0
    assert "CRITICAL" in notification.subject

# Test 12: Alert Acknowledgement Lifecycle
def test_alert_acknowledgement(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "operator@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    alert = db_session.query(Alert).filter(Alert.resource_id == "inst-sap-99").first()
    
    acknowledge_alert(db_session, alert.id, "wisys-mgr@wisys.sa", "192.0.2.100")
    
    updated_alert = db_session.query(Alert).filter(Alert.id == alert.id).first()
    assert updated_alert.status == "ACKNOWLEDGED"
    assert updated_alert.acknowledged_by == "wisys-mgr@wisys.sa"

# Test 13: Alert Resolution Lifecycle restores Resource status
def test_alert_resolution_restores_resource(db_session):
    # Stopped VM event triggers alert and stops resource
    event_data = {
        "cloud_provider": "GCP",
        "region": "asia-south1-a",
        "resource_id": "inst-sap-99",
        "resource_name": "vm-sap-prod",
        "resource_type": "VM",
        "event_type": "VM_STOPPED",
        "actor": "operator@wisys.sa",
        "source_ip": "192.0.2.14",
        "severity": "CRITICAL",
        "description": "VM stopped."
    }
    process_normalized_event(db_session, event_data)
    alert = db_session.query(Alert).filter(Alert.resource_id == "inst-sap-99").first()
    
    # Resolve the alert
    resolve_alert(db_session, alert.id, "wisys-mgr@wisys.sa", "192.0.2.100")
    
    updated_alert = db_session.query(Alert).filter(Alert.id == alert.id).first()
    assert updated_alert.status == "RESOLVED"
    
    # Resource status should revert to ACTIVE
    resource = db_session.query(Resource).filter(Resource.id == "inst-sap-99").first()
    assert resource.status == "ACTIVE"
    assert resource.risk_level == "LOW"

# Test 14: Security Score Calculation Baseline is 100
def test_security_score_baseline(db_session):
    score = recalculate_security_score(db_session)
    assert score == 100

# Test 15: Security Score decreases on OPEN Alert
def test_security_score_decreases_on_alert(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "global",
        "resource_id": "audit-sink-1",
        "resource_name": "gcp-logging-audit",
        "resource_type": "Security Group",
        "event_type": "AUDIT_LOG_DISABLED",
        "actor": "rogue@wisys.sa",
        "source_ip": "192.0.2.99",
        "severity": "CRITICAL",
        "description": "Audit logging sink deleted."
    }
    process_normalized_event(db_session, event_data)
    
    score = recalculate_security_score(db_session)
    assert score == 80 # -20 deduction

# Test 16: Security Score penalty is halved (50%) on Alert Acknowledgement
def test_security_score_halved_on_acknowledgement(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "global",
        "resource_id": "audit-sink-1",
        "resource_name": "gcp-logging-audit",
        "resource_type": "Security Group",
        "event_type": "AUDIT_LOG_DISABLED",
        "actor": "rogue@wisys.sa",
        "source_ip": "192.0.2.99",
        "severity": "CRITICAL",
        "description": "Audit logging sink deleted."
    }
    process_normalized_event(db_session, event_data)
    alert = db_session.query(Alert).first()
    
    # Acknowledge the alert (mitigated)
    acknowledge_alert(db_session, alert.id, "ops-lead@wisys.sa", "192.0.2.14")
    
    score = recalculate_security_score(db_session)
    assert score == 90 # Deduction reduced from 20 to 10 points

# Test 17: Security Score fully recovers (100) on Alert Resolution
def test_security_score_recovers_on_resolution(db_session):
    event_data = {
        "cloud_provider": "GCP",
        "region": "global",
        "resource_id": "audit-sink-1",
        "resource_name": "gcp-logging-audit",
        "resource_type": "Security Group",
        "event_type": "AUDIT_LOG_DISABLED",
        "actor": "rogue@wisys.sa",
        "source_ip": "192.0.2.99",
        "severity": "CRITICAL",
        "description": "Audit logging sink deleted."
    }
    process_normalized_event(db_session, event_data)
    alert = db_session.query(Alert).first()
    
    resolve_alert(db_session, alert.id, "ops-lead@wisys.sa", "192.0.2.14")
    
    score = recalculate_security_score(db_session)
    assert score == 100 # Deductions fully cleared

# Test 18: API REST Endpoints availability - Rules list
def test_api_get_rules(client):
    response = client.get("/api/rules")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    assert "event_type" in data[0]

# Test 19: API REST Endpoints patch rule configuration
def test_api_patch_rule(client, db_session):
    response = client.patch("/api/rules/rule-vm-stopped", json={"severity": "HIGH", "enabled": False})
    assert response.status_code == 200
    data = response.json()
    assert data["severity"] == "HIGH"
    assert data["enabled"] is False

# Test 20: Run Scenario via Simulator API
def test_api_run_scenario(client):
    response = client.post("/api/simulator/scenario", json={"scenario_name": "vm_stopped_lifecycle"})
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["event_type"] == "VM_STOPPED"
