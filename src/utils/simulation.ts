/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Agency,
  ConflictResolutionOutcome,
  EmergencyVehicle,
  Incident,
  IncidentCategory,
  IntersectionSignal,
  PriorityLevel,
  RoadSegment,
  SignalPhase,
  SimulationMetrics,
} from '../types/traffic';
import { computeUrgencyScore, INCIDENT_TEMPLATES } from './scoring';

export const GRID_COLS = 5;
export const GRID_ROWS = 5;

export const AVENUE_NAMES = ['1st Ave', '2nd Ave', '3rd Ave (Grand)', '4th Ave', '5th Ave'];
export const STREET_NAMES = ['Broad St', 'Elm St', 'Lexington St', 'Market St', 'Beacon Way'];

export const DESTINATIONS = [
  { id: 'hosp_metro', name: 'Metro General Hospital (Trauma Center)', intersectionId: 'I_4_2' },
  { id: 'hosp_st_jude', name: 'St. Jude Cardiac Center', intersectionId: 'I_0_4' },
  { id: 'fire_hq', name: 'Downtown Fire Station #4', intersectionId: 'I_2_0' },
  { id: 'police_precinct', name: 'Central District Police Precinct', intersectionId: 'I_1_4' },
  { id: 'civic_center', name: 'Civic Center Complex', intersectionId: 'I_2_2' },
  { id: 'harbor_dock', name: 'Harbor Commercial District', intersectionId: 'I_4_4' },
];

export function getIntersectionId(x: number, y: number): string {
  return `I_${x}_${y}`;
}

export function parseIntersectionId(id: string): { x: number; y: number } {
  const parts = id.replace('I_', '').split('_');
  return { x: parseInt(parts[0], 10), y: parseInt(parts[1], 10) };
}

export function createInitialIntersections(): Map<string, IntersectionSignal> {
  const map = new Map<string, IntersectionSignal>();

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const id = getIntersectionId(x, y);
      const name = `${AVENUE_NAMES[x]} & ${STREET_NAMES[y]}`;

      // Alternate initial phases so the city feels active
      const initialPhase: SignalPhase = (x + y) % 2 === 0 ? 'NS_GREEN' : 'EW_GREEN';

      map.set(id, {
        id,
        name,
        avenueName: AVENUE_NAMES[x],
        streetName: STREET_NAMES[y],
        gridX: x,
        gridY: y,
        neighbors: {
          north: y > 0 ? getIntersectionId(x, y - 1) : undefined,
          south: y < GRID_ROWS - 1 ? getIntersectionId(x, y + 1) : undefined,
          west: x > 0 ? getIntersectionId(x - 1, y) : undefined,
          east: x < GRID_COLS - 1 ? getIntersectionId(x + 1, y) : undefined,
        },
        activePhase: initialPhase,
        phaseTimeElapsed: Math.floor(Math.random() * 10),
        normalPhaseDuration: 18,
        yellowDuration: 3,
        isPreempted: false,
        pendingPriorityRequests: [],
      });
    }
  }

  return map;
}

export function createInitialRoadSegments(): Map<string, RoadSegment> {
  const map = new Map<string, RoadSegment>();

  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const fromId = getIntersectionId(x, y);

      // East neighbor
      if (x < GRID_COLS - 1) {
        const toId = getIntersectionId(x + 1, y);
        const segId = `${fromId}->${toId}`;
        const revId = `${toId}->${fromId}`;
        const baseCongestion = y === 2 ? 0.65 : (x + y) % 3 === 0 ? 0.45 : 0.2; // Lexington St busier
        const segment: RoadSegment = {
          id: segId,
          fromId,
          toId,
          direction: 'EW',
          lengthMeters: 400,
          congestion: baseCongestion,
          civilianCount: Math.round(baseCongestion * 18),
        };
        map.set(segId, segment);
        map.set(revId, { ...segment, id: revId, fromId: toId, toId: fromId });
      }

      // South neighbor
      if (y < GRID_ROWS - 1) {
        const toId = getIntersectionId(x, y + 1);
        const segId = `${fromId}->${toId}`;
        const revId = `${toId}->${fromId}`;
        const baseCongestion = x === 2 ? 0.6 : (x + y) % 2 === 0 ? 0.35 : 0.15; // 3rd Ave busier
        const segment: RoadSegment = {
          id: segId,
          fromId,
          toId,
          direction: 'NS',
          lengthMeters: 400,
          congestion: baseCongestion,
          civilianCount: Math.round(baseCongestion * 16),
        };
        map.set(segId, segment);
        map.set(revId, { ...segment, id: revId, fromId: toId, toId: fromId });
      }
    }
  }

  return map;
}

