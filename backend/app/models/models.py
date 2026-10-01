from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from datetime import datetime
import uuid
from backend.app.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="operator")
    created_at = Column(DateTime, default=datetime.utcnow)

class Resource(Base):
    __tablename__ = "resources"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    cloud_provider = Column(String, nullable=False)
    region = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    status = Column(String, nullable=False)
    risk_level = Column(String, default="LOW")
    details_json = Column(Text, nullable=True)
    last_monitored = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

class Event(Base):
    __tablename__ = "events"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cloud_provider = Column(String, nullable=False)
    account_id = Column(String, nullable=True)
    project_id = Column(String, nullable=True)
    region = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    resource_name = Column(String, nullable=False)
    resource_type = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    source_ip = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    description = Column(String, nullable=False)
    raw_payload = Column(Text, nullable=True)

class Alert(Base):
    __tablename__ = "alerts"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    cloud_provider = Column(String, nullable=False)
    category = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    resource_id = Column(String, nullable=False)
    resource_name = Column(String, nullable=False)
    severity = Column(String, nullable=False)
    actor = Column(String, nullable=False)
    source_ip = Column(String, nullable=False)
    description = Column(String, nullable=False)
    status = Column(String, default="OPEN")
    rule_id = Column(String, nullable=True)
    acknowledged_at = Column(DateTime, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    acknowledged_by = Column(String, nullable=True)
    resolved_by = Column(String, nullable=True)

class Rule(Base):
    __tablename__ = "rules"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    event_type = Column(String, nullable=False, unique=True)
    severity = Column(String, nullable=False)
    description = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)
    cloud_provider = Column(String, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    actor = Column(String, nullable=False)
    source_ip = Column(String, nullable=False)
    action = Column(String, nullable=False)
    resource = Column(String, nullable=False)
    cloud_provider = Column(String, nullable=False)
    result = Column(String, default="SUCCESS")

class Notification(Base):
    __tablename__ = "notifications"
    
    id = Column(String, primary_key=True, default=generate_uuid, index=True)
    alert_id = Column(String, nullable=False)
    recipient = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    message = Column(String, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="SENT")

class SecurityCheck(Base):
    __tablename__ = "security_checks"
    
    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, nullable=False)
    status = Column(String, default="PASSED")
    description = Column(String, nullable=False)
    points_deducted = Column(Integer, default=0)
    explanation = Column(String, nullable=True)
