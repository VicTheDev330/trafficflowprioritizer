/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Agency, IncidentCategory } from '../types/traffic';
import { INCIDENT_TEMPLATES } from '../utils/scoring';
import {
  Sparkles,
  Flame,
  Activity,
  Shield,
  Layers,
  Zap,
  Play,
  Sliders,
  Send,
} from 'lucide-react';

interface ScenarioLauncherProps {
  onLoadScenarioCardiacVsFire: () => void;
  onLoadScenarioTripleThreat: () => void;
  onLoadScenarioRushHour: () => void;
  onSpawnCustomIncident: (agency: Agency, category: IncidentCategory) => void;
}

export const ScenarioLauncher: React.FC<ScenarioLauncherProps> = ({
  onLoadScenarioCardiacVsFire,
  onLoadScenarioTripleThreat,
  onLoadScenarioRushHour,
  onSpawnCustomIncident,
}) => {
  const [selectedAgency, setSelectedAgency] = useState<Agency>('EMS');
  const [selectedCategory, setSelectedCategory] = useState<IncidentCategory>('CARDIAC_ARREST');

  // Filter templates by agency
  const availableTemplates = Object.values(INCIDENT_TEMPLATES).filter(
    (t) => t.agency === selectedAgency
  );

  const handleCustomDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    onSpawnCustomIncident(selectedAgency, selectedCategory);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center gap-2 text-cyan-400 text-sm font-semibold mb-1">
          <Sparkles className="w-4 h-4" />
          <span>Interactive TCS iON AI Hackathon Demonstration Scenarios</span>
        </div>
        <h2 className="text-xl font-bold text-white">Curated Simulation Test Cases</h2>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Instantly load targeted multi-vehicle dilemmas to showcase multi-factor scoring, corridor preemption, and explainable conflict resolution to judges.
        </p>
      </div>

      {/* Preset Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Scenario 1: Ambulance vs Fire Truck */}
        <div className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all rounded-xl p-5 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
                RECOMMENDED FOR DEMO
              </span>
              <div className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs text-slate-500">vs</span>
                <Flame className="w-3.5 h-3.5 text-rose-400" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-amber-300 transition-colors">
              Ambulance vs Fire Truck Conflict
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dispatches a Cardiac Arrest Ambulance (EMS-102) traveling West-to-East and a 3-Alarm Fire Engine (FIRE-201) traveling North-to-South towards the same intersection at 3rd Ave & Lexington St.
            </p>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 mb-4">
              <span className="font-semibold text-slate-200">Demonstrates:</span> Live composite urgency score comparison, clinical priority weighting, and explainable arbitration rationale.
            </div>
          </div>

          <button
            onClick={onLoadScenarioCardiacVsFire}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Launch Conflict Scenario</span>
          </button>
        </div>

        {/* Scenario 2: Triple Agency Convergence */}
        <div className="bg-slate-900 border border-slate-800 hover:border-cyan-500/50 transition-all rounded-xl p-5 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 rounded border border-cyan-500/30">
                MULTI-AGENCY
              </span>
              <div className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-cyan-400" />
                <Flame className="w-3.5 h-3.5 text-rose-400" />
                <Shield className="w-3.5 h-3.5 text-blue-400" />
              </div>
            </div>

            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-cyan-300 transition-colors">
              Triple Agency Convergence
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Dispatches EMS, Fire, and Police units concurrently across the metropolitan grid. Tests global dynamic queue re-ranking and multi-node corridor preemption.
            </p>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 mb-4">
              <span className="font-semibold text-slate-200">Demonstrates:</span> Inter-agency priority standard (EMS Life Safety &gt; Fire &gt; Police), route overlap handling, and sequential clearance.
            </div>
          </div>

          <button
            onClick={onLoadScenarioTripleThreat}
            className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-lg shadow-md transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Launch Triple Convergence</span>
          </button>
        </div>

        {/* Scenario 3: Rush Hour Bottleneck */}
        <div className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 transition-all rounded-xl p-5 flex flex-col justify-between group">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 rounded border border-rose-500/30">
                CONGESTION ADAPTATION
              </span>
              <Layers className="w-4 h-4 text-rose-400" />
            </div>

            <h3 className="text-base font-bold text-white mb-1.5 group-hover:text-rose-300 transition-colors">
              Rush Hour Gridlock Clearing
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Injects heavy traffic density on central arterials (Lexington St and 3rd Ave). Demonstrates how SignalFlow dynamically boosts urgency scores for vehicles trapped in heavy congestion.
            </p>

            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 mb-4">
              <span className="font-semibold text-slate-200">Demonstrates:</span> Traffic congestion score boosting (+20 pts) ensuring vehicles stuck in traffic get green waves to blast through bottlenecks.
            </div>
          </div>

          <button
            onClick={onLoadScenarioRushHour}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-lg border border-slate-700 transition-colors flex items-center justify-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Simulate Rush Hour Surge</span>
          </button>
        </div>
      </div>

      {/* Custom Emergency Dispatcher Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
          <Send className="w-4 h-4 text-cyan-400" />
          <span>Manual Emergency Dispatch Console</span>
        </h3>
        <p className="text-xs text-slate-400 mb-4">
          Dispatch any emergency unit on demand to test real-time pathfinding, urgency calculation, and signal preemption.
        </p>

        <form onSubmit={handleCustomDispatch} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Select Agency */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Emergency Service
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['EMS', 'FIRE', 'POLICE'] as Agency[]).map((ag) => (
                <button
                  type="button"
                  key={ag}
                  onClick={() => {
                    setSelectedAgency(ag);
                    // auto pick first category of agency
                    const first = Object.values(INCIDENT_TEMPLATES).find((t) => t.agency === ag);
                    if (first) setSelectedCategory(first.category);
                  }}
                  className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-colors ${
                    selectedAgency === ag
                      ? ag === 'EMS'
                        ? 'bg-cyan-950/50 border-cyan-500 text-cyan-300'
                        : ag === 'FIRE'
                        ? 'bg-rose-950/50 border-rose-500 text-rose-300'
                        : 'bg-blue-950/50 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {ag}
                </button>
              ))}
            </div>
          </div>

          {/* Select Incident Category */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Incident Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as IncidentCategory)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-cyan-500"
            >
              {availableTemplates.map((tpl) => (
                <option key={tpl.category} value={tpl.category}>
                  {tpl.name} (Sev {tpl.baseSeverity})
                </option>
              ))}
            </select>
          </div>

          {/* Dispatch Button */}
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Dispatch Unit to Grid</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