// Shortest path via BFS / Manhattan grid search
export function findPath(fromId: string, toId: string): string[] {
  if (fromId === toId) return [fromId];

  const queue: string[][] = [[fromId]];
  const visited = new Set<string>([fromId]);

  while (queue.length > 0) {
    const currentPath = queue.shift()!;
    const currentNode = currentPath[currentPath.length - 1];

    if (currentNode === toId) {
      return currentPath;
    }

    const { x, y } = parseIntersectionId(currentNode);
    const neighbors: string[] = [];
    if (y > 0) neighbors.push(getIntersectionId(x, y - 1));
    if (y < GRID_ROWS - 1) neighbors.push(getIntersectionId(x, y + 1));
    if (x > 0) neighbors.push(getIntersectionId(x - 1, y));
    if (x < GRID_COLS - 1) neighbors.push(getIntersectionId(x + 1, y));

    for (const nbr of neighbors) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push([...currentPath, nbr]);
      }
    }
  }

  return [fromId, toId];
}

// Background civilian cars for visual life
export interface CivilianCar {
  id: string;
  fromId: string;
  toId: string;
  progress: number; // 0 to 1
  speed: number;
}

export function generateInitialCivilianCars(): CivilianCar[] {
  const cars: CivilianCar[] = [];
  let count = 0;
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      if (x < GRID_COLS - 1 && Math.random() > 0.4) {
        cars.push({
          id: `civ_${count++}`,
          fromId: getIntersectionId(x, y),
          toId: getIntersectionId(x + 1, y),
          progress: Math.random(),
          speed: 0.08 + Math.random() * 0.04,
        });
      }
      if (y < GRID_ROWS - 1 && Math.random() > 0.4) {
        cars.push({
          id: `civ_${count++}`,
          fromId: getIntersectionId(x, y),
          toId: getIntersectionId(x, y + 1),
          progress: Math.random(),
          speed: 0.08 + Math.random() * 0.04,
        });
      }
    }
  }
  return cars;
}

