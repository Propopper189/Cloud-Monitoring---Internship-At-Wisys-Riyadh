from sqlalchemy.orm import Session
from backend.app.models.models import SecurityCheck, Alert

CHECKS_META = {
    "check-audit-logs": {
        "name": "Audit Logging Configuration",
        "category": "Audit & Compliance",
        "description": "Checks if cloud trace services and audit logging are fully enabled across GCP and Huawei Cloud.",
        "max_deduction": 20,
        "explanation": "Points deducted due to disabled audit logging (e.g. CTS trace disabled or Cloud Audit log disabled), leaving the organization blind to administrator actions."
    },
    "check-monitoring": {
        "name": "Alarm Policy Status",
        "category": "Monitoring",
        "description": "Verifies that alarm policies are enabled and monitoring critical metrics.",
        "max_deduction": 10,
        "explanation": "Points deducted because alarm policies have been deleted or disabled, preventing operational alerts."
    },
    "check-vm-health": {
        "name": "Compute Node Availability",
        "category": "Availability",
        "description": "Checks if any virtual machine instances are stopped, deleted, or failing health-checks.",
        "max_deduction": 15,
        "explanation": "Points deducted due to Stopped, Deleted, or failing VM/ECS nodes which affects overall service availability."
    },
    "check-security-groups": {
        "name": "Security Group & Firewall Rules",
        "category": "Network Security",
        "description": "Ensures no unauthorized modifications to firewalls or security groups have occurred.",
        "max_deduction": 15,
        "explanation": "Points deducted because firewall rules or security groups were modified, creating potential network security gaps."
    },
    "check-vpc": {
        "name": "Virtual Private Cloud (VPC) Integrity",
        "category": "Network Topology",
        "description": "Ensures core network routers and VPCs are intact and active.",
        "max_deduction": 20,
        "explanation": "Points deducted due to the deletion of a VPC network, causing severe outages and networking segmentation failure."
    },
    "check-backup": {
        "name": "Storage Backup Health",
        "category": "Disaster Recovery",
        "description": "Checks if scheduled database and system backups have failed.",
        "max_deduction": 10,
        "explanation": "Points deducted because a backup job failed, violating the disaster recovery policy."
    },
    "check-iam": {
        "name": "IAM & Identity Access Management",
        "category": "Access Control",
        "description": "Ensures no administrative role or privilege modifications remain unreviewed.",
        "max_deduction": 10,
        "explanation": "Points deducted due to modifications in IAM roles or policies (such as Entra ID app credentials or GCP IAM changes) that pose escalation risks."
    }
}

def recalculate_security_score(db: Session) -> int:
    open_alerts = db.query(Alert).filter(Alert.status == "OPEN").all()
    ack_alerts = db.query(Alert).filter(Alert.status == "ACKNOWLEDGED").all()
    
    checks_state = {check_id: {"status": "PASSED", "deduction": 0, "active_alerts": []} for check_id in CHECKS_META}
    
    # Process both OPEN and ACKNOWLEDGED alerts. Acknowledged alerts only deduct 50% points.
    alerts_to_process = [(alert, 1.0) for alert in open_alerts] + [(alert, 0.5) for alert in ack_alerts]
    
    for alert, factor in alerts_to_process:
        etype = alert.event_type
        if etype == "AUDIT_LOG_DISABLED":
            state = checks_state["check-audit-logs"]
            state["status"] = "FAILED" if factor == 1.0 else "WARNING"
            state["deduction"] = int(CHECKS_META["check-audit-logs"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype in ["ALARM_POLICY_DISABLED", "ALARM_POLICY_DELETED"]:
            state = checks_state["check-monitoring"]
            state["status"] = "FAILED" if etype == "ALARM_POLICY_DELETED" else "WARNING"
            state["deduction"] = int(CHECKS_META["check-monitoring"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype in ["VM_STOPPED", "VM_DELETED", "VM_HEALTH_CHECK_FAILED"]:
            state = checks_state["check-vm-health"]
            state["status"] = "FAILED"
            added_ded = int(10 * factor)
            state["deduction"] = min(state["deduction"] + added_ded, CHECKS_META["check-vm-health"]["max_deduction"])
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype == "SECURITY_GROUP_MODIFIED":
            state = checks_state["check-security-groups"]
            state["status"] = "WARNING"
            state["deduction"] = int(CHECKS_META["check-security-groups"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype == "VPC_DELETED":
            state = checks_state["check-vpc"]
            state["status"] = "FAILED"
            state["deduction"] = int(CHECKS_META["check-vpc"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype == "BACKUP_FAILED":
            state = checks_state["check-backup"]
            state["status"] = "FAILED"
            state["deduction"] = int(CHECKS_META["check-backup"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
        elif etype in ["IAM_POLICY_CHANGED", "IAM_ROLE_CHANGED"]:
            state = checks_state["check-iam"]
            state["status"] = "WARNING"
            state["deduction"] = int(CHECKS_META["check-iam"]["max_deduction"] * factor)
            state["active_alerts"].append(f"{alert.description} ({alert.status})")
            
    total_deductions = sum(state["deduction"] for state in checks_state.values())
    final_score = max(100 - total_deductions, 0)
    
    for check_id, meta in CHECKS_META.items():
        state = checks_state[check_id]
        check_db = db.query(SecurityCheck).filter(SecurityCheck.id == check_id).first()
        
        if state["status"] != "PASSED":
            explanation_str = f"{meta['explanation']} Active trigger(s): " + " | ".join(state["active_alerts"])
        else:
            explanation_str = "No active security alerts affecting this policy. Infrastructure conforms to security baselines."
            
        if not check_db:
            check_db = SecurityCheck(
                id=check_id,
                name=meta["name"],
                category=meta["category"],
                status=state["status"],
                description=meta["description"],
                points_deducted=state["deduction"],
                explanation=explanation_str
            )
            db.add(check_db)
        else:
            check_db.status = state["status"]
            check_db.points_deducted = state["deduction"]
            check_db.explanation = explanation_str
            
    db.commit()
    return final_score
