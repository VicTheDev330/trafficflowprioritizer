/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/// <reference types="google.maps" />

import React, { useEffect, useState } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  EmergencyVehicle,
  IntersectionSignal,
  RoadSegment,
} from '../types/traffic';
import {
  Activity,
  Flame,
  Shield,
  Zap,
  Radio,
  Layers,
  MapPin,
  Compass,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCIvFNoPpniI1edxOAD_WE7ZuRaRgmJoLk';

// Real-World Geographic Coordinates: Midtown Manhattan Emergency Transit Grid
// Avenues: 5th Ave (X=0), Madison Ave (X=1), Park Ave (X=2), Lexington Ave (X=3), 3rd Ave (X=4)
// Streets: 34th St (Y=0), 38th St (Y=1), 42nd St (Y=2), 46th St (Y=3), 50th St (Y=4)
export const REAL_WORLD_COORDS: Record<string, { lat: number; lng: number; label: string }> = {
  I_0_0: { lat: 40.7484, lng: -73.9857, label: '5th Ave & 34th St (Empire State)' },
  I_1_0: { lat: 40.7495, lng: -73.9830, label: 'Madison Ave & 34th St' },
  I_2_0: { lat: 40.7505, lng: -73.9805, label: 'Park Ave & 34th St (Fire HQ)' },
  I_3_0: { lat: 40.7515, lng: -73.9780, label: 'Lexington Ave & 34th St' },
  I_4_0: { lat: 40.7525, lng: -73.9755, label: '3rd Ave & 34th St' },

  I_0_1: { lat: 40.7508, lng: -73.9839, label: '5th Ave & 38th St' },
  I_1_1: { lat: 40.7519, lng: -73.9812, label: 'Madison Ave & 38th St' },
  I_2_1: { lat: 40.7529, lng: -73.9787, label: 'Park Ave & 38th St' },
  I_3_1: { lat: 40.7539, lng: -73.9762, label: 'Lexington Ave & 38th St' },
  I_4_1: { lat: 40.7549, lng: -73.9737, label: '3rd Ave & 38th St' },

  I_0_2: { lat: 40.7532, lng: -73.9821, label: '5th Ave & 42nd St (Public Library)' },
  I_1_2: { lat: 40.7543, lng: -73.9794, label: 'Madison Ave & 42nd St' },
  I_2_2: { lat: 40.7553, lng: -73.9769, label: 'Park Ave & 42nd St (Grand Central Terminal)' },
  I_3_2: { lat: 40.7563, lng: -73.9744, label: 'Lexington Ave & 42nd St (Chrysler Building)' },
  I_4_2: { lat: 40.7573, lng: -73.9719, label: '3rd Ave & 42nd St (Metro Hospital Corridor)' },

  I_0_3: { lat: 40.7556, lng: -73.9803, label: '5th Ave & 46th St' },
  I_1_3: { lat: 40.7567, lng: -73.9776, label: 'Madison Ave & 46th St' },
  I_2_3: { lat: 40.7577, lng: -73.9751, label: 'Park Ave & 46th St' },
  I_3_3: { lat: 40.7587, lng: -73.9726, label: 'Lexington Ave & 46th St' },
  I_4_3: { lat: 40.7597, lng: -73.9701, label: '3rd Ave & 46th St' },

  I_0_4: { lat: 40.7580, lng: -73.9785, label: '5th Ave & 50th St (St. Patrick Cathedral)' },
  I_1_4: { lat: 40.7591, lng: -73.9758, label: 'Madison Ave & 50th St (NYPD Precinct)' },
  I_2_4: { lat: 40.7601, lng: -73.9733, label: 'Park Ave & 50th St' },
  I_3_4: { lat: 40.7611, lng: -73.9708, label: 'Lexington Ave & 50th St' },
  I_4_4: { lat: 40.7621, lng: -73.9683, label: '3rd Ave & 50th St' },
};

// Component to hook into Google Maps Traffic Layer
function GoogleLiveTrafficLayer({ enabled }: { enabled: boolean }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    if (enabled) {
      trafficLayer.setMap(map);
    } else {
      trafficLayer.setMap(null);
    }

    return () => {
      trafficLayer.setMap(null);
    };
  }, [map, enabled]);

  return null;
}