// Pre-packaged demo scenarios for the hackathon
export function createScenarioCardiacVsFire(): {
  incidents: Incident[];
  vehicles: EmergencyVehicle[];
} {
  const now = Date.now();

  // Incident 1: Cardiac Arrest (EMS-102) traveling West to East along Lexington St towards I_2_2
  const inc1: Incident = {
    id: `INC_EMS_${Math.floor(Math.random() * 9000 + 1000)}`,
    agency: 'EMS',
    category: 'CARDIAC_ARREST',
    title: 'Out-of-Hospital Cardiac Arrest',
    severity: 4,
    originIntersectionId: 'I_0_2', // Lexington & 1st Ave
    destinationIntersectionId: 'I_4_2', // Metro General Hospital
    destinationName: 'Metro General Hospital',
    timeCreated: now - 180000, // 3 minutes elapsed
    responseTimeTargetSec: 360, // 6 min target
    status: 'ACTIVE',
    dataSource: 'SIMULATED',
  };

  const route1 = findPath('I_0_2', 'I_4_2');
  const score1 = computeUrgencyScore({
    agency: 'EMS',
    category: 'CARDIAC_ARREST',
    severity: 4,
    timeElapsedSec: 180,
    responseTimeTargetSec: 360,
    distanceRemainingMeters: 1200,
    routeAverageCongestion: 0.65,
    competingInConflict: true,
  });

  const veh1: EmergencyVehicle = {
    id: 'VEH_EMS_102',
    callSign: 'EMS Medic-102',
    incidentId: inc1.id,
    agency: 'EMS',
    currentIntersectionId: 'I_1_2', // Lexington & 2nd Ave (approaching I_2_2)
    nextIntersectionId: 'I_2_2',
    route: route1,
    routeIndex: 1,
    progressOnSegment: 0.62,
    speed: 0.18,
    isPreempting: false,
    scoreExplanation: score1,
    timeElapsedSec: 180,
    distanceRemainingMeters: 1200,
    etaSec: 145,
    baselineEtaSec: 240,
    color: '#06b6d4', // Cyan / Teal
  };

  // Incident 2: 3-Alarm Structure Fire (FIRE-201) traveling North to South along 3rd Ave towards I_2_2
  const inc2: Incident = {
    id: `INC_FIRE_${Math.floor(Math.random() * 9000 + 1000)}`,
    agency: 'FIRE',
    category: 'STRUCTURE_FIRE_ALARM_3',
    title: '3-Alarm Residential Structure Fire',
    severity: 4,
    originIntersectionId: 'I_2_0', // 3rd Ave & Broad St
    destinationIntersectionId: 'I_2_4', // 3rd Ave & Beacon Way
    destinationName: 'Residential Tower 7',
    timeCreated: now - 90000, // 1.5 min elapsed
    responseTimeTargetSec: 360,
    status: 'ACTIVE',
    dataSource: 'SIMULATED',
  };

  const route2 = findPath('I_2_0', 'I_2_4');
  const score2 = computeUrgencyScore({
    agency: 'FIRE',
    category: 'STRUCTURE_FIRE_ALARM_3',
    severity: 4,
    timeElapsedSec: 90,
    responseTimeTargetSec: 360,
    distanceRemainingMeters: 1300,
    routeAverageCongestion: 0.55,
    competingInConflict: true,
  });

  const veh2: EmergencyVehicle = {
    id: 'VEH_FIRE_201',
    callSign: 'Engine Co. 201',
    incidentId: inc2.id,
    agency: 'FIRE',
    currentIntersectionId: 'I_2_1', // 3rd Ave & Elm St (approaching I_2_2)
    nextIntersectionId: 'I_2_2',
    route: route2,
    routeIndex: 1,
    progressOnSegment: 0.60,
    speed: 0.17,
    isPreempting: false,
    scoreExplanation: score2,
    timeElapsedSec: 90,
    distanceRemainingMeters: 1300,
    etaSec: 160,
    baselineEtaSec: 255,
    color: '#f43f5e', // Rose / Red
  };

  return {
    incidents: [inc1, inc2],
    vehicles: [veh1, veh2],
  };
}

export function createScenarioTripleThreat(): {
  incidents: Incident[];
  vehicles: EmergencyVehicle[];
} {
  const base = createScenarioCardiacVsFire();
  const now = Date.now();

  // Add 3rd vehicle: Police Cruiser answering 10-33 Officer Assistance
  const inc3: Incident = {
    id: `INC_POL_${Math.floor(Math.random() * 9000 + 1000)}`,
    agency: 'POLICE',
    category: 'OFFICER_ASSISTANCE',
    title: 'Officer Emergency Assistance 10-33',
    severity: 4,
    originIntersectionId: 'I_4_0',
    destinationIntersectionId: 'I_1_4',
    destinationName: 'Central District Depot',
    timeCreated: now - 60000,
    responseTimeTargetSec: 300,
    status: 'ACTIVE',
    dataSource: 'SIMULATED',
  };

  const route3 = findPath('I_4_0', 'I_1_4');
  const score3 = computeUrgencyScore({
    agency: 'POLICE',
    category: 'OFFICER_ASSISTANCE',
    severity: 4,
    timeElapsedSec: 60,
    responseTimeTargetSec: 300,
    distanceRemainingMeters: 1800,
    routeAverageCongestion: 0.4,
    competingInConflict: true,
  });

  const veh3: EmergencyVehicle = {
    id: 'VEH_POL_305',
    callSign: 'Police Cruiser 305',
    incidentId: inc3.id,
    agency: 'POLICE',
    currentIntersectionId: route3[0],
    nextIntersectionId: route3[1],
    route: route3,
    routeIndex: 0,
    progressOnSegment: 0.25,
    speed: 0.21,
    isPreempting: false,
    scoreExplanation: score3,
    timeElapsedSec: 60,
    distanceRemainingMeters: 1800,
    etaSec: 135,
    baselineEtaSec: 220,
    color: '#3b82f6', // Cobalt Blue
  };

  return {
    incidents: [...base.incidents, inc3],
    vehicles: [...base.vehicles, veh3],
  };
}

