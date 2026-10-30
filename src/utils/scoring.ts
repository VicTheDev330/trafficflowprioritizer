/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Agency, IncidentCategory, IncidentTemplate, PriorityLevel, ScoreExplanation } from '../types/traffic';

export const INCIDENT_TEMPLATES: Record<IncidentCategory, IncidentTemplate> = {
  CARDIAC_ARREST: {
    category: 'CARDIAC_ARREST',
    name: 'Out-of-Hospital Cardiac Arrest',
    agency: 'EMS',
    baseSeverity: 4,
    defaultBaseScore: 60,
    targetTimeSec: 360, // 6 minutes golden target
    description: 'Patient in unmonitored ventricular fibrillation; time-critical CPR and AED intervention required.',
  },
  SEVERE_TRAUMA: {
    category: 'SEVERE_TRAUMA',
    name: 'Class-1 Multi-Trauma / Hemorrhage',
    agency: 'EMS',
    baseSeverity: 4,
    defaultBaseScore: 55,
    targetTimeSec: 420, // 7 minutes
    description: 'High-speed motor collision with active arterial bleeding and airway compromise.',
  },
  STROKE_GOLDEN_HOUR: {
    category: 'STROKE_GOLDEN_HOUR',
    name: 'Acute Ischemic Stroke (LVO)',
    agency: 'EMS',
    baseSeverity: 4,
    defaultBaseScore: 50,
    targetTimeSec: 480, // 8 minutes
    description: 'Sudden hemiplegia and aphasia; eligible for thrombolytic window at comprehensive stroke center.',
  },
  NON_URGENT_TRANSFER: {
    category: 'NON_URGENT_TRANSFER',
    name: 'Scheduled Inter-Facility Transfer',
    agency: 'EMS',
    baseSeverity: 1,
    defaultBaseScore: 12,
    targetTimeSec: 1200, // 20 minutes
    description: 'Hemodynamically stable patient scheduled for non-acute rehabilitation transport.',
  },
  STRUCTURE_FIRE_ALARM_3: {
    category: 'STRUCTURE_FIRE_ALARM_3',
    name: '3-Alarm Residential Structure Fire',
    agency: 'FIRE',
    baseSeverity: 4,
    defaultBaseScore: 52,
    targetTimeSec: 360, // 6 minutes
    description: 'Heavy smoke and active flames spreading to upper floors; possible civilian entrapment.',
  },
  COMMERCIAL_FIRE: {
    category: 'COMMERCIAL_FIRE',
    name: 'Commercial Warehouse Fire Alarm',
    agency: 'FIRE',
    baseSeverity: 3,
    defaultBaseScore: 42,
    targetTimeSec: 480, // 8 minutes
    description: 'Commercial facility smoke detectors activated with visible thermal plume on exterior.',
  },
  GAS_LEAK_HAZMAT: {
    category: 'GAS_LEAK_HAZMAT',
    name: 'High-Pressure Natural Gas Rupture',
    agency: 'FIRE',
    baseSeverity: 4,
    defaultBaseScore: 48,
    targetTimeSec: 420, // 7 minutes
    description: 'Excavation rupture near school zone; evacuation perimeter being established.',
  },
  FIRE_ALARM_CHECK: {
    category: 'FIRE_ALARM_CHECK',
    name: 'Single-Zone Waterflow Water Alarm',
    agency: 'FIRE',
    baseSeverity: 2,
    defaultBaseScore: 20,
    targetTimeSec: 720, // 12 minutes
    description: 'Unconfirmed waterflow switch trip; no reported smoke or occupants in distress.',
  },
  ACTIVE_TACTICAL: {
    category: 'ACTIVE_TACTICAL',
    name: 'Active Threat / Armed Suspect Incident',
    agency: 'POLICE',
    baseSeverity: 4,
    defaultBaseScore: 55,
    targetTimeSec: 300, // 5 minutes
    description: 'Shots reported in public transit hub; rapid deployment required to contain corridor.',
  },
  OFFICER_ASSISTANCE: {
    category: 'OFFICER_ASSISTANCE',
    name: 'Officer Calling Emergency 10-33',
    agency: 'POLICE',
    baseSeverity: 4,
    defaultBaseScore: 50,
    targetTimeSec: 300, // 5 minutes
    description: 'Patrol officer requests urgent backup; foot pursuit involving armed subject.',
  },
  ARMED_ROBBERY: {
    category: 'ARMED_ROBBERY',
    name: 'Commercial Robbery in Progress',
    agency: 'POLICE',
    baseSeverity: 3,
    defaultBaseScore: 38,
    targetTimeSec: 480, // 8 minutes
    description: 'Silent panic alarm tripped at financial branch; suspects currently inside premises.',
  },
  TRAFFIC_COLLISION: {
    category: 'TRAFFIC_COLLISION',
    name: 'Major Highway Collision Clearing',
    agency: 'POLICE',
    baseSeverity: 2,
    defaultBaseScore: 24,
    targetTimeSec: 600, // 10 minutes
    description: 'Disabled vehicles blocking two central arterial lanes with traffic bottlenecking.',
  },
  ROUTINE_PATROL: {
    category: 'ROUTINE_PATROL',
    name: 'District Community Patrol Support',
    agency: 'POLICE',
    baseSeverity: 1,
    defaultBaseScore: 10,
    targetTimeSec: 1200, // 20 minutes
    description: 'Routine neighborhood visibility pass and scheduled shift rendezvous.',
  },
};

