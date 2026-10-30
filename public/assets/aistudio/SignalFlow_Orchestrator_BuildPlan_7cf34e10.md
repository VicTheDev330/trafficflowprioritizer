# SignalFlow Orchestrator – Build Plan

## 1. Problem Statement

Emergency vehicles (ambulances, fire trucks, police) often get delayed at intersections because:

- Traffic signal systems work independently from EMS/fire/police dispatch systems.
- There is **no shared, fine‑grained urgency standard** across agencies.
- Existing priority systems are usually **binary** (normal vs preemption) instead of multi‑level and context‑aware.
- There is **no neutral “broker”** to transparently decide which vehicle should receive signal priority when there are conflicts.

This leads to:

- Slower emergency response times, especially when multiple incidents occur at once.
- Lack of transparency and trust between agencies (“why did their vehicle get priority over mine?”).
- Difficulty experimenting with better policies because access to real dispatch and signal systems is restricted.

The project aims to create a **simulated, student‑friendly prototype** that demonstrates how a shared, explainable priority broker could work in practice, using mock data and a web interface.

---

## 2. Solution Overview

**SignalFlow Orchestrator** is a web application with:

- A **real-time style dashboard** that shows simulated traffic conditions, signals, and emergency vehicles.
- A **transparent urgency scoring algorithm** that converts mock dispatch data into multi-level priority scores.
- A **priority queue manager** that ranks emergency vehicles competing for signal priority.
- A **map-based intersection simulator** that shows how signal states change when emergency vehicles approach.
- A **conflict-resolution mechanism** that explains how ties and competing requests are resolved.
- **Analytics** that summarize response time improvements and congestion impact.

All data is simulated and clearly labeled as mock. The app is designed to run entirely in a browser + simple backend, so it can be demoed at a hackathon without any real-world integrations.

---

## 3. Target Users

Primary (simulated / conceptual) users:

1. **Ambulance dispatchers / EMS control**
   - Need visibility into which ambulances are prioritized and why.
   - Want assurance that life‑threatening calls get the fastest routes.

2. **Fire department and police control room operators**
   - Need fair and predictable rules when their vehicles share corridors.
   - Need to understand trade‑offs: who gets a “green wave” and who has to wait.

3. **City Traffic Operations Center (TOC) staff**
   - Want to test policies that improve average emergency response time without overwhelming the network.
   - Need a neutral, explainable framework to coordinate across agencies.

4. **Hackathon judges / students**
   - Need an interactive demo: visible vehicle movements, priority changes, queues, and analytics.
   - Need code that is readable, modular, and easy to extend.

---

## 4. Key Features

You MUST build and wire up all of these:

1. **Real-Time Incident Data Integration (Simulated)**
   - Mock feeds for EMS, fire, and police incidents.
   - Periodic generation of new incidents and vehicles moving on routes.
   - Unified event bus to update the dashboard and queue in near real time.

2. **Urgency Scoring Algorithm**
   - A transparent, multi-factor scoring system for each incident (e.g., 0–100).
   - Inputs: incident type, clinical/operational urgency, time since dispatch, distance to destination, traffic conditions, agency policy.
   - Outputs: numeric score, priority level (e.g., P1–P4), and human-readable explanation.

3. **Priority Queue Management**
   - Central prioritized list of active emergency vehicles.
   - Dynamic reordering as scores change over time.
   - Per-intersection sub-queues to decide which vehicle gets local signal priority.

4. **Map-Based Intersection Simulator**
   - Simplified 2D grid / map of roads and intersections.
   - Animated emergency vehicles and basic background traffic.
   - Traffic light states updated based on assigned priorities.

5. **User Interface Dashboard**
   - Responsive web UI with:
     - Map view
     - Incident list
     - Priority queue panel
     - Signal state indicators
     - Explanation and analytics panels

6. **Conflict Resolution Mechanism**
   - Deterministic rules to pick winners when multiple vehicles request priority for the same intersection or corridor.
   - Visible explanation of conflict outcomes (who wins, who yields, and why).

> Note: In addition to the above key features, the UI should include **analytics**: average response time, congestion level, and signal optimization performance metrics.

---

## 5. User Flow

### 5.1. Setup & Landing

1. User opens the web app in a browser.
2. Landing screen shows:
   - Header: “SignalFlow Orchestrator – Smart Traffic Signal Optimizer (Simulation)”
   - Toggle to start/stop simulation.
   - Badge: “All data is simulated. Not for operational use.”

### 5.2. Starting the Simulation

1. User clicks **“Start Simulation”**.
2. Backend starts generating:
   - New mock incidents for EMS, fire, police.
   - Vehicle objects associated with each incident.
   - Background traffic load indicators per road segment.