export function createRandomIncident(): { incident: Incident; vehicle: EmergencyVehicle } {
  const now = Date.now();
  const categories: IncidentCategory[] = [
    'CARDIAC_ARREST',
    'SEVERE_TRAUMA',
    'STROKE_GOLDEN_HOUR',
    'STRUCTURE_FIRE_ALARM_3',
    'GAS_LEAK_HAZMAT',
    'ACTIVE_TACTICAL',
    'ARMED_ROBBERY',
  ];
  const cat = categories[Math.floor(Math.random() * categories.length)];
  const tpl = INCIDENT_TEMPLATES[cat];

  // Random distinct origin and destination
  const ox = Math.floor(Math.random() * GRID_COLS);
  const oy = Math.floor(Math.random() * GRID_ROWS);
  let dx = Math.floor(Math.random() * GRID_COLS);
  let dy = Math.floor(Math.random() * GRID_ROWS);
  if (dx === ox && dy === oy) {
    dx = (ox + 2) % GRID_COLS;
  }

  const originId = getIntersectionId(ox, oy);
  const destId = getIntersectionId(dx, dy);
  const destName = `${AVENUE_NAMES[dx]} & ${STREET_NAMES[dy]}`;

  const incId = `INC_${tpl.agency}_${Math.floor(Math.random() * 9000 + 1000)}`;
  const incident: Incident = {
    id: incId,
    agency: tpl.agency,
    category: cat,
    title: tpl.name,
    severity: tpl.baseSeverity as 1 | 2 | 3 | 4,
    originIntersectionId: originId,
    destinationIntersectionId: destId,
    destinationName: destName,
    timeCreated: now,
    responseTimeTargetSec: tpl.targetTimeSec,
    status: 'ACTIVE',
    dataSource: 'SIMULATED',
  };

  const route = findPath(originId, destId);
  const score = computeUrgencyScore({
    agency: tpl.agency,
    category: cat,
    severity: tpl.baseSeverity as 1 | 2 | 3 | 4,
    timeElapsedSec: 0,
    responseTimeTargetSec: tpl.targetTimeSec,
    distanceRemainingMeters: route.length * 400,
    routeAverageCongestion: 0.35,
  });

  const vehNum = Math.floor(Math.random() * 800 + 100);
  const callSign =
    tpl.agency === 'EMS'
      ? `EMS Medic-${vehNum}`
      : tpl.agency === 'FIRE'
      ? `Engine Co. ${vehNum}`
      : `Police Unit-${vehNum}`;

  const color = tpl.agency === 'EMS' ? '#06b6d4' : tpl.agency === 'FIRE' ? '#f43f5e' : '#3b82f6';

  const vehicle: EmergencyVehicle = {
    id: `VEH_${tpl.agency}_${vehNum}`,
    callSign,
    incidentId: incId,
    agency: tpl.agency,
    currentIntersectionId: route[0],
    nextIntersectionId: route[1] || route[0],
    route,
    routeIndex: 0,
    progressOnSegment: 0.05,
    speed: 0.16 + Math.random() * 0.04,
    isPreempting: false,
    scoreExplanation: score,
    timeElapsedSec: 0,
    distanceRemainingMeters: route.length * 400,
    etaSec: Math.round((route.length * 400) / 14),
    baselineEtaSec: Math.round((route.length * 400) / 8),
    color,
  };

  return { incident, vehicle };
}

