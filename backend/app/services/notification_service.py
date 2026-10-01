import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from sqlalchemy.orm import Session
from backend.app.models.models import Notification, Alert
import uuid

import json

CONFIG_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "smtp_config.json")

def get_smtp_config() -> dict:
    config = {
        "smtp_server": os.getenv("SMTP_SERVER", ""),
        "smtp_port": int(os.getenv("SMTP_PORT", "587")),
        "smtp_username": os.getenv("SMTP_USERNAME", ""),
        "smtp_password": os.getenv("SMTP_PASSWORD", ""),
        "alert_recipient": os.getenv("ALERT_RECIPIENT", "")
    }
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r") as f:
                data = json.load(f)
                if data.get("smtp_server"):
                    config["smtp_server"] = data["smtp_server"]
                if data.get("smtp_port"):
                    config["smtp_port"] = int(data["smtp_port"])
                if data.get("smtp_username"):
                    config["smtp_username"] = data["smtp_username"]
                if data.get("smtp_password"):
                    config["smtp_password"] = data["smtp_password"]
                if data.get("alert_recipient"):
                    config["alert_recipient"] = data["alert_recipient"]
        except Exception as e:
            print(f"Error loading SMTP json config: {e}")
    return config

def save_smtp_config(config: dict):
    try:
        with open(CONFIG_PATH, "w") as f:
            json.dump(config, f, indent=4)
        print(f"SUCCESS: Saved new SMTP configurations to {CONFIG_PATH}")
    except Exception as e:
        print(f"ERROR: Failed to save SMTP config to file: {e}")

def send_alert_notification(db: Session, alert: Alert):
    # Simulated recipient mailbox (logged in database for the UI queue)
    sim_recipient = "security-ops@wisys.sa"
    if alert.cloud_provider == "GCP":
        sim_recipient = "gcp-alerts@wisys.sa"
    elif alert.cloud_provider == "Huawei Cloud":
        sim_recipient = "huawei-alerts@wisys.sa"
    elif alert.cloud_provider == "Microsoft Entra ID":
        sim_recipient = "entra-admin@wisys.sa"
        
    subject = f"[{alert.severity}] Cloud Monitoring Alert - {alert.event_type} on {alert.resource_name}"
    
    message_body = (
        f"A critical operational alert has been triggered in the multi-cloud dashboard.\n\n"
        f"Alert Details:\n"
        f"- ID: {alert.id}\n"
        f"- Cloud Provider: {alert.cloud_provider}\n"
        f"- Event Type: {alert.event_type}\n"
        f"- Resource: {alert.resource_name} ({alert.resource_id})\n"
        f"- Severity: {alert.severity}\n"
        f"- Triggered By Actor: {alert.actor}\n"
        f"- Source IP: {alert.source_ip}\n"
        f"- Description: {alert.description}\n\n"
        f"Please log in to the dashboard to acknowledge and resolve this alert."
    )
    
    # 1. Log notification record in the local simulation queue (for the UI page)
    notification = Notification(
        id=str(uuid.uuid4()),
        alert_id=alert.id,
        recipient=sim_recipient,
        subject=subject,
        message=message_body,
        status="SENT"
    )
    db.add(notification)
    db.commit()
    
    # 2. Get active SMTP config dynamically
    cfg = get_smtp_config()
    server_addr = cfg["smtp_server"]
    port = cfg["smtp_port"]
    username = cfg["smtp_username"]
    password = cfg["smtp_password"]
    recipient = cfg["alert_recipient"]
    
    # Check if configurations are provided
    if server_addr and username and password and recipient:
        try:
            # Determine valid sender email address (Brevo relay IDs like b5f116001@smtp-brevo.com are login IDs, not valid sender addresses)
            from_email = username
            if not from_email or "@smtp-brevo.com" in from_email or "@sendinblue.com" in from_email:
                from_email = recipient

            # Construct the email mime structure
            msg = MIMEMultipart()
            msg["From"] = f"WiSys Cloud Alerts <{from_email}>"
            msg["To"] = recipient
            msg["Subject"] = subject
            
            msg.attach(MIMEText(message_body, "plain"))
            
            # Connect to SMTP server (with TLS authentication)
            server = smtplib.SMTP(server_addr, port)
            server.starttls()
            server.login(username, password)
            
            # Dispatch using valid sender address
            server.sendmail(from_email, recipient, msg.as_string())
            server.quit()
            
            # Update status and real recipient in local dashboard database
            notification.status = "DISPATCHED_REAL_EMAIL"
            notification.recipient = recipient
            db.commit()
            print(f"SUCCESS: Real alert email dispatched to {recipient}")
        except Exception as e:
            error_msg = str(e)
            print(f"ERROR: Failed to send real SMTP email: {error_msg}")
            notification.status = f"SMTP_ERROR: {error_msg[:40]}"
            db.commit()
            
    return notification
