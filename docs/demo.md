# Demo Guide & Scenario Walks

This guide explains how to walk through the dashboard features for a Viva examiner:

## 1. Launching Backend & Frontend
1. Start backend: `python backend/run.py`
2. Start frontend: `npm run dev` (inside frontend folder)
3. Navigate browser to `http://localhost:5173`.

## 2. Interactive Scenario Walks

### Walk 1: GCP VM Stopped Lifecycle
1. Go to the **Event Simulator** page.
2. Under "Run Scenario", select **"GCP VM Stopped"** and click **Run Scenario**.
3. Go to the **Dashboard**: Note total alerts count has increased, GCP critical alert has updated, and Security Score dropped from 100 to 90.
4. Go to the **Alerts** page: Note the new OPEN alert for `vm-sap-prod` of severity CRITICAL.
5. Click **Acknowledge**: Observe status transitions to `ACKNOWLEDGED`. Go to **Security Score** page: Score has improved to 95 (mitigation state).
6. Click **Resolve**: Status transitions to `RESOLVED`. Observe security score returns to 100. Check **Resources** page: VM status returns to ACTIVE.

### Walk 2: Security Group Modified
1. Go to **Event Simulator**, run **"Security Group Modified"** scenario.
2. Note a critical notification dispatched to `huawei-alerts@wisys.sa`.
3. Check the **Audit Logs** page: Observe the record logging that hacker actor `unauthorized-hacker@wisys.sa` modified firewall rules.

### Walk 3: Background Simulator
1. Go to **Event Simulator**, toggle "Start Simulator" at 5-second intervals.
2. Go to the **Dashboard**: Observe charts, resource status colors, and alert lists update automatically as random logs populate the background.