// 5-Tier Deterministic Conflict Arbitration
export function arbitrateIntersectionConflict(
  intersection: IntersectionSignal,
  requestingVehicles: EmergencyVehicle[]
): ConflictResolutionOutcome {
  if (requestingVehicles.length <= 1) {
    throw new Error('Conflict resolution requires 2 or more vehicles');
  }

  // Multi-tier sort
  const sorted = [...requestingVehicles].sort((a, b) => {
    // 1. Primary: Urgency Score
    if (b.scoreExplanation.totalScore !== a.scoreExplanation.totalScore) {
      return b.scoreExplanation.totalScore - a.scoreExplanation.totalScore;
    }
    // 2. Secondary: Priority Band
    const bandRank: Record<PriorityLevel, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };
    if (bandRank[b.scoreExplanation.priorityLevel] !== bandRank[a.scoreExplanation.priorityLevel]) {
      return bandRank[b.scoreExplanation.priorityLevel] - bandRank[a.scoreExplanation.priorityLevel];
    }
    // 3. Tertiary: Inter-Agency Policy (EMS Life Safety > Fire Rescue > Police)
    const agencyRank: Record<Agency, number> = { EMS: 3, FIRE: 2, POLICE: 1 };
    if (agencyRank[b.agency] !== agencyRank[a.agency]) {
      return agencyRank[b.agency] - agencyRank[a.agency];
    }
    // 4. Quaternary: Remaining ETA (shorter ETA to finish)
    if (a.etaSec !== b.etaSec) {
      return a.etaSec - b.etaSec;
    }
    // 5. Quinary: Time elapsed
    return b.timeElapsedSec - a.timeElapsedSec;
  });

  const winner = sorted[0];
  const losers = sorted.slice(1);

  // Identify decisive factor
  let primaryFactor: ConflictResolutionOutcome['primaryFactor'] = 'SCORE_DELTA';
  let rationale = '';

  const scoreDiff = winner.scoreExplanation.totalScore - losers[0].scoreExplanation.totalScore;
  if (scoreDiff > 0) {
    primaryFactor = 'SCORE_DELTA';
    rationale = `At ${intersection.name}, ${winner.callSign} (Score ${winner.scoreExplanation.totalScore}, ${winner.scoreExplanation.priorityLevel}) was prioritized over ${losers[0].callSign} (Score ${losers[0].scoreExplanation.totalScore}) due to a higher aggregate urgency score (+${scoreDiff} pts) reflecting critical clinical SLA and route conditions.`;
  } else if (winner.scoreExplanation.priorityLevel !== losers[0].scoreExplanation.priorityLevel) {
    primaryFactor = 'PRIORITY_BAND';
    rationale = `At ${intersection.name}, ${winner.callSign} (${winner.scoreExplanation.priorityLevel}) won priority over ${losers[0].callSign} (${losers[0].scoreExplanation.priorityLevel}) via priority band tiering.`;
  } else if (winner.agency !== losers[0].agency) {
    primaryFactor = 'AGENCY_POLICY';
    rationale = `At ${intersection.name}, equal urgency scores resolved by Inter-Agency Standard: Life-Critical ${winner.agency} holds precedence over ${losers[0].agency} corridor.`;
  } else {
    primaryFactor = 'CRITICAL_ETA';
    rationale = `At ${intersection.name}, ${winner.callSign} was granted green wave due to closer destination ETA (${winner.etaSec}s vs ${losers[0].etaSec}s) to expedite corridor clearing.`;
  }

  const detailedScores: Record<string, typeof winner.scoreExplanation> = {};
  for (const v of requestingVehicles) {
    detailedScores[v.id] = v.scoreExplanation;
  }

  return {
    id: `CONF_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    intersectionId: intersection.id,
    intersectionName: intersection.name,
    timestamp: Date.now(),
    winnerVehicleId: winner.id,
    winnerCallSign: winner.callSign,
    winnerAgency: winner.agency,
    winnerScore: winner.scoreExplanation.totalScore,
    winnerPriority: winner.scoreExplanation.priorityLevel,
    loserVehicleIds: losers.map(l => l.id),
    loserCallSigns: losers.map(l => l.callSign),
    loserAgencies: losers.map(l => l.agency),
    primaryFactor,
    rationale,
    detailedScores,
  };
}
