/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Agency = 'EMS' | 'FIRE' | 'POLICE';

export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type IncidentCategory =
  | 'CARDIAC_ARREST'
  | 'SEVERE_TRAUMA'
  | 'STROKE_GOLDEN_HOUR'
  | 'NON_URGENT_TRANSFER'
  | 'STRUCTURE_FIRE_ALARM_3'
  | 'COMMERCIAL_FIRE'
  | 'GAS_LEAK_HAZMAT'
  | 'FIRE_ALARM_CHECK'
  | 'ACTIVE_TACTICAL'
  | 'OFFICER_ASSISTANCE'
  | 'ARMED_ROBBERY'
  | 'TRAFFIC_COLLISION'
  | 'ROUTINE_PATROL';

export interface IncidentTemplate {
  category: IncidentCategory;
  name: string;
  agency: Agency;
  baseSeverity: number; // 1-4 scale
  defaultBaseScore: number; // 10 - 60
  targetTimeSec: number; // e.g. 360-600 seconds
  description: string;
}

export interface Incident {
  id: string;
  agency: Agency;
  category: IncidentCategory;
  title: string;
  severity: 1 | 2 | 3 | 4;
  originIntersectionId: string;
  destinationIntersectionId: string;
  destinationName: string;
  timeCreated: number; // timestamp
  responseTimeTargetSec: number;
  status: 'ACTIVE' | 'RESOLVED';
  resolvedAt?: number;
  actualDurationSec?: number;
  baselineDurationSec?: number;
  dataSource: 'SIMULATED';
}

export interface ScoreExplanation {
  totalScore: number;
  priorityLevel: PriorityLevel;
  components: {
    severityScore: number; // 0 - 60
    timeScore: number; // 0 - 30
    distanceScore: number; // 0 - 15
    congestionScore: number; // 0 - 20
    agencyModifierScore: number; // -10 to +10
  };
  narrative: string;
}

export interface EmergencyVehicle {
  id: string;
  callSign: string;
  incidentId: string;
  agency: Agency;
  currentIntersectionId: string;
  nextIntersectionId?: string;
  route: string[]; // sequence of intersection IDs
  routeIndex: number;
  progressOnSegment: number; // 0 to 1 between current and next
  speed: number; // units/sec
  isPreempting: boolean;
  scoreExplanation: ScoreExplanation;
  timeElapsedSec: number;
  distanceRemainingMeters: number;
  etaSec: number;
  baselineEtaSec: number;
  color: string;
}

export type SignalPhase = 'NS_GREEN' | 'NS_YELLOW' | 'EW_GREEN' | 'EW_YELLOW';

export interface IntersectionSignal {
  id: string;
  name: string;
  avenueName: string;
  streetName: string;
  gridX: number; // 0 to 4
  gridY: number; // 0 to 4
  neighbors: {
    north?: string;
    south?: string;
    east?: string;
    west?: string;
  };
  activePhase: SignalPhase;
  phaseTimeElapsed: number; // seconds in phase
  normalPhaseDuration: number; // e.g. 15-20s
  yellowDuration: number; // 3s
  isPreempted: boolean;
  preemptedForVehicleId?: string;
  preemptedDirection?: 'NS' | 'EW';
  pendingPriorityRequests: string[]; // vehicle IDs within detection range
}

export interface RoadSegment {
  id: string; // e.g. "I_0_0-I_0_1"
  fromId: string;
  toId: string;
  direction: 'NS' | 'EW';
  lengthMeters: number;
  congestion: number; // 0.0 (empty) to 1.0 (gridlock)
  civilianCount: number;
}

export interface ConflictResolutionOutcome {
  id: string;
  intersectionId: string;
  intersectionName: string;
  timestamp: number;
  winnerVehicleId: string;
  winnerCallSign: string;
  winnerAgency: Agency;
  winnerScore: number;
  winnerPriority: PriorityLevel;
  loserVehicleIds: string[];
  loserCallSigns: string[];
  loserAgencies: Agency[];
  primaryFactor: 'SCORE_DELTA' | 'PRIORITY_BAND' | 'AGENCY_POLICY' | 'CRITICAL_ETA' | 'FIRST_ARRIVAL';
  rationale: string;
  detailedScores: Record<string, ScoreExplanation>;
}

export interface SimulationMetrics {
  totalIncidentsHandled: number;
  activeIncidentsCount: number;
  avgResponseTimeWithSignalFlowSec: number;
  avgResponseTimeBaselineSec: number;
  totalDelaySavedSeconds: number;
  p1ComplianceRate: number; // percentage
  p2ComplianceRate: number;
  conflictsResolvedCount: number;
  preemptionActivationsCount: number;
  networkCongestionAvg: number; // 0-100%
  civilianImpactScore: number; // 0-100% (smoothness)
}

export interface DemoScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}