// Component to render Green Wave Preemption Corridor Polylines on Google Maps
function GreenWavePolyline({
  route,
  isPreempting,
}: {
  route: string[];
  isPreempting: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map || route.length < 2) return;

    const pathCoords = route
      .map((nodeId) => REAL_WORLD_COORDS[nodeId])
      .filter(Boolean)
      .map((c) => ({ lat: c.lat, lng: c.lng }));

    if (pathCoords.length < 2) return;

    // Glowing Neon Green Wave Polyline
    const polyline = new google.maps.Polyline({
      path: pathCoords,
      geodesic: true,
      strokeColor: isPreempting ? '#00e676' : '#38bdf8',
      strokeOpacity: 0.9,
      strokeWeight: isPreempting ? 8 : 4,
      map,
    });

    return () => {
      polyline.setMap(null);
    };
  }, [map, route, isPreempting]);

  return null;
}

interface GoogleRealTimeMapProps {
  intersections: Map<string, IntersectionSignal>;
  roadSegments: Map<string, RoadSegment>;
  vehicles: EmergencyVehicle[];
  selectedVehicleId: string | null;
  onSelectVehicle: (id: string | null) => void;
  selectedIntersectionId: string | null;
  onSelectIntersection: (id: string | null) => void;
  isSignalFlowActive: boolean;
  activeConflictIntersectionIds: string[];
}

