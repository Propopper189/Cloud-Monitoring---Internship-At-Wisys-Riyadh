import threading
import time
from fastapi import FastAPI, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import json

from backend.app.database import engine, Base, SessionLocal
from backend.app.api.endpoints import router as api_router
from backend.app.models.models import Rule, Resource, SecurityCheck, User
from backend.app.services.security_score import recalculate_security_score, CHECKS_META
from backend.app.simulators.sim import generate_random_event

# 1. Initialize DB tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Multi-Cloud Monitoring & Alerting Simulation Engine",
    description="Academic prototype simulating real-world security operations encountered at WiSys Riyadh",
    version="1.0.0"
)

# 2. CORS Configuration for local React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Global Simulator Controller
simulator_state = {
    "status": "STOPPED", # STOPPED, RUNNING, PAUSED
    "interval_seconds": 5,
    "active": False
}

def simulator_loop():
    global simulator_state
    while simulator_state["active"]:
        db = SessionLocal()
        try:
            generate_random_event(db)
        except Exception as e:
            print(f"Error in background simulator loop: {e}")
        finally:
            db.close()
        time.sleep(simulator_state["interval_seconds"])

@app.get("/api/simulator/config")
def get_simulator_config():
    return simulator_state

@app.post("/api/simulator/control")
def control_simulator(payload: dict):
    global simulator_state
    action = payload.get("action")
    interval = payload.get("interval_seconds", 5)
    
    if action == "start":
        simulator_state["interval_seconds"] = interval
        if not simulator_state["active"]:
            simulator_state["active"] = True
            simulator_state["status"] = "RUNNING"
            thread = threading.Thread(target=simulator_loop, daemon=True)
            thread.start()
    elif action == "pause":
        simulator_state["active"] = False
        simulator_state["status"] = "PAUSED"
    elif action == "stop":
        simulator_state["active"] = False
        simulator_state["status"] = "STOPPED"
        
    return simulator_state

# 4. Include endpoints router
app.include_router(api_router, prefix="/api")