3. Frontend subscribes to a real-time stream (WebSocket or polling) and:
   - Renders new incidents in the incident list.
   - Places new vehicles on the map at origin intersections.

### 5.3. Viewing the Dashboard

Dashboard main layout (examples):

- **Top bar**
  - Simulation controls (Play/Pause, Reset)
  - Simulation speed (1x, 2x, 5x)

- **Left panel – Incident & Queue**
  - Tabs:
    - “Incidents”
      - Table: ID, Service (EMS/Fire/Police), Type, Priority Level, Score, Time since dispatch.
    - “Vehicle Queue”
      - Ranked list by descending score.
      - Each entry: vehicle ID, agency, priority, ETA, explanation snippet.

- **Center – Map-Based Intersection Simulator**
  - Grid or small city layout (e.g., 4x4 or 5x5 intersections).
  - Icons:
    - Emergency vehicles (colored by service).
    - Simple background traffic density by segment (e.g., thin vs thick line).
  - Intersections:
    - Show signal state per direction (e.g., colored dots or minimalist lights).
  - On clicking a vehicle:
    - Shows its route, current priority level, incident info, and score breakdown.

- **Right Panel – Explanations & Analytics**
  - **Current Decision Explanation**
    - When a conflict occurs, show:
      - Which vehicles competed.
      - Who got priority and why (scoring + tie-break rules).
  - **Analytics**
    - Average response time (simulated).
    - Estimated delay avoided vs no-priority baseline.
    - Simple congestion indicator (e.g., average segment load).
    - Percentage of cycles where signals were adjusted for emergency vehicles.

### 5.4. Incident Lifecycle

1. **Incident Creation**
   - Mock incident created with fields (examples):
     - `id`, `agency` (EMS/Fire/Police)
     - `type` (Cardiac Arrest, Fire in Residence, Robbery in Progress, etc.)
     - `severity` (1–4 or similar mapped to medical/operational categories)
     - `originIntersectionId`, `destinationIntersectionId`
     - `timeCreated`, `standardResponseTimeTarget` (e.g., 8 minutes EMS)
   - Associated vehicle created and placed at origin, assigned route.

2. **Scoring**
   - Algorithm calculates **incident urgency score**:
     - Base severity weight by incident type/category.
     - Time criticality: fraction of response target already used.
     - Distance/ETA to destination.
     - Current traffic congestion along route.
     - Agency-level modifiers (e.g., life-threatening EMS > property fire).
   - Score is mapped into priority bands:
     - P1 (Critical) – likely to grant strong preemption/green wave.
     - P2 (High) – soft priority, some preference.
     - P3 (Medium)
     - P4 (Low/Non-urgent)

3. **Queue Update**
   - Vehicle added to global **Priority Queue**.
   - Queue view updates ranking.
   - Each vehicle shows:
     - Score, priority level
     - ETA (assuming normal signals vs with priority)
     - “Reasoning” snippet (e.g., “Cardiac arrest, 75% of response target elapsed, heavy congestion ahead”).

4. **Approaching Intersections**
   - As vehicles move along routes, when they are within a threshold (e.g., 200m / 1 segment) of an intersection:
     - They send a **priority request** to that intersection.
     - Intersection builds a **local conflict set** of all requesting vehicles.

5. **Conflict Resolution**
   - Intersection uses the global score data to:
     - Compare requesting vehicles by score and priority band.
     - Apply tie-break rules (e.g., EMS > Fire > Police; nearest to intersection; time already lost).
   - Decision is sent back:
     - Winner gets strong preference (e.g., extended green or early green).
     - Others might get delayed or route-adjusted (simulated).

6. **Signal Behavior**
   - Signal states update visually.
   - Map shows:
     - Extended green on the winning corridor.
     - Red on others, maybe with a “serving EMS/Fire/Police” tag.

7. **Completion**
   - When a vehicle reaches destination:
     - Incident marked as “Resolved”.
     - Response time logged.
     - Queue entry removed.
     - Analytics updated.

### 5.5. Inspecting Explanations and Analytics

- User can click on:
  - A **queue entry** → full explanation:
    - Inputs, score breakdown, and narrative like:
      - “Priority P1 (Score 92): Life-threatening EMS call. 6/8 minute target elapsed. High congestion on route. Closest to destination among competing vehicles.”
  - An **intersection** where a recent conflict occurred:
    - Timeline of requests, score table for each vehicle, decision rationale.

- Analytics panel periodically refreshes:
  - Average response time by agency and priority level.
  - Comparison chart:
    - “With SignalFlow vs Baseline” (baseline = no priority adjustments; this can be simulated by a simple model).
  - Congestion metric:
    - e.g., average vehicles per road segment or “% of segments at high load”.

