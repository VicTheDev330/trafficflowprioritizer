/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, ShieldAlert, Cpu } from 'lucide-react';
import { soundFX } from '../utils/audio';

interface TopNavProps {
  currentTab: 'simulator' | 'conflicts' | 'queue' | 'analytics' | 'scenarios';
  setCurrentTab: (tab: 'simulator' | 'conflicts' | 'queue' | 'analytics' | 'scenarios') => void;
  isRunning: boolean;
  onToggleRunning: () => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  onReset: () => void;
  isSignalFlowActive: boolean;
  onToggleSignalFlow: () => void;
  activeConflictCount: number;
  activeVehicleCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentTab,
  setCurrentTab,
  isRunning,
  onToggleRunning,
  simSpeed,
  setSimSpeed,
  onReset,
  isSignalFlowActive,
  onToggleSignalFlow,
  activeConflictCount,
  activeVehicleCount,
}) => {
  const [audioMuted, setAudioMuted] = React.useState(!soundFX.enabled);

  const toggleSound = () => {
    soundFX.enabled = !soundFX.enabled;
    setAudioMuted(!soundFX.enabled);
    if (soundFX.enabled) {
      soundFX.playPreemptionChime();
    }
  };

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Banner indicating Mock Simulated Data */}
      <div className="bg-slate-950/80 px-4 py-1 text-xs text-slate-400 border-b border-slate-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
          <span className="font-medium text-slate-300">TCS iON AI Hackathon Demonstration</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Simulation Mode: All emergency dispatches, intersections, and traffic telemetry are mock data</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-slate-400 text-[11px]">
            ACTIVE UNITS: <span className="text-cyan-400 font-semibold tabular-nums">{activeVehicleCount}</span>
          </span>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="font-mono text-slate-400 text-[11px]">
            CONFLICTS MONITORED: <span className={activeConflictCount > 0 ? "text-amber-400 font-semibold tabular-nums" : "text-slate-400 tabular-nums"}>{activeConflictCount}</span>
          </span>
        </div>
      </div>

      {/* Main Top Bar Contract: Zone 1 (Wordmark) - Zone 2 (Nav links) - Zone 3 (Controls) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-base font-bold tracking-tight text-white flex items-center gap-2">
              SignalFlow Orchestrator
            </div>
            <div className="text-[11px] text-slate-400">
              Smart Emergency Traffic Management
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented View Tabs */}
        <nav className="hidden lg:flex items-center gap-1 p-1 bg-slate-950/60 rounded-lg border border-slate-800/80">
          <button
            onClick={() => setCurrentTab('simulator')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'simulator'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Live Operations
          </button>
          <button
            onClick={() => setCurrentTab('conflicts')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
              currentTab === 'conflicts'
                ? 'bg-slate-800 text-amber-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            Conflict Desk
            {activeConflictCount > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] font-mono bg-amber-500/20 text-amber-300 rounded">
                {activeConflictCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('queue')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'queue'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Priority Queue
          </button>
          <button
            onClick={() => setCurrentTab('analytics')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'analytics'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Performance & SLA
          </button>
          <button
            onClick={() => setCurrentTab('scenarios')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap shrink-0 ${
              currentTab === 'scenarios'
                ? 'bg-slate-800 text-cyan-300 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Demo Scenarios
          </button>
        </nav>

        {/* Zone 3: Simulation Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* SignalFlow vs Baseline Orchestrator toggle */}
          <button
            onClick={onToggleSignalFlow}
            title={
              isSignalFlowActive
                ? 'SignalFlow Orchestration Active: Preemption and green waves enabled'
                : 'Baseline Mode Active: Fixed standard cycle without emergency preemption'
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors ${
              isSignalFlowActive
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/80 hover:bg-emerald-900/40'
                : 'bg-rose-950/40 text-rose-300 border-rose-800/80 hover:bg-rose-900/40'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isSignalFlowActive ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-rose-400'
              }`}
            />
            <span className="hidden sm:inline">
              {isSignalFlowActive ? 'Orchestration ON' : 'Baseline (Fixed Signals)'}
            </span>
          </button>

          {/* Speed Selector */}
          <div className="flex items-center bg-slate-950/60 rounded-lg border border-slate-800 p-0.5 text-xs">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                onClick={() => setSimSpeed(spd)}
                className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                  simSpeed === spd
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          {/* Play / Pause */}
          <button
            onClick={onToggleRunning}
            className={`p-2 rounded-lg border transition-colors flex items-center justify-center ${
              isRunning
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : 'bg-cyan-600 border-cyan-500 text-white hover:bg-cyan-500'
            }`}
            title={isRunning ? 'Pause Simulation' : 'Run Simulation'}
          >
            {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
          </button>

          {/* Reset */}
          <button
            onClick={onReset}
            className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Audio Chime Mute/Unmute */}
          <button
            onClick={toggleSound}
            className={`p-2 rounded-lg border transition-colors ${
              audioMuted
                ? 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400'
                : 'bg-cyan-950/40 border-cyan-800 text-cyan-300 hover:bg-cyan-900/40'
            }`}
            title={audioMuted ? 'Sound Off: Click to enable audio preemption alerts' : 'Sound On: Click to mute'}
          >
            {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
