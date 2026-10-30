/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { EmergencyVehicle, IntersectionSignal } from '../types/traffic';
import {
  X,
  Activity,
  Flame,
  Shield,
  Clock,
  Compass,
  MapPin,
  TrendingUp,
  AlertCircle,
  Gauge,
  Sparkles,
} from 'lucide-react';

interface VehicleInspectorProps {
  vehicle: EmergencyVehicle;
  intersections: Map<string, IntersectionSignal>;
  onClose: () => void;
}

export const VehicleInspector: React.FC<VehicleInspectorProps> = ({
  vehicle,
  intersections,
  onClose,
}) => {
  const isP1 = vehicle.scoreExplanation.priorityLevel === 'P1';
  const timeSaved = Math.max(0, vehicle.baselineEtaSec - vehicle.etaSec);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
              style={{ backgroundColor: vehicle.color }}
            >
              {vehicle.agency === 'EMS' && <Activity className="w-5 h-5" />}
              {vehicle.agency === 'FIRE' && <Flame className="w-5 h-5" />}
              {vehicle.agency === 'POLICE' && <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-base font-bold text-white flex items-center gap-2">
                <span>{vehicle.callSign}</span>
                <span
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    isP1
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : vehicle.scoreExplanation.priorityLevel === 'P2'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {vehicle.scoreExplanation.priorityLevel} · Score {vehicle.scoreExplanation.totalScore}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                DISPATCH ID: {vehicle.incidentId} · {vehicle.agency}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* AI Narrative Card */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SignalFlow Urgency Rationale</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {vehicle.scoreExplanation.narrative}
            </p>
          </div>

          {/* Performance Comparison Strip */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">SignalFlow ETA</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {Math.floor(vehicle.etaSec / 60)}m {vehicle.etaSec % 60}s
              </div>
              <div className="text-[10px] text-emerald-500 font-medium mt-0.5">Green Wave Active</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">Uncoordinated Baseline</div>
              <div className="text-lg font-mono font-bold text-slate-400">
                {Math.floor(vehicle.baselineEtaSec / 60)}m {vehicle.baselineEtaSec % 60}s
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Fixed Signal Red Lights</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 text-center">
              <div className="text-xs text-slate-400 mb-1">Delay Eliminated</div>
              <div className="text-lg font-mono font-bold text-cyan-300">
                -{timeSaved}s
              </div>
              <div className="text-[10px] text-cyan-400 font-medium mt-0.5">
                {Math.round((timeSaved / Math.max(1, vehicle.baselineEtaSec)) * 100)}% Faster Response
              </div>
            </div>
          </div>

          {/* 5-Factor Score Radar / Breakdown */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
              Multi-Factor Score Composition (0 - 100 Total)
            </div>

            <div className="space-y-3 text-xs">
              {/* Severity */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">1. Base Clinical/Incident Severity</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {vehicle.scoreExplanation.components.severityScore} / 60 max
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full"
                    style={{ width: `${(vehicle.scoreExplanation.components.severityScore / 60) * 100}%` }}
                  />
                </div>
              </div>

              {/* Time score */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">2. Golden Hour / SLA Time Criticality</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {vehicle.scoreExplanation.components.timeScore} / 30 max
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full"
                    style={{ width: `${(vehicle.scoreExplanation.components.timeScore / 30) * 100}%` }}
                  />
                </div>
              </div>

              {/* Congestion score */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">3. Route Traffic Congestion Penalty</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {vehicle.scoreExplanation.components.congestionScore} / 20 max
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full"
                    style={{ width: `${(vehicle.scoreExplanation.components.congestionScore / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Distance score */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">4. Distance / Finish-ability Bonus</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {vehicle.scoreExplanation.components.distanceScore} / 15 max
                  </span>
                </div>
                <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-purple-500 h-full"
                    style={{ width: `${(vehicle.scoreExplanation.components.distanceScore / 15) * 100}%` }}
                  />
                </div>
              </div>

              {/* Policy Modifier */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">5. Inter-Agency Policy Modifier</span>
                  <span className="font-mono text-slate-200 font-bold">
                    {vehicle.scoreExplanation.components.agencyModifierScore >= 0 ? '+' : ''}
                    {vehicle.scoreExplanation.components.agencyModifierScore} pts
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Route Progression Waypoints */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
            <div className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              <span>Route Waypoints & Signal Preemption Sequence</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2">
              {vehicle.route.map((nodeId, idx) => {
                const inter = intersections.get(nodeId);
                const isPassed = idx < vehicle.routeIndex;
                const isCurrent = idx === vehicle.routeIndex;
                const isPreemptedHere = inter?.isPreempted && inter?.preemptedForVehicleId === vehicle.id;

                return (
                  <div
                    key={nodeId}
                    className={`shrink-0 p-2.5 rounded-lg border text-center min-w-[120px] transition-all ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-500 text-white shadow-md'
                        : isPassed
                        ? 'bg-slate-950/40 border-slate-800 text-slate-500'
                        : 'bg-slate-900 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-slate-500 mb-0.5">
                      {idx === 0 ? 'ORIGIN' : idx === vehicle.route.length - 1 ? 'DESTINATION' : `STOP ${idx}`}
                    </div>
                    <div className="text-xs font-bold truncate max-w-[110px]">
                      {inter?.streetName || nodeId}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[110px]">
                      {inter?.avenueName}
                    </div>

                    <div className="mt-1.5">
                      {isPassed ? (
                        <span className="text-[10px] font-mono text-slate-500">Passed</span>
                      ) : isPreemptedHere ? (
                        <span className="text-[10px] font-mono font-bold text-emerald-400">
                          PREEMPTED
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-amber-400">Queued</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-950/80 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors"
          >
            Close Telemetry Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