---

## 6. Technical Approach

### 6.1. Architecture

- **Frontend:** Single-page app for visualization & interaction.
- **Backend:** Lightweight API + simulation engine.
- **Communication:** REST for initial data; WebSockets (or periodic polling) for real-time updates.

A simple architecture for a hackathon:

- **Backend simulation loop**:
  - Every “tick” (e.g., 500–1000 ms):
    - Possibly create new incidents (random with distributions by agency/type).
    - Update vehicle positions.
    - Recompute scores as necessary.
    - Run conflict resolution and signal updates.
    - Broadcast state diff / full state to clients.

### 6.2. Suggested Tech Stack

**Frontend**

- Framework: **React** (or Vue/Svelte if preferred).
- State management: React hooks + Context or lightweight state lib (Zustand/Recoil).
- UI library: **Tailwind CSS** (fast prototyping) or MUI/Chakra for components.
- Map/visualization:
  - Option A: **react-leaflet** with a custom tile or a blank tile layer + drawn roads.
  - Option B: Custom SVG/Canvas grid (easier for hackathon and deterministic logic).
- Real-time:
  - `socket.io-client` or native WebSocket.

**Backend**

- Runtime: **Node.js** with **Express** or Fastify.
- Real-time:
  - `socket.io` or `ws`.
- Simulation: Plain JavaScript/TypeScript modules.
- In-memory storage (no need for DB for prototype):
  - Arrays/maps for incidents, vehicles, intersections.
- Optionally: In-memory DB (e.g., SQLite via better-sqlite3) if you want to log history.

**Deployment**

- Use one-node app (backend + static frontend) for simplicity.
- Deploy to services like Render, Railway, or Heroku-style platform.

### 6.3. Data Models (Simplified)

Define TypeScript-ish interfaces (pseudo-code):

```ts
type Agency = 'EMS' | 'FIRE' | 'POLICE';

interface Incident {
  id: string;
  agency: Agency;
  type: string;
  severity: 1 | 2 | 3 | 4; // 1=low, 4=critical
  originIntersectionId: string;
  destinationIntersectionId: string;
  timeCreated: number;
  responseTimeTargetSec: number;
  status: 'ACTIVE' | 'RESOLVED';
}

interface Vehicle {
  id: string;
  incidentId: string;
  agency: Agency;
  currentIntersectionId: string;
  nextIntersectionId?: string;
  route: string[]; // list of intersection IDs
  routeIndex: number;
  speed: number; // abstract units
  distanceToNext: number;
}

type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

interface ScoreExplanation {
  totalScore: number;
  priorityLevel: PriorityLevel;
  components: {
    severityScore: number;
    timeScore: number;
    distanceScore: number;
    congestionScore: number;
    agencyModifierScore: number;
  };
  narrative: string; // human-readable reason
}

interface Intersection {
  id: string;
  neighbors: string[];
  signalState: {
    // Example: NS green, EW red, phase index, etc.
    activePhase: 'NS_GREEN' | 'EW_GREEN';
    timeInPhase: number;
  };
  pendingRequests: string[]; // vehicle IDs requesting priority
}
```

### 6.4. Urgency Scoring Algorithm (Example Logic)

Implement a **transparent, rule-based** scoring system.

1. **Base severity score**
   - Map severity (1–4) and incident type into a base score.

   Example:
   - EMS:
     - Cardiac arrest (severity 4) → 60
     - Major trauma (4) → 55
     - Non-urgent transfer (1) → 10
   - Fire:
     - Structure fire (4) → 50
     - Alarm only (2) → 20
   - Police:
     - Active shooter (4) → 55
     - Burglary in progress (3) → 40

2. **Time urgency score**
   - `timeElapsed / responseTimeTarget` → ratio `r`.
   - If `r < 0.25` → small boost (0–10).
   - `0.25–0.75` → moderate (10–20).
   - `>0.75` → large (20–30).

3. **Distance / ETA score**
   - Closer to destination gets higher “finish-ability” bonus.
   - Example: map ETA (0–10 minutes) inversely to 0–15 points.

4. **Traffic congestion penalty**
   - Compute average congestion on route (0–1).
   - High congestion → add more score because they benefit more from priority (e.g., 0–20).

5. **Agency modifier**
   - Life-threatening EMS may get +5.
   - Some property-only incidents may get −5.

6. **Priority level mapping**
   - `score >= 80` → P1 (Critical).
   - `60–79` → P2.
   - `40–59` → P3.
   - `< 40` → P4.

Create a **ScoreExplanation** object with numeric components and narrative text.

### 6.5. Priority Queue Management