# 5. Database seeding function
def seed_database():
    db = SessionLocal()
    try:
        # A. Seed Rules if empty
        if db.query(Rule).count() == 0:
            rules_seed = [
                # Compute Rules
                Rule(id="rule-vm-stopped", name="VM stopped notification", event_type="VM_STOPPED", severity="CRITICAL", description="A critical virtual machine instance was stopped.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-vm-started", name="VM started notification", event_type="VM_STARTED", severity="INFO", description="A virtual machine instance was successfully started.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-vm-restarted", name="VM restarted notification", event_type="VM_RESTARTED", severity="CRITICAL", description="A virtual machine instance was restarted unexpectedly.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-vm-deleted", name="VM deleted notification", event_type="VM_DELETED", severity="CRITICAL", description="A critical virtual machine instance was deleted.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-vm-hc-failed", name="VM health check failed notification", event_type="VM_HEALTH_CHECK_FAILED", severity="CRITICAL", description="A VM health check failure was detected.", cloud_provider="Multi-Cloud"),
                # Storage Rules
                Rule(id="rule-disk-high", name="Disk utilization high threshold", event_type="DISK_UTILIZATION_HIGH", severity="WARNING", description="Storage utilization has exceeded the 90% threshold.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-backup-failed", name="Backup failed notification", event_type="BACKUP_FAILED", severity="CRITICAL", description="Scheduled snapshot or backup policy has failed.", cloud_provider="Multi-Cloud"),
                # Network Rules
                Rule(id="rule-sg-modified", name="Security group modification warning", event_type="SECURITY_GROUP_MODIFIED", severity="CRITICAL", description="Unauthorized changes to a security group or firewall rule detected.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-vpc-deleted", name="VPC deletion alert", event_type="VPC_DELETED", severity="CRITICAL", description="A Virtual Private Cloud (VPC) network was deleted.", cloud_provider="Multi-Cloud"),
                # Security Rules
                Rule(id="rule-audit-disabled", name="Audit logging disabled alarm", event_type="AUDIT_LOG_DISABLED", severity="CRITICAL", description="Security audit logging or trace service has been disabled.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-iam-policy", name="IAM policy change warning", event_type="IAM_POLICY_CHANGED", severity="HIGH", description="An IAM policy or identity permission modification occurred.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-iam-role", name="IAM role modification alert", event_type="IAM_ROLE_CHANGED", severity="HIGH", description="An administrative IAM role definition was updated.", cloud_provider="Multi-Cloud"),
                # Monitoring Rules
                Rule(id="rule-alarm-deleted", name="Alarm policy deleted alarm", event_type="ALARM_POLICY_DELETED", severity="CRITICAL", description="A critical monitoring alarm policy was deleted.", cloud_provider="Multi-Cloud"),
                Rule(id="rule-alarm-disabled", name="Alarm policy disabled warning", event_type="ALARM_POLICY_DISABLED", severity="WARNING", description="A critical monitoring alarm policy was disabled.", cloud_provider="Multi-Cloud")
            ]
            db.bulk_save_objects(rules_seed)
            db.commit()
            print("Seeded rules database.")

        # B. Seed Resources if empty
        if db.query(Resource).count() == 0:
            resources_seed = [
                # GCP Resource set
                Resource(id="inst-sap-99", name="vm-sap-prod", cloud_provider="GCP", region="asia-south1-a", resource_type="VM", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"ip": "10.0.1.4", "owner": "WiSys SAP Operations", "type": "n2-standard-4", "os": "RHEL 8.4"})),
                Resource(id="inst-web-101", name="vm-web-dev", cloud_provider="GCP", region="asia-east1-b", resource_type="VM", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"ip": "10.0.2.15", "owner": "WiSys R&D", "type": "e2-medium", "os": "Ubuntu 22.04 LTS"})),
                Resource(id="sg-89472", name="sg-gcp-web-prod", cloud_provider="GCP", region="asia-south1-a", resource_type="Security Group", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"inbound": "TCP 443, TCP 80", "outbound": "All TCP"})),
                Resource(id="vpc-87291", name="vpc-gcp-production", cloud_provider="GCP", region="global", resource_type="VPC", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"cidr": "10.0.0.0/16", "subnets": "3 active subnets"})),
                
                # Huawei Cloud Resource set
                Resource(id="ecs-billing-01", name="ecs-billing-app", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="ECS", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"ip": "192.168.1.10", "owner": "Finance Team", "flavor": "c6.large.2", "os": "EulerOS 2.9"})),
                Resource(id="ecs-router-02", name="ecs-sap-router", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="ECS", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"ip": "192.168.1.25", "owner": "NetOps Team", "flavor": "s6.medium.2", "os": "CentOS 7.9"})),
                Resource(id="sg-92718", name="sg-hw-database", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="Security Group", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"inbound": "TCP 3306 (restricted)", "outbound": "All"})),
                Resource(id="vpc-48192", name="vpc-hw-prod", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="VPC", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"cidr": "192.168.0.0/16", "subnets": "2 active subnets"})),
                Resource(id="backup-db-prod", name="hw-backup-db", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="Backup", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"schedule": "Daily 02:00 AM", "retention": "30 days"})),
                Resource(id="alarm-cpu-77", name="alarm-policy-vm-cpu", cloud_provider="Huawei Cloud", region="ap-southeast-3", resource_type="Alarm Policy", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"metric": "SYS.ECS.cpu_util", "condition": ">=90%", "period": "5 min"})),
                
                # Entra ID
                Resource(id="app-entra-783921", name="WiSys Azure Sync Integration App", cloud_provider="Microsoft Entra ID", region="global", resource_type="Application", status="ACTIVE", risk_level="LOW", details_json=json.dumps({"client_id": "127b82ab-89df-4c31-927c-f8ab91c3d9a1", "permissions": ["User.Read.All", "Directory.Read.All"]}))
            ]
            db.bulk_save_objects(resources_seed)
            db.commit()
            print("Seeded resources inventory.")

        # C. Seed Security Checks
        recalculate_security_score(db)
        print("Seeded security score checks.")
        
        # D. Seed Users
        if db.query(User).count() == 0:
            user = User(username="student-operator", email="student@lpu.edu.in", role="operator")
            db.add(user)
            db.commit()
            print("Seeded academic user.")
            
    except Exception as e:
        print(f"Error during seeding: {e}")
    finally:
        db.close()

# Run seeding on startup
seed_database()
