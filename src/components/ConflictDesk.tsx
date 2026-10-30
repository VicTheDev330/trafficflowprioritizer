/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ConflictResolutionOutcome, EmergencyVehicle } from '../types/traffic';
import {
  ShieldAlert,
  Award,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Sliders,
  Scale,
} from 'lucide-react';

interface ConflictDeskProps {
  conflicts: ConflictResolutionOutcome[];
  vehicles: EmergencyVehicle[];
  onTriggerConflictDemo: () => void;
  onSelectVehicle: (id: string | null) => void;
}

export const ConflictDesk: React.FC<ConflictDeskProps> = ({
  conflicts,
  vehicles,
  onTriggerConflictDemo,
  onSelectVehicle,
}) => {
  const latestConflict = conflicts[0] || null;

  return (
    <div className="space-y-6">
      {/* Header with Quick Action */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold mb-1">
            <Scale className="w-4 h-4" />
            <span>Autonomous Conflict Arbitration Engine</span>
          </div>
          <h2 className="text-xl font-bold text-white">Multi-Agency Corridor Priority Broker</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            When multiple emergency units approach the same intersection simultaneously, SignalFlow replaces binary sirens with transparent 5-tier multi-factor arbitration.
          </p>
        </div>

        <button
          onClick={onTriggerConflictDemo}
          className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-semibold text-xs rounded-lg shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all whitespace-nowrap shrink-0"
        >
          <Sparkles className="w-4 h-4 fill-slate-950" />
          <span>Simulate Intersection Conflict</span>
        </button>
      </div>

      {/* Latest Active Conflict Focus Card */}
      {latestConflict ? (
        <div className="bg-slate-900 border border-amber-500/30 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Live Intersection Arbitration
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-sm font-semibold text-slate-200">
                {latestConflict.intersectionName}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
              <Clock className="w-3.5 h-3.5" />
              <span>Resolved at {new Date(latestConflict.timestamp).toLocaleTimeString()}</span>
            </div>
          </div>

          {/* Decisive Rationale Callout */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-4 mb-6">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-emerald-400" />
              <span>Arbitration Decision & Rationale</span>
            </div>
            <p className="text-sm text-slate-200 font-medium leading-relaxed">
              {latestConflict.rationale}
            </p>
          </div>

          {/* Competitor Comparison Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Winner Card */}
            <div className="bg-emerald-950/20 border border-emerald-500/40 rounded-xl p-4 relative">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                    PRIORITY WINNER
                  </span>
                  <span className="text-xs text-emerald-400 font-medium">Granted Immediate Green Wave</span>
                </div>
                <div className="text-base font-bold font-mono text-emerald-400">
                  {latestConflict.winnerScore} PTS
                </div>
              </div>

              <div className="text-base font-bold text-white mb-1">
                {latestConflict.winnerCallSign}
              </div>
              <div className="text-xs text-slate-400 mb-4">
                Agency: <span className="text-slate-200 font-medium">{latestConflict.winnerAgency}</span> · Priority:{' '}
                <span className="text-emerald-300 font-medium">{latestConflict.winnerPriority}</span>
              </div>

              {/* Score breakdown metrics */}
              {latestConflict.detailedScores[latestConflict.winnerVehicleId] && (
                <div className="space-y-2 text-xs pt-3 border-t border-emerald-900/40">
                  <div className="flex justify-between text-slate-400">
                    <span>Clinical Severity Baseline</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.winnerVehicleId].components.severityScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SLA Time Criticality</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.winnerVehicleId].components.timeScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Route Congestion Benefit</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.winnerVehicleId].components.congestionScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Inter-Agency Policy Modifier</span>
                    <span className="font-mono text-slate-200">
                      {latestConflict.detailedScores[latestConflict.winnerVehicleId].components.agencyModifierScore >= 0 ? '+' : ''}
                      {latestConflict.detailedScores[latestConflict.winnerVehicleId].components.agencyModifierScore} pts
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Yielding Vehicle Card */}
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-slate-800 text-slate-400 rounded">
                    YIELDING UNIT
                  </span>
                  <span className="text-xs text-slate-400">Queued for Secondary Phase</span>
                </div>
                {latestConflict.loserVehicleIds[0] && latestConflict.detailedScores[latestConflict.loserVehicleIds[0]] && (
                  <div className="text-base font-bold font-mono text-slate-400">
                    {latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].totalScore} PTS
                  </div>
                )}
              </div>

              <div className="text-base font-bold text-slate-300 mb-1">
                {latestConflict.loserCallSigns[0] || 'Competing Unit'}
              </div>
              <div className="text-xs text-slate-400 mb-4">
                Agency: <span className="text-slate-200 font-medium">{latestConflict.loserAgencies[0]}</span> · Priority:{' '}
                <span className="text-slate-300 font-medium">
                  {latestConflict.loserVehicleIds[0] &&
                    latestConflict.detailedScores[latestConflict.loserVehicleIds[0]]?.priorityLevel}
                </span>
              </div>

              {/* Yielding score breakdown */}
              {latestConflict.loserVehicleIds[0] && latestConflict.detailedScores[latestConflict.loserVehicleIds[0]] && (
                <div className="space-y-2 text-xs pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-slate-400">
                    <span>Clinical Severity Baseline</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].components.severityScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>SLA Time Criticality</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].components.timeScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Route Congestion Benefit</span>
                    <span className="font-mono text-slate-200">
                      +{latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].components.congestionScore} pts
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Inter-Agency Policy Modifier</span>
                    <span className="font-mono text-slate-200">
                      {latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].components.agencyModifierScore >= 0 ? '+' : ''}
                      {latestConflict.detailedScores[latestConflict.loserVehicleIds[0]].components.agencyModifierScore} pts
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
          <ShieldAlert className="w-10 h-10 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-200 mb-1">No Active Conflicts at this Moment</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            All emergency units are currently traveling along non-conflicting corridors or with sufficient temporal separation.
          </p>
          <button
            onClick={onTriggerConflictDemo}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors"
          >
            Launch Simultaneous Cross-Intersection Conflict Scenario
          </button>
        </div>
      )}

      {/* 5-Tier Deterministic Arbitration Protocol Guide */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <span>The 5-Tier Deterministic Arbitration Framework</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-1">TIER 1 · PRIMARY</div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Composite Urgency Score</div>
            <p className="text-[11px] text-slate-400">
              Evaluates 0–100 score combining severity, elapsed target %, route delay, and distance.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-1">TIER 2 · SECONDARY</div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Priority Band Tier</div>
            <p className="text-[11px] text-slate-400">
              P1 (Critical Preemption) &gt; P2 (High Priority) &gt; P3 (Standard) &gt; P4 (Low).
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-1">TIER 3 · POLICY</div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Inter-Agency Standard</div>
            <p className="text-[11px] text-slate-400">
              Life-safety EMS takes precedence over property fire rescue, which leads law enforcement.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-1">TIER 4 · CLEARANCE</div>
            <div className="text-xs font-semibold text-slate-200 mb-1">Destination ETA</div>
            <p className="text-[11px] text-slate-400">
              Unit closest to final hospital or scene is expedited to immediately clear the network.
            </p>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800">
            <div className="text-[10px] font-mono font-bold text-cyan-400 mb-1">TIER 5 · CONTINGENCY</div>
            <div className="text-xs font-semibold text-slate-200 mb-1">First-to-Detect</div>
            <p className="text-[11px] text-slate-400">
              Strict millisecond sensor detection order if all four preceding factors are identical.
            </p>
          </div>
        </div>
      </div>

      {/* Historical Conflict Log */}
      {conflicts.length > 1 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-bold text-white mb-3">Recent Conflict Resolutions</h3>
          <div className="space-y-2">
            {conflicts.slice(1, 6).map((conf) => (
              <div
                key={conf.id}
                className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-200">
                    {conf.intersectionName} · Winner: <span className="text-emerald-400">{conf.winnerCallSign}</span> vs {conf.loserCallSigns.join(', ')}
                  </div>
                  <div className="text-slate-400 text-[11px] mt-0.5">{conf.rationale}</div>
                </div>
                <div className="text-slate-500 font-mono text-[11px] shrink-0">
                  {new Date(conf.timestamp).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
