/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  EmergencyVehicle,
  IntersectionSignal,
  ConflictResolutionOutcome,
  Agency,
} from '../types/traffic';
import {
  Activity,
  Flame,
  Shield,
  Zap,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Clock,
  Compass,
  AlertTriangle,
  Sliders,
  ChevronRight,
} from 'lucide-react';

interface LivePrioritizerProps {
  vehicles: EmergencyVehicle[];
  intersections: Map<string, IntersectionSignal>;
  conflicts: ConflictResolutionOutcome[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  onTriggerConflictDemo: () => void;
  isSignalFlowActive: boolean;
  onOpenConflictDesk: () => void;
  onSpawnIncident: () => void;
}

export const LivePrioritizer: React.FC<LivePrioritizerProps> = ({
  vehicles,
  intersections,
  conflicts,
  selectedVehicleId,
  onSelectVehicle,
  onTriggerConflictDemo,
  isSignalFlowActive,
  onOpenConflictDesk,
  onSpawnIncident,
}) => {
  // Sort vehicles by urgency score descending
  const sortedVehicles = [...vehicles].sort(
    (a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore
  );

  const priorityLeader = sortedVehicles[0] || null;
  const runnerUps = sortedVehicles.slice(1, 4);
  const latestConflict = conflicts[0] || null;

  // Find intersection where leader is approaching
  const leaderNextInter = priorityLeader?.nextIntersectionId
    ? intersections.get(priorityLeader.nextIntersectionId)
    : null;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[740px] shadow-2xl justify-between overflow-hidden">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
              <span>Autonomous Urgency Prioritizer</span>
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60 font-semibold">
            {isSignalFlowActive ? 'GREEN WAVE ARBITRATING' : 'BASELINE (OFF)'}
          </span>
        </div>

        {/* 1. Active Priority Leader Card */}
        {priorityLeader ? (
          <div className="mt-3.5 bg-gradient-to-b from-slate-950 to-slate-900/90 border border-emerald-500/40 rounded-xl p-3.5 relative overflow-hidden shadow-lg">
            {/* Subtle glow */}
            <div className="absolute -right-6 -top-6 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 shadow-md"
                  style={{ backgroundColor: priorityLeader.color }}
                >
                  {priorityLeader.agency === 'EMS' && <Activity className="w-4 h-4" />}
                  {priorityLeader.agency === 'FIRE' && <Flame className="w-4 h-4" />}
                  {priorityLeader.agency === 'POLICE' && <Shield className="w-4 h-4" />}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      #1 PRIORITY LEADER
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">
                      {priorityLeader.scoreExplanation.priorityLevel} · {priorityLeader.scoreExplanation.totalScore} PTS
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white truncate max-w-[170px]">
                    {priorityLeader.callSign}
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectVehicle(priorityLeader.id)}
                className="text-[10px] font-mono px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              >
                Inspect
              </button>
            </div>

            {/* Preemption Status Banner */}
            <div className="bg-slate-950/90 p-2.5 rounded-lg border border-slate-800/80 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-[11px] flex items-center gap-1">
                  <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                  Preempting Corridor:
                </span>
                <span className="font-mono text-emerald-400 font-bold text-[11px] truncate max-w-[140px]">
                  {leaderNextInter?.name || 'Clearing Grid'}
                </span>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono">
                <span className="text-slate-400">SignalFlow ETA:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.floor(priorityLeader.etaSec / 60)}m {priorityLeader.etaSec % 60}s
                  <span className="text-[10px] text-cyan-400 ml-1">
                    (-{Math.max(0, priorityLeader.baselineEtaSec - priorityLeader.etaSec)}s)
                  </span>
                </span>
              </div>
            </div>

            {/* Rationale Snippet */}
            <div className="mt-2 text-[10px] text-slate-300 line-clamp-2 leading-relaxed">
              {priorityLeader.scoreExplanation.narrative}
            </div>
          </div>
        ) : (
          <div className="mt-3.5 p-4 text-center bg-slate-950/40 rounded-xl border border-slate-800 text-slate-500 text-xs">
            No emergency vehicles active.
          </div>
        )}

        {/* 2. Priority Ladder (Next in queue) */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-2">
            <span>Dynamic Priority Ladder</span>
            <span className="font-mono text-[10px] text-slate-500">
              {vehicles.length} Units Ranked
            </span>
          </div>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {sortedVehicles.slice(0, 4).map((veh, idx) => {
              const isSelected = selectedVehicleId === veh.id;
              const isLeader = idx === 0;

              return (
                <div
                  key={veh.id}
                  onClick={() => onSelectVehicle(veh.id)}
                  className={`p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-sm'
                      : isLeader
                      ? 'bg-slate-950/80 border-slate-700/80 hover:bg-slate-800/60'
                      : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] text-slate-500 w-4">
                        #{idx + 1}
                      </span>
                      <div
                        className="w-5 h-5 rounded flex items-center justify-center text-white shrink-0 text-[10px]"
                        style={{ backgroundColor: veh.color }}
                      >
                        {veh.agency[0]}
                      </div>
                      <div className="font-medium text-slate-200 truncate max-w-[130px]">
                        {veh.callSign}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          veh.scoreExplanation.priorityLevel === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {veh.scoreExplanation.priorityLevel}
                      </span>
                      <span className="font-mono font-bold text-slate-200 text-xs w-7 text-right">
                        {veh.scoreExplanation.totalScore}
                      </span>
                    </div>
                  </div>

                  {/* Micro score bar */}
                  <div className="mt-1.5 w-full bg-slate-900 h-1 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${veh.scoreExplanation.totalScore}%`,
                        backgroundColor:
                          veh.scoreExplanation.totalScore >= 80
                            ? '#10b981'
                            : veh.scoreExplanation.totalScore >= 60
                            ? '#f59e0b'
                            : '#3b82f6',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. Live Conflict Arbitration Radar */}
        <div className="mt-4 pt-3 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-300 font-medium mb-2">
            <span className="flex items-center gap-1.5 text-amber-400">
              <ShieldAlert className="w-3.5 h-3.5" />
              Intersection Conflict Radar
            </span>
            {latestConflict && (
              <span className="text-[10px] font-mono text-slate-500">
                Resolved {new Date(latestConflict.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
          </div>

          {latestConflict ? (
            <div className="bg-slate-950/70 border border-amber-500/30 rounded-lg p-2.5 text-xs">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-semibold text-slate-200 truncate max-w-[160px]">
                  {latestConflict.intersectionName}
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                  {latestConflict.winnerCallSign} WON
                </span>
              </div>
              <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed">
                {latestConflict.rationale}
              </p>
              <button
                onClick={onOpenConflictDesk}
                className="mt-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
              >
                Inspect Arbitration Proof
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-lg p-2.5 text-xs text-slate-500 text-center">
              No signal conflicts active right now.
            </div>
          )}
        </div>
      </div>

      {/* Bottom Quick Controls */}
      <div className="mt-3 pt-3 border-t border-slate-800 space-y-2">
        <button
          onClick={onTriggerConflictDemo}
          className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>Simulate Emergency Conflict</span>
        </button>

        <button
          onClick={onSpawnIncident}
          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
        >
          <span>+ Dispatch Emergency Unit</span>
        </button>
      </div>
    </div>
  );
};
