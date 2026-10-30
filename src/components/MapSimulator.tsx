/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  EmergencyVehicle,
  IntersectionSignal,
  RoadSegment,
} from '../types/traffic';
import { CivilianCar, GRID_COLS, GRID_ROWS, parseIntersectionId } from '../utils/simulation';
import {
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Flame,
  Shield,
  Activity,
  AlertTriangle,
  Radio,
} from 'lucide-react';

interface MapSimulatorProps {
  intersections: Map<string, IntersectionSignal>;
  roadSegments: Map<string, RoadSegment>;
  vehicles: EmergencyVehicle[];
  civilianCars: CivilianCar[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  selectedIntersectionId: string | null;
  onSelectIntersection: (id: string | null) => void;
  showCongestionOverlay: boolean;
  onToggleCongestion: () => void;
  isSignalFlowActive: boolean;
  activeConflictIntersectionIds: string[];
}

export const MapSimulator: React.FC<MapSimulatorProps> = ({
  intersections,
  roadSegments,
  vehicles,
  civilianCars,
  selectedVehicleId,
  onSelectVehicle,
  selectedIntersectionId,
  onSelectIntersection,
  showCongestionOverlay,
  onToggleCongestion,
  isSignalFlowActive,
  activeConflictIntersectionIds,
}) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showCivilianTraffic, setShowCivilianTraffic] = useState(true);

  // SVG Geometry Constants
  const SVG_WIDTH = 920;
  const SVG_HEIGHT = 720;
  const PADDING_X = 110;
  const PADDING_Y = 80;
  const CELL_WIDTH = (SVG_WIDTH - 2 * PADDING_X) / (GRID_COLS - 1);
  const CELL_HEIGHT = (SVG_HEIGHT - 2 * PADDING_Y) / (GRID_ROWS - 1);

  const getCoordinates = (x: number, y: number) => {
    return {
      cx: PADDING_X + x * CELL_WIDTH,
      cy: PADDING_Y + y * CELL_HEIGHT,
    };
  };

  const getIntersectionCoords = (id: string) => {
    const { x, y } = parseIntersectionId(id);
    return getCoordinates(x, y);
  };

  // Find selected vehicle
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  return (
    <div className="relative bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[740px]">
      {/* Map Header Toolbar */}
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-semibold text-slate-100">Metropolitan Grid Telemetry</span>
          </div>
          <span aria-hidden="true" className="text-slate-700">·</span>
          <span className="text-xs text-slate-400 hidden sm:inline">
            5×5 Arterial Grid (25 Smart Intersections)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Congestion toggle */}
          <button
            onClick={onToggleCongestion}
            className={`px-2.5 py-1 text-xs rounded-md border flex items-center gap-1.5 transition-colors ${
              showCongestionOverlay
                ? 'bg-amber-950/40 text-amber-300 border-amber-800/80'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Congestion Heatmap</span>
          </button>

          {/* Civilian cars toggle */}
          <button
            onClick={() => setShowCivilianTraffic(!showCivilianTraffic)}
            className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
              showCivilianTraffic
                ? 'bg-slate-800 text-cyan-300 border-slate-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            Traffic Flow
          </button>

          {/* Zoom controls */}
          <div className="flex items-center bg-slate-900 rounded-md border border-slate-800 p-0.5">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.85, z - 0.1))}
              className="p-1 text-slate-400 hover:text-slate-100"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-slate-400 px-1.5">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
              className="p-1 text-slate-400 hover:text-slate-100"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive SVG Canvas */}
      <div className="relative flex-1 bg-[#090d16] overflow-hidden select-none flex items-center justify-center">
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full cursor-crosshair transition-transform duration-200"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Glowing filter for Green Wave Corridor */}
            <filter id="greenWaveGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Glowing filter for P1 Emergency Vehicles */}
            <filter id="p1VehicleAura" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Subtle Road Texture Gradient */}
            <linearGradient id="roadBase" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#172033" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>

            {/* Conflict Alert Pulse */}
            <filter id="conflictGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid Background City Blocks */}
          {Array.from({ length: GRID_ROWS - 1 }).map((_, r) =>
            Array.from({ length: GRID_COLS - 1 }).map((_, c) => {
              const tl = getCoordinates(c, r);
              const br = getCoordinates(c + 1, r + 1);
              return (
                <rect
                  key={`block_${c}_${r}`}
                  x={tl.cx + 28}
                  y={tl.cy + 28}
                  width={br.cx - tl.cx - 56}
                  height={br.cy - tl.cy - 56}
                  rx={8}
                  fill="#0b1120"
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  opacity={0.65}
                />
              );
            })
          )}

          {/* Street & Avenue Name Labels */}
          {Array.from({ length: GRID_COLS }).map((_, c) => {
            const pt = getCoordinates(c, 0);
            return (
              <text
                key={`ave_lbl_${c}`}
                x={pt.cx}
                y={pt.cy - 44}
                textAnchor="middle"
                className="text-[11px] font-mono font-medium fill-slate-400 select-none"
              >
                {c === 0 ? '1st Ave' : c === 1 ? '2nd Ave' : c === 2 ? '3rd Ave (Grand)' : c === 3 ? '4th Ave' : '5th Ave'}
              </text>
            );
          })}

          {Array.from({ length: GRID_ROWS }).map((_, r) => {
            const pt = getCoordinates(0, r);
            return (
              <text
                key={`st_lbl_${r}`}
                x={pt.cx - 64}
                y={pt.cy + 4}
                textAnchor="end"
                className="text-[11px] font-mono font-medium fill-slate-400 select-none"
              >
                {r === 0 ? 'Broad St' : r === 1 ? 'Elm St' : r === 2 ? 'Lexington St' : r === 3 ? 'Market St' : 'Beacon Way'}
              </text>
            );
          })}

          {/* Road Corridors (East-West & North-South) */}
          {Array.from(roadSegments.values()).map((road) => {
            const fromPt = getIntersectionCoords(road.fromId);
            const toPt = getIntersectionCoords(road.toId);

            // Avoid double-rendering reversed duplicates
            if (road.id.includes('->') && road.fromId > road.toId) return null;

            // Congestion color styling
            let roadStroke = '#1e293b';
            let roadOpacity = 0.9;
            if (showCongestionOverlay) {
              if (road.congestion >= 0.6) {
                roadStroke = '#ef4444'; // Heavy
                roadOpacity = 0.85;
              } else if (road.congestion >= 0.35) {
                roadStroke = '#f59e0b'; // Moderate
                roadOpacity = 0.75;
              } else {
                roadStroke = '#10b981'; // Flowing
                roadOpacity = 0.55;
              }
            }

            return (
              <g key={`road_${road.id}`}>
                {/* Road asphalt foundation */}
                <line
                  x1={fromPt.cx}
                  y1={fromPt.cy}
                  x2={toPt.cx}
                  y2={toPt.cy}
                  stroke="#182235"
                  strokeWidth={32}
                  strokeLinecap="round"
                />

                {/* Congestion overlay or road boundary */}
                <line
                  x1={fromPt.cx}
                  y1={fromPt.cy}
                  x2={toPt.cx}
                  y2={toPt.cy}
                  stroke={roadStroke}
                  strokeWidth={showCongestionOverlay ? 28 : 2}
                  strokeOpacity={roadOpacity}
                />

                {/* Road dashed center divider */}
                <line
                  x1={fromPt.cx}
                  y1={fromPt.cy}
                  x2={toPt.cx}
                  y2={toPt.cy}
                  stroke="#475569"
                  strokeWidth={1.5}
                  strokeDasharray="6 6"
                  opacity={0.4}
                />
              </g>
            );
          })}

          {/* Green Wave Preemption Corridor Glow (if SignalFlow Active) */}
          {isSignalFlowActive &&
            vehicles
              .filter((v) => v.scoreExplanation.priorityLevel === 'P1' || v.isPreempting)
              .map((v) => {
                const upcomingSegments: Array<{ from: { cx: number; cy: number }; to: { cx: number; cy: number } }> = [];
                for (let i = v.routeIndex; i < v.route.length - 1; i++) {
                  upcomingSegments.push({
                    from: getIntersectionCoords(v.route[i]),
                    to: getIntersectionCoords(v.route[i + 1]),
                  });
                }

                return upcomingSegments.map((seg, idx) => (
                  <g key={`green_wave_${v.id}_${idx}`} filter="url(#greenWaveGlow)">
                    <line
                      x1={seg.from.cx}
                      y1={seg.from.cy}
                      x2={seg.to.cx}
                      y2={seg.to.cy}
                      stroke="#10b981"
                      strokeWidth={10}
                      strokeOpacity={0.65}
                      strokeLinecap="round"
                    />
                    <line
                      x1={seg.from.cx}
                      y1={seg.from.cy}
                      x2={seg.to.cx}
                      y2={seg.to.cy}
                      stroke="#a7f3d0"
                      strokeWidth={3}
                      strokeDasharray="10 10"
                      strokeOpacity={0.9}
                    />
                  </g>
                ));
              })}

          {/* Background Civilian Traffic (Smooth animated flow) */}
          {showCivilianTraffic &&
            civilianCars.map((car) => {
              const fromPt = getIntersectionCoords(car.fromId);
              const toPt = getIntersectionCoords(car.toId);
              const curX = fromPt.cx + (toPt.cx - fromPt.cx) * car.progress;
              const curY = fromPt.cy + (toPt.cy - fromPt.cy) * car.progress;
              return (
                <circle
                  key={car.id}
                  cx={curX}
                  cy={curY}
                  r={3.5}
                  fill="#94a3b8"
                  opacity={0.7}
                />
              );
            })}

          {/* Intersections & Traffic Signal Controllers */}
          {Array.from(intersections.values()).map((inter) => {
            const pt = getCoordinates(inter.gridX, inter.gridY);
            const isSelected = selectedIntersectionId === inter.id;
            const hasConflict = activeConflictIntersectionIds.includes(inter.id);
            const isPreempted = inter.isPreempted;

            // Signal colors per direction
            const isNSGreen = inter.activePhase === 'NS_GREEN';
            const isNSYellow = inter.activePhase === 'NS_YELLOW';
            const isEWGreen = inter.activePhase === 'EW_GREEN';
            const isEWYellow = inter.activePhase === 'EW_YELLOW';

            const nsColor = isNSGreen ? '#10b981' : isNSYellow ? '#f59e0b' : '#ef4444';
            const ewColor = isEWGreen ? '#10b981' : isEWYellow ? '#f59e0b' : '#ef4444';

            return (
              <g
                key={inter.id}
                onClick={() => onSelectIntersection(inter.id)}
                className="cursor-pointer group"
              >
                {/* Preemption pulse halo */}
                {isPreempted && (
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={32}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="4 4"
                    className="animate-spin"
                    style={{ transformOrigin: `${pt.cx}px ${pt.cy}px` }}
                  />
                )}

                {/* Active Conflict Alert Ring */}
                {hasConflict && (
                  <circle
                    cx={pt.cx}
                    cy={pt.cy}
                    r={36}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={3}
                    filter="url(#conflictGlow)"
                    className="animate-pulse"
                  />
                )}

                {/* Intersection Junction Box */}
                <rect
                  x={pt.cx - 20}
                  y={pt.cy - 20}
                  width={40}
                  height={40}
                  rx={6}
                  fill={isSelected ? '#1e293b' : '#0f172a'}
                  stroke={
                    hasConflict
                      ? '#f59e0b'
                      : isPreempted
                      ? '#10b981'
                      : isSelected
                      ? '#38bdf8'
                      : '#334155'
                  }
                  strokeWidth={isSelected || hasConflict || isPreempted ? 2.5 : 1.5}
                />

                {/* North Signal Light */}
                <circle cx={pt.cx} cy={pt.cy - 12} r={3.5} fill={nsColor} />
                {/* South Signal Light */}
                <circle cx={pt.cx} cy={pt.cy + 12} r={3.5} fill={nsColor} />
                {/* West Signal Light */}
                <circle cx={pt.cx - 12} cy={pt.cy} r={3.5} fill={ewColor} />
                {/* East Signal Light */}
                <circle cx={pt.cx + 12} cy={pt.cy} r={3.5} fill={ewColor} />

                {/* Center Node Indicator */}
                <circle
                  cx={pt.cx}
                  cy={pt.cy}
                  r={4}
                  fill={isPreempted ? '#10b981' : hasConflict ? '#f59e0b' : '#64748b'}
                />

                {/* Preemption Badge Tag */}
                {isPreempted && (
                  <g transform={`translate(${pt.cx - 28}, ${pt.cy - 34})`}>
                    <rect
                      width={56}
                      height={14}
                      rx={3}
                      fill="#064e3b"
                      stroke="#10b981"
                      strokeWidth={1}
                    />
                    <text
                      x={28}
                      y={10}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-emerald-300"
                    >
                      PREEMPTED
                    </text>
                  </g>
                )}

                {/* Conflict Badge Tag */}
                {hasConflict && !isPreempted && (
                  <g transform={`translate(${pt.cx - 24}, ${pt.cy - 34})`}>
                    <rect
                      width={48}
                      height={14}
                      rx={3}
                      fill="#78350f"
                      stroke="#f59e0b"
                      strokeWidth={1}
                    />
                    <text
                      x={24}
                      y={10}
                      textAnchor="middle"
                      className="text-[9px] font-mono font-bold fill-amber-300"
                    >
                      CONFLICT
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Emergency Vehicles */}
          {vehicles.map((veh) => {
            const fromPt = getIntersectionCoords(veh.currentIntersectionId);
            const toPt = veh.nextIntersectionId
              ? getIntersectionCoords(veh.nextIntersectionId)
              : fromPt;

            // Interpolated position along segment
            const curX = fromPt.cx + (toPt.cx - fromPt.cx) * veh.progressOnSegment;
            const curY = fromPt.cy + (toPt.cy - fromPt.cy) * veh.progressOnSegment;

            const isSelected = selectedVehicleId === veh.id;
            const isP1 = veh.scoreExplanation.priorityLevel === 'P1';

            // Angle of travel
            const angle =
              Math.atan2(toPt.cy - fromPt.cy, toPt.cx - fromPt.cx) * (180 / Math.PI);

            return (
              <g
                key={veh.id}
                transform={`translate(${curX}, ${curY})`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectVehicle(veh.id);
                }}
                className="cursor-pointer group"
              >
                {/* P1 Critical Halo Aura */}
                {isP1 && (
                  <circle
                    r={24}
                    fill="none"
                    stroke={veh.color}
                    strokeWidth={2}
                    opacity={0.6}
                    filter="url(#p1VehicleAura)"
                    className="animate-ping"
                  />
                )}

                {/* Selection Ring */}
                {isSelected && (
                  <circle
                    r={22}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeDasharray="4 4"
                    className="animate-spin"
                  />
                )}

                {/* Vehicle Body Container */}
                <g transform={`rotate(${angle})`}>
                  {/* Vehicle chassis */}
                  <rect
                    x={-14}
                    y={-8}
                    width={28}
                    height={16}
                    rx={4}
                    fill={veh.agency === 'EMS' ? '#0f766e' : veh.agency === 'FIRE' ? '#991b1b' : '#1e3a8a'}
                    stroke={veh.color}
                    strokeWidth={2}
                  />

                  {/* Windshield */}
                  <rect x={4} y={-6} width={5} height={12} rx={1} fill="#e2e8f0" opacity={0.8} />

                  {/* Strobe Lightbar */}
                  <rect x={-3} y={-7} width={6} height={14} rx={1} fill="#ffffff" className="animate-pulse" />
                </g>

                {/* Floating CallSign & Priority Pill */}
                <g transform="translate(0, -18)">
                  <rect
                    x={-34}
                    y={-10}
                    width={68}
                    height={16}
                    rx={8}
                    fill="#0f172a"
                    stroke={isP1 ? '#38bdf8' : '#475569'}
                    strokeWidth={1.5}
                  />
                  <text
                    x={0}
                    y={2}
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-white select-none"
                  >
                    {veh.callSign.split(' ')[0]} · {veh.scoreExplanation.priorityLevel}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>

        {/* Selected Vehicle Follow HUD Card */}
        {selectedVehicle && (
          <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:w-96 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-xl p-4 shadow-2xl z-20">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                  style={{ backgroundColor: selectedVehicle.color }}
                >
                  {selectedVehicle.agency === 'EMS' && <Activity className="w-4 h-4" />}
                  {selectedVehicle.agency === 'FIRE' && <Flame className="w-4 h-4" />}
                  {selectedVehicle.agency === 'POLICE' && <Shield className="w-4 h-4" />}
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {selectedVehicle.callSign}
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                        selectedVehicle.scoreExplanation.priorityLevel === 'P1'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : selectedVehicle.scoreExplanation.priorityLevel === 'P2'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-blue-500/20 text-blue-300'
                      }`}
                    >
                      {selectedVehicle.scoreExplanation.priorityLevel} · Score {selectedVehicle.scoreExplanation.totalScore}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Heading to {selectedVehicle.route[selectedVehicle.route.length - 1]}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onSelectVehicle(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">ETA (SignalFlow)</div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  {Math.floor(selectedVehicle.etaSec / 60)}m {selectedVehicle.etaSec % 60}s
                </div>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Baseline ETA</div>
                <div className="text-xs font-mono font-bold text-slate-400">
                  {Math.floor(selectedVehicle.baselineEtaSec / 60)}m {selectedVehicle.baselineEtaSec % 60}s
                </div>
              </div>
              <div className="bg-slate-950/60 p-1.5 rounded border border-slate-800">
                <div className="text-[10px] text-slate-400">Time Saved</div>
                <div className="text-xs font-mono font-bold text-cyan-300">
                  -{Math.max(0, selectedVehicle.baselineEtaSec - selectedVehicle.etaSec)}s
                </div>
              </div>
            </div>

            <div className="mt-2 text-[11px] text-slate-300 bg-slate-950/80 p-2 rounded border border-slate-800/80">
              {selectedVehicle.scoreExplanation.narrative}
            </div>
          </div>
        )}
      </div>

      {/* Map Footer Legend */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-cyan-500"></span>
            <span>EMS Ambulance</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500"></span>
            <span>Fire Engine</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span>Police Unit</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded bg-emerald-500"></span>
            <span>Green Wave Corridor</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full border-2 border-amber-400"></span>
            <span>Active Conflict Node</span>
          </div>
        </div>
      </div>
    </div>
  );
};