export interface ScoringInputs {
  agency: Agency;
  category: IncidentCategory;
  severity: 1 | 2 | 3 | 4;
  timeElapsedSec: number;
  responseTimeTargetSec: number;
  distanceRemainingMeters: number;
  routeAverageCongestion: number; // 0.0 to 1.0
  competingInConflict?: boolean;
}

export function computeUrgencyScore(inputs: ScoringInputs): ScoreExplanation {
  const template = INCIDENT_TEMPLATES[inputs.category];
  const baseSeverityScore = template ? template.defaultBaseScore : 30;

  // 1. Time Urgency Score (0 - 30 pts)
  // Ratio of time elapsed versus SLA target
  const ratio = Math.max(0, inputs.timeElapsedSec / Math.max(60, inputs.responseTimeTargetSec));
  let timeScore = 0;
  if (ratio < 0.25) {
    timeScore = Math.round(5 + ratio * 20); // 5 - 10 pts
  } else if (ratio <= 0.75) {
    timeScore = Math.round(10 + (ratio - 0.25) * 24); // 10 - 22 pts
  } else {
    // Over 75% elapsed - critical time penalty escalation
    timeScore = Math.min(30, Math.round(22 + (ratio - 0.75) * 32)); // 22 - 30 pts
  }

  // 2. Distance / Finish-ability Score (0 - 15 pts)
  // Vehicles close to destination get a priority nudge to clear them out of the network
  const distanceKm = inputs.distanceRemainingMeters / 1000;
  let distanceScore = 0;
  if (distanceKm <= 0.4) {
    distanceScore = 15;
  } else if (distanceKm <= 1.0) {
    distanceScore = 12;
  } else if (distanceKm <= 2.0) {
    distanceScore = 8;
  } else {
    distanceScore = 4;
  }

  // 3. Traffic Congestion Score (0 - 20 pts)
  // Higher road congestion means the vehicle suffers higher delays and gains maximum benefit from green wave
  const congestionScore = Math.round(inputs.routeAverageCongestion * 20);

  // 4. Agency & Clinical Policy Modifier (-10 to +10 pts)
  let agencyModifierScore = 0;
  if (inputs.agency === 'EMS') {
    if (inputs.category === 'CARDIAC_ARREST' || inputs.category === 'SEVERE_TRAUMA') {
      agencyModifierScore = +6; // Life safety medical priority
    } else if (inputs.category === 'STROKE_GOLDEN_HOUR') {
      agencyModifierScore = +4;
    } else if (inputs.category === 'NON_URGENT_TRANSFER') {
      agencyModifierScore = -6;
    }
  } else if (inputs.agency === 'FIRE') {
    if (inputs.category === 'STRUCTURE_FIRE_ALARM_3' || inputs.category === 'GAS_LEAK_HAZMAT') {
      agencyModifierScore = +4; // Life/property catastrophe
    } else if (inputs.category === 'FIRE_ALARM_CHECK') {
      agencyModifierScore = -4;
    }
  } else if (inputs.agency === 'POLICE') {
    if (inputs.category === 'ACTIVE_TACTICAL' || inputs.category === 'OFFICER_ASSISTANCE') {
      agencyModifierScore = +5; // Active life-safety threat
    } else if (inputs.category === 'ROUTINE_PATROL') {
      agencyModifierScore = -8;
    }
  }

  // Total Score Calculation (Clamped 0 - 100)
  const rawTotal = baseSeverityScore + timeScore + distanceScore + congestionScore + agencyModifierScore;
  const totalScore = Math.max(5, Math.min(100, Math.round(rawTotal)));

  // Priority Band Mapping
  let priorityLevel: PriorityLevel = 'P4';
  if (totalScore >= 80) {
    priorityLevel = 'P1';
  } else if (totalScore >= 60) {
    priorityLevel = 'P2';
  } else if (totalScore >= 40) {
    priorityLevel = 'P3';
  } else {
    priorityLevel = 'P4';
  }

  // Human-Readable Narrative Formulation
  const pctElapsed = Math.round(ratio * 100);
  const congPct = Math.round(inputs.routeAverageCongestion * 100);
  const narrative = generateNarrative({
    agency: inputs.agency,
    categoryName: template?.name || 'Emergency Dispatch',
    priorityLevel,
    totalScore,
    pctElapsed,
    congPct,
    baseScore: baseSeverityScore,
    distanceKm,
    timeScore,
  });

  return {
    totalScore,
    priorityLevel,
    components: {
      severityScore: baseSeverityScore,
      timeScore,
      distanceScore,
      congestionScore,
      agencyModifierScore,
    },
    narrative,
  };
}

function generateNarrative(data: {
  agency: Agency;
  categoryName: string;
  priorityLevel: PriorityLevel;
  totalScore: number;
  pctElapsed: number;
  congPct: number;
  baseScore: number;
  distanceKm: number;
  timeScore: number;
}): string {
  const urgencyTerm =
    data.priorityLevel === 'P1'
      ? 'Critical preemption required'
      : data.priorityLevel === 'P2'
      ? 'High operational priority'
      : data.priorityLevel === 'P3'
      ? 'Standard priority window'
      : 'Low priority transit';

  return `${data.priorityLevel} (Score ${data.totalScore}): ${data.agency} unit dispatched to ${data.categoryName}. Response target ${data.pctElapsed}% elapsed. Corridor traffic at ${data.congPct}% load. ${urgencyTerm}.`;
}
