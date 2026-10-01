from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional, List, Dict, Any

class AppBaseModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)

# User schemas
class UserBase(AppBaseModel):
    username: str
    email: str
    role: str = "operator"

class UserCreate(UserBase):
    pass

class UserResponse(UserBase):
    id: int
    created_at: datetime

# Resource schemas
class ResourceBase(AppBaseModel):
    id: str
    name: str
    cloud_provider: str
    region: str
    resource_type: str
    status: str
    risk_level: str = "LOW"
    details_json: Optional[str] = None

class ResourceResponse(ResourceBase):
    last_monitored: datetime
    created_at: datetime

# Event schemas
class EventBase(AppBaseModel):
    cloud_provider: str
    account_id: Optional[str] = None
    project_id: Optional[str] = None
    region: str
    resource_id: str
    resource_name: str
    resource_type: str
    event_type: str
    actor: str
    source_ip: str
    severity: str
    description: str
    raw_payload: Optional[str] = None

class EventCreate(EventBase):
    pass

class EventResponse(EventBase):
    id: str
    timestamp: datetime

# Alert schemas
class AlertBase(AppBaseModel):
    id: str
    timestamp: datetime
    cloud_provider: str
    category: str
    event_type: str
    resource_id: str
    resource_name: str
    severity: str
    actor: str
    source_ip: str
    description: str
    status: str
    rule_id: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    resolved_by: Optional[str] = None

class AlertResponse(AlertBase):
    pass

class AlertDetailResponse(AppBaseModel):
    alert: AlertResponse
    related_events: List[EventResponse]
    related_audit_logs: List[Any]

# Rule schemas
class RuleBase(AppBaseModel):
    id: str
    name: str
    event_type: str
    severity: str
    description: str
    enabled: bool
    cloud_provider: str

class RuleResponse(RuleBase):
    pass

class RuleUpdate(AppBaseModel):
    severity: Optional[str] = None
    description: Optional[str] = None
    enabled: Optional[bool] = None

# AuditLog schemas
class AuditLogBase(AppBaseModel):
    actor: str
    source_ip: str
    action: str
    resource: str
    cloud_provider: str
    result: str = "SUCCESS"

class AuditLogResponse(AuditLogBase):
    id: int
    timestamp: datetime

# Notification schemas
class NotificationBase(AppBaseModel):
    alert_id: str
    recipient: str
    subject: str
    message: str

class NotificationResponse(NotificationBase):
    id: str
    timestamp: datetime
    status: str

# SecurityCheck schemas
class SecurityCheckResponse(AppBaseModel):
    id: str
    name: str
    category: str
    status: str
    description: str
    points_deducted: int
    explanation: Optional[str] = None

class SecurityScoreResponse(AppBaseModel):
    score: int
    passed_checks: List[SecurityCheckResponse]
    warning_checks: List[SecurityCheckResponse]
    failed_checks: List[SecurityCheckResponse]

# Regional Deployment & Instance Map Schemas
class RegionalHealthItem(AppBaseModel):
    region: str
    display_name: str
    cloud_provider: str
    latitude: float
    longitude: float
    total_resources: int
    healthy_count: int
    unhealthy_count: int
    active_alerts_count: int
    status: str
    resources: List[Dict[str, Any]]

class InstanceMapNode(AppBaseModel):
    id: str
    name: str
    cloud_provider: str
    resource_type: str
    region: str
    status: str
    health: str  # "HEALTHY" or "UNHEALTHY"
    latitude: float
    longitude: float
    active_alert: Optional[str] = None

# Dashboard schemas
class CloudStats(AppBaseModel):
    resources: int
    events: int
    alerts: int
    critical_alerts: int

class DashboardStats(AppBaseModel):
    total_resources: int
    total_events: int
    total_alerts: int
    critical_alerts: int
    high_alerts: int
    warning_alerts: int
    open_alerts: int
    acknowledged_alerts: int
    resolved_alerts: int
    security_score: int
    gcp_summary: CloudStats
    huawei_summary: CloudStats
    alerts_by_severity: Dict[str, int]
    alerts_by_provider: Dict[str, int]
    alerts_by_category: Dict[str, int]
    alerts_by_status: Dict[str, int]
    events_by_provider: Dict[str, int]
    regional_health: Optional[List[RegionalHealthItem]] = None
    instance_nodes: Optional[List[InstanceMapNode]] = None

# Simulator requests
class ScenarioRequest(AppBaseModel):
    scenario_name: str

class RandomSimulatorRequest(AppBaseModel):
    action: str
    interval_seconds: Optional[int] = 5