- Maintain a **global queue** as a list or heap:
  - Sort by `score.totalScore` descending.
  - Recompute sort on each tick or when scores change.

- For each intersection:
  - `pendingRequests` is a short list (likely <5).
  - Build a local queue by:
    - Sorting vehicles by score.
    - Using the conflict resolution mechanism (below) for tie-breaking.

Frontend periodically fetches or receives updated queue and re-renders.

### 6.6. Conflict Resolution Mechanism

When more than one vehicle requests priority at the same intersection within the same time window:

1. **Primary sort:** higher `totalScore`.
2. **Secondary sort:** higher priority level (P1 > P2 > P3 > P4).
3. **Tertiary sort:** agency preference (configurable; e.g., EMS > FIRE > POLICE).
4. **Quaternary sort:** smaller `ETA` to destination.
5. **Quinary sort:** first-come-first-served (lower request timestamp).

The backend computes:

```ts
interface ConflictResolutionOutcome {
  intersectionId: string;
  winnerVehicleId: string;
  loserVehicleIds: string[];
  rationale: string;
  scores: Record<string, ScoreExplanation>;
  timestamp: number;
}
```

Rationale example:

> “At Intersection I-05, EMS Vehicle E-12 (Score 88, P1) was prioritized over Fire Vehicle F-03 (Score 75, P2) because E-12 has a life-threatening medical call with less remaining response time and higher route congestion.”

This object is emitted over WebSocket and displayed in the “Current Decision Explanation” panel and optionally logged for replay.

### 6.7. Map-Based Intersection Simulator Implementation

For hackathon feasibility:

- Use a simple **grid layout**:
  - e.g., 5x5 intersections.
  - Each intersection has up/down/left/right neighbors.
- Represent:
  - Intersections: circles or squares.
  - Roads: straight lines connecting intersections.
- Vehicle movement:
  - At each tick, move the vehicle along the road segment toward next intersection based on `speed`.
  - When `distanceToNext <= 0`, arrive at next intersection, update routeIndex.

- Signals:
  - Basic phase: alternating **NS_GREEN** and **EW_GREEN** every `X` seconds.
  - When a vehicle with priority is approaching:
    - If their path is currently green: extend phase (skip normal switch).
    - If red: shorten current phase and switch early if safe in simulation.

Visuals:
- Color emergency vehicles by agency (e.g., red fire, blue police, green EMS).
- Draw a glowing halo around vehicles with P1 priority.
- Color roads by congestion (e.g., green/yellow/red lines).

### 6.8. Real-Time Incident Data Integration (Mock)

Implement a **MockIncidentGenerator**:

- Configuration:
  - Incident spawn rates per agency.
  - Distribution of incident types and severities.
- Loop:
  - At each tick, random chance to create new incident(s).
  - Assign random origin & destination intersections.
  - Use a basic shortest-path algorithm (e.g., BFS/Dijkstra on grid) to create route.

Ensure UI labels:
- Add a top banner:
  - “Simulation Mode: All incidents, vehicles, and traffic conditions are mock data.”
- In incident details:
  - Field `dataSource: 'SIMULATED'`.

---

## 7. Success Metrics

For hackathon purposes, measure success on two levels:

### 7.1. Functional / Demo Success

- **Completeness of Features**
  - All **Key Features** implemented:
    - Real-Time Incident Data Integration (mock).
    - Urgency Scoring Algorithm.
    - Priority Queue Management.
    - Map-Based Intersection Simulator.
    - User Interface Dashboard.
    - Conflict Resolution Mechanism.
  - Analytics panel present and updating.

- **User Experience**
  - App loads quickly and runs smoothly on a laptop.
  - Map responds interactively: vehicles move, signals change, queue updates.
  - Explanations are clear enough that a non-technical judge can follow.

### 7.2. Simulation Metrics (Displayed in UI)

- **Average Response Time**
  - Mean time from incident creation to vehicle arrival.
  - Compare `SignalFlow On` vs `SignalFlow Off` (baseline simulated).

- **Priority Impact**
  - Response time by priority level (P1 vs P2/P3/P4).
  - % of P1 incidents meeting their target response time.

- **Congestion & Network Impact**
  - Average congestion level around the network.
  - Number/percentage of intersections under priority control at any given time.

- **Conflict Resolution Transparency**
  - Count of conflicts resolved.
  - % of conflicts with explanations displayed (should be 100%).

If, during a live demo, observers can:

- See multiple emergencies on screen,
- Watch the priority queue re-rank vehicles in real time,
- Visibly see signals favoring the highest-priority vehicles,
- Understand why one vehicle was prioritized over another from the explanation panel,
- And view aggregate analytics that show improved response times in the simulation,

then the prototype meets the project’s goals.