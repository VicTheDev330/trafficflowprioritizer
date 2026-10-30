/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { EmergencyVehicle, Agency, PriorityLevel } from '../types/traffic';
import {
  Activity,
  Flame,
  Shield,
  Plus,
  ArrowUpRight,
  Filter,
  CheckCircle2,
  Clock,
  Gauge,
} from 'lucide-react';

interface IncidentQueuePanelProps {
  vehicles: EmergencyVehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  onSpawnIncident: () => void;
}

export const IncidentQueuePanel: React.FC<IncidentQueuePanelProps> = ({
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  onSpawnIncident,
}) => {
  const [filterAgency, setFilterAgency] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');

  // Filter vehicles
  const filteredVehicles = vehicles
    .filter((v) => (filterAgency === 'ALL' ? true : v.agency === filterAgency))
    .filter((v) => (filterPriority === 'ALL' ? true : v.scoreExplanation.priorityLevel === filterPriority))
    .sort((a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore);

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>Global Priority Queue & Dispatch Registry</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({filteredVehicles.length} active emergency units)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Dynamically re-ranked by multi-factor urgency algorithm every simulation tick.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Dispatch Emergency Button */}
          <button
            onClick={onSpawnIncident}
            className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dispatch Incident</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[11px] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Agency:
          </span>
          {['ALL', 'EMS', 'FIRE', 'POLICE'].map((ag) => (
            <button
              key={ag}
              onClick={() => setFilterAgency(ag)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterAgency === ag
                  ? 'bg-slate-800 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {ag}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[11px] font-medium mr-1">Priority:</span>
          {['ALL', 'P1', 'P2', 'P3', 'P4'].map((p) => (
            <button
              key={p}
              onClick={() => setFilterPriority(p)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filterPriority === p
                  ? 'bg-slate-800 text-amber-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Rank & CallSign</th>
                <th className="py-3 px-3">Service</th>
                <th className="py-3 px-3">Priority</th>
                <th className="py-3 px-3 text-right">Urgency Score</th>
                <th className="py-3 px-3">Corridor Routing</th>
                <th className="py-3 px-3 text-right">ETA (SignalFlow)</th>
                <th className="py-3 px-3 text-right">Baseline Delay</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    No emergency vehicles match the current filter criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((veh, index) => {
                  const isSelected = selectedVehicleId === veh.id;
                  const isP1 = veh.scoreExplanation.priorityLevel === 'P1';
                  const timeSavedSec = Math.max(0, veh.baselineEtaSec - veh.etaSec);

                  return (
                    <tr
                      key={veh.id}
                      onClick={() => onSelectVehicle(veh.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-950/30 text-white'
                          : 'hover:bg-slate-800/50 text-slate-200'
                      }`}
                    >
                      {/* Rank & CallSign */}
                      <td className="py-3.5 px-4 font-medium flex items-center gap-2.5">
                        <span className="font-mono text-slate-500 text-[11px] w-5">
                          #{index + 1}
                        </span>
                        <div
                          className="w-7 h-7 rounded-md flex items-center justify-center text-white shrink-0"
                          style={{ backgroundColor: veh.color }}
                        >
                          {veh.agency === 'EMS' && <Activity className="w-3.5 h-3.5" />}
                          {veh.agency === 'FIRE' && <Flame className="w-3.5 h-3.5" />}
                          {veh.agency === 'POLICE' && <Shield className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{veh.callSign}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">
                            {veh.incidentId}
                          </div>
                        </div>
                      </td>

                      {/* Agency */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-slate-300">{veh.agency}</span>
                      </td>

                      {/* Priority Level */}
                      <td className="py-3.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            isP1
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : veh.scoreExplanation.priorityLevel === 'P2'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {veh.scoreExplanation.priorityLevel}
                        </span>
                      </td>

                      {/* Score */}
                      <td className="py-3.5 px-3 text-right">
                        <div className="font-mono font-bold text-sm text-cyan-300">
                          {veh.scoreExplanation.totalScore}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">/ 100 max</div>
                      </td>

                      {/* Corridor Routing */}
                      <td className="py-3.5 px-3">
                        <div className="text-slate-300 text-xs truncate max-w-[150px]">
                          {veh.currentIntersectionId} → {veh.nextIntersectionId || 'Dest'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {veh.route.length - veh.routeIndex} intersections remaining
                        </div>
                      </td>

                      {/* SignalFlow ETA */}
                      <td className="py-3.5 px-3 text-right">
                        <span className="font-mono font-bold text-emerald-400">
                          {Math.floor(veh.etaSec / 60)}m {veh.etaSec % 60}s
                        </span>
                      </td>

                      {/* Baseline Delay */}
                      <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                        <span>{Math.floor(veh.baselineEtaSec / 60)}m {veh.baselineEtaSec % 60}s</span>
                        {timeSavedSec > 0 && (
                          <div className="text-[10px] text-cyan-400 font-semibold">
                            -{timeSavedSec}s faster
                          </div>
                        )}
                      </td>

                      {/* Preemption Status */}
                      <td className="py-3.5 px-3 text-center">
                        {isP1 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Preempting
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">Standard</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectVehicle(veh.id);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] font-medium transition-colors inline-flex items-center gap-1"
                        >
                          <span>Telemetry</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