export const GoogleRealTimeMap: React.FC<GoogleRealTimeMapProps> = ({
  intersections,
  vehicles,
  selectedVehicleId,
  onSelectVehicle,
  selectedIntersectionId,
  onSelectIntersection,
  isSignalFlowActive,
  activeConflictIntersectionIds,
}) => {
  const [showTrafficLayer, setShowTrafficLayer] = useState<boolean>(true);
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');

  // Interpolate real-world lat/lng for each emergency vehicle along its active street segment
  const getVehicleLatLng = (veh: EmergencyVehicle): { lat: number; lng: number } => {
    const fromCoord = REAL_WORLD_COORDS[veh.currentIntersectionId] || REAL_WORLD_COORDS.I_0_2;
    const toCoord = veh.nextIntersectionId
      ? REAL_WORLD_COORDS[veh.nextIntersectionId] || fromCoord
      : fromCoord;

    const lat = fromCoord.lat + (toCoord.lat - fromCoord.lat) * veh.progressOnSegment;
    const lng = fromCoord.lng + (toCoord.lng - fromCoord.lng) * veh.progressOnSegment;

    return { lat, lng };
  };

  return (
    <div className="relative bg-slate-950 rounded-xl border border-slate-800 shadow-2xl overflow-hidden flex flex-col h-[740px]">
      {/* Google Maps Header Controls */}
      <div className="px-4 py-3 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-sm font-bold text-white tracking-tight">
              Real-World Google Maps & Live Traffic
            </span>
          </div>
          <span className="text-slate-600 hidden md:inline">·</span>
          <span className="text-xs text-slate-400 font-mono hidden md:inline">
            Midtown Manhattan Transit Corridor (Grand Central / Bellevue Trauma)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Live Google Traffic Layer Toggle */}
          <button
            onClick={() => setShowTrafficLayer(!showTrafficLayer)}
            className={`px-3 py-1 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-colors ${
              showTrafficLayer
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Google Live Traffic Layer {showTrafficLayer ? 'ON' : 'OFF'}</span>
          </button>

          {/* Map Type Switcher */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setMapType('roadmap')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapType === 'roadmap' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Street
            </button>
            <button
              onClick={() => setMapType('satellite')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapType === 'satellite' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Satellite
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                mapType === 'hybrid' ? 'bg-slate-800 text-cyan-300 font-bold' : 'text-slate-400'
              }`}
            >
              Hybrid
            </button>
          </div>
        </div>
      </div>

      {/* Main Google Maps Viewport */}
      <div className="w-full flex-1 relative bg-slate-900">
        <APIProvider apiKey={API_KEY}>
          <Map
            mapId="DEMO_MAP_ID"
            internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
            defaultCenter={{ lat: 40.7553, lng: -73.9769 }} // Centered at Grand Central Terminal (I_2_2)
            defaultZoom={15}
            mapTypeId={mapType}
            gestureHandling="greedy"
            disableDefaultUI={false}
            className="w-full h-full"
          >
            {/* Live Google Traffic Layer */}
            <GoogleLiveTrafficLayer enabled={showTrafficLayer} />

            {/* Glowing Green Wave Polyline Corridors for Prioritized Vehicles */}
            {isSignalFlowActive &&
              vehicles
                .filter((v) => v.scoreExplanation.priorityLevel === 'P1' || v.isPreempting)
                .map((v) => (
                  <GreenWavePolyline key={`wave_${v.id}`} route={v.route} isPreempting={true} />
                ))}

            {/* Real-World Intersection Signal Markers */}
            {Array.from(intersections.values()).map((inter) => {
              const geo = REAL_WORLD_COORDS[inter.id];
              if (!geo) return null;

              const isPreempted = inter.isPreempted && isSignalFlowActive;
              const hasConflict = activeConflictIntersectionIds.includes(inter.id);
              const isNSGreen = inter.activePhase === 'NS_GREEN';
              const isEWGreen = inter.activePhase === 'EW_GREEN';

              return (
                <AdvancedMarker
                  key={`marker_${inter.id}`}
                  position={{ lat: geo.lat, lng: geo.lng }}
                  onClick={() => onSelectIntersection(inter.id)}
                  title={geo.label}
                >
                  <div className="relative group cursor-pointer flex flex-col items-center">
                    {/* Preemption Halo */}
                    {isPreempted && (
                      <div className="absolute -inset-2 rounded-full border-2 border-emerald-400 animate-ping opacity-75" />
                    )}

                    {/* Conflict Halo */}
                    {hasConflict && (
                      <div className="absolute -inset-2.5 rounded-full border-2 border-amber-400 animate-pulse" />
                    )}

                    {/* Signal Node Disc */}
                    <div
                      className={`w-5 h-5 rounded-full border-2 shadow-lg flex items-center justify-center transition-all ${
                        isPreempted
                          ? 'bg-emerald-500 border-white scale-110 shadow-emerald-500/50'
                          : hasConflict
                          ? 'bg-amber-500 border-white scale-110 shadow-amber-500/50'
                          : 'bg-slate-900 border-slate-600'
                      }`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          isNSGreen || isEWGreen ? 'bg-emerald-300' : 'bg-rose-400'
                        }`}
                      />
                    </div>

                    {/* Hover Tooltip */}
                    <div className="absolute bottom-6 hidden group-hover:flex flex-col items-center pointer-events-none z-30">
                      <div className="bg-slate-950 text-white text-[10px] font-mono py-1 px-2 rounded shadow-xl border border-slate-700 whitespace-nowrap">
                        {geo.label}
                        <div className="text-emerald-400 font-bold">
                          {isPreempted ? 'PREEMPTION ACTIVE' : `PHASE: ${inter.activePhase}`}
                        </div>
                      </div>
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}

            {/* Emergency Vehicles with Custom AdvancedMarkers */}
            {vehicles.map((veh) => {
              const pos = getVehicleLatLng(veh);
              const isP1 = veh.scoreExplanation.priorityLevel === 'P1';
              const isSelected = selectedVehicleId === veh.id;

              return (
                <AdvancedMarker
                  key={`veh_${veh.id}`}
                  position={pos}
                  onClick={() => onSelectVehicle(veh.id)}
                  title={`${veh.callSign} (Score ${veh.scoreExplanation.totalScore})`}
                >
                  <div className="relative flex flex-col items-center cursor-pointer -translate-y-4">
                    {/* Glowing P1 Aura */}
                    {isP1 && (
                      <div
                        className="absolute -inset-3 rounded-full opacity-60 animate-ping pointer-events-none"
                        style={{ backgroundColor: veh.color }}
                      />
                    )}

                    {/* Vehicle Callsign Tag */}
                    <div className="mb-1 bg-slate-950/90 text-white text-[10px] font-mono font-bold py-0.5 px-2 rounded-full border border-slate-700 shadow-xl flex items-center gap-1.5 whitespace-nowrap">
                      <span>{veh.callSign.split(' ')[0]}</span>
                      <span
                        className="px-1 py-0.2 rounded text-[9px]"
                        style={{
                          backgroundColor: `${veh.color}33`,
                          color: veh.color,
                        }}
                      >
                        {veh.scoreExplanation.priorityLevel} · {veh.scoreExplanation.totalScore}
                      </span>
                    </div>

                    {/* Vehicle Icon Badge */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-2xl border-2 transition-transform ${
                        isSelected ? 'scale-125 border-white ring-4 ring-cyan-400/50' : 'border-white/80'
                      }`}
                      style={{ backgroundColor: veh.color }}
                    >
                      {veh.agency === 'EMS' && <Activity className="w-5 h-5" />}
                      {veh.agency === 'FIRE' && <Flame className="w-5 h-5" />}
                      {veh.agency === 'POLICE' && <Shield className="w-5 h-5" />}
                    </div>
                  </div>
                </AdvancedMarker>
              );
            })}
          </Map>
        </APIProvider>
      </div>

      {/* Footer Legend */}
      <div className="px-4 py-2.5 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-200">Google Maps Live Feed:</span>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> EMS Ambulance
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Fire Engine
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Police Unit
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Green Wave Preemption
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Google Maps Platform · @vis.gl/react-google-maps · Live Traffic Layer
        </div>
      </div>
    </div>
  );
};
