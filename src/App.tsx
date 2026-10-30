/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Agency,
  ConflictResolutionOutcome,
  EmergencyVehicle,
  Incident,
  IncidentCategory,
  IntersectionSignal,
  RoadSegment,
  SimulationMetrics,
} from './types/traffic';
import {
  arbitrateIntersectionConflict,
  createInitialIntersections,
  createInitialRoadSegments,
  createRandomIncident,
  createScenarioCardiacVsFire,
  createScenarioTripleThreat,
  generateInitialCivilianCars,
  CivilianCar,
  parseIntersectionId,
  getIntersectionId,
} from './utils/simulation';
import { computeUrgencyScore, INCIDENT_TEMPLATES } from './utils/scoring';
import { soundFX } from './utils/audio';
import { TopNav } from './components/TopNav';
import { GoogleRealTimeMap } from './components/GoogleRealTimeMap';
import { MapSimulator } from './components/MapSimulator';
import { MapSimulator3D } from './components/MapSimulator3D';
import { LivePrioritizer } from './components/LivePrioritizer';
import { ConflictDesk } from './components/ConflictDesk';
import { IncidentQueuePanel } from './components/IncidentQueuePanel';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { ScenarioLauncher } from './components/ScenarioLauncher';
import { VehicleInspector } from './components/VehicleInspector';
import {
  Radio,
  Activity,
  Flame,
  Shield,
  Clock,
  Sparkles,
  TrendingDown,
  Layers,
  Cpu,
  Zap,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function App() {
  // Navigation tab
  const [currentTab, setCurrentTab] = useState<'simulator' | 'conflicts' | 'queue' | 'analytics' | 'scenarios'>(
    'simulator'
  );

  // Simulation controls
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [isSignalFlowActive, setIsSignalFlowActive] = useState<boolean>(true);
  const [showCongestionOverlay, setShowCongestionOverlay] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'google' | '3d' | '2d'>('google');
  const [quotaExceeded, setQuotaExceeded] = useState<boolean>(false);

  useEffect(() => {
    const handleQuota = () => setQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', handleQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', handleQuota);
  }, []);

  // Simulation state
  const [intersections, setIntersections] = useState<Map<string, IntersectionSignal>>(() =>
    createInitialIntersections()
  );
  const [roadSegments, setRoadSegments] = useState<Map<string, RoadSegment>>(() =>
    createInitialRoadSegments()
  );
  const [vehicles, setVehicles] = useState<EmergencyVehicle[]>(() => {
    const scenario = createScenarioCardiacVsFire();
    return scenario.vehicles;
  });
  const [civilianCars, setCivilianCars] = useState<CivilianCar[]>(() => generateInitialCivilianCars());
  const [conflicts, setConflicts] = useState<ConflictResolutionOutcome[]>([]);
  const [activeConflictIntersectionIds, setActiveConflictIntersectionIds] = useState<string[]>(['I_2_2']);

  // Selection
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedIntersectionId, setSelectedIntersectionId] = useState<string | null>(null);

  // Metrics
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    totalIncidentsHandled: 12,
    activeIncidentsCount: 2,
    avgResponseTimeWithSignalFlowSec: 248, // ~4.1 min
    avgResponseTimeBaselineSec: 418, // ~6.9 min
    totalDelaySavedSeconds: 2040, // 34 min
    p1ComplianceRate: 95.2,
    p2ComplianceRate: 91.8,
    conflictsResolvedCount: 7,
    preemptionActivationsCount: 28,
    networkCongestionAvg: 38,
    civilianImpactScore: 94,
  });

  // Track initial conflict generation for the Cardiac vs Fire demo
  const initialConflictFiredRef = useRef<boolean>(false);

  // Simulation Loop Tick
  useEffect(() => {
    if (!isRunning) return;

    const intervalMs = Math.max(100, Math.floor(600 / simSpeed));

    const timer = setInterval(() => {
      // 1. Update Traffic Signals
      setIntersections((prevIntersections) => {
        const next = new Map(prevIntersections);

        next.forEach((inter, id) => {
          // If preempted by SignalFlow, keep green for preempted direction
          if (isSignalFlowActive && inter.isPreempted && inter.preemptedDirection) {
            const desiredPhase = inter.preemptedDirection === 'NS' ? 'NS_GREEN' : 'EW_GREEN';
            if (inter.activePhase !== desiredPhase) {
              // Quick safety transition
              next.set(id, {
                ...inter,
                activePhase: desiredPhase,
                phaseTimeElapsed: 0,
              });
            }
            return;
          }

          // Normal cycling
          const newElapsed = inter.phaseTimeElapsed + 1;
          let newPhase = inter.activePhase;

          if (inter.activePhase === 'NS_GREEN' && newElapsed >= inter.normalPhaseDuration) {
            newPhase = 'NS_YELLOW';
          } else if (inter.activePhase === 'NS_YELLOW' && newElapsed >= inter.normalPhaseDuration + inter.yellowDuration) {
            newPhase = 'EW_GREEN';
          } else if (inter.activePhase === 'EW_GREEN' && newElapsed >= inter.normalPhaseDuration) {
            newPhase = 'EW_YELLOW';
          } else if (inter.activePhase === 'EW_YELLOW' && newElapsed >= inter.normalPhaseDuration + inter.yellowDuration) {
            newPhase = 'NS_GREEN';
          }

          const resetElapsed =
            newPhase !== inter.activePhase ? 0 : newElapsed;

          next.set(id, {
            ...inter,
            activePhase: newPhase,
            phaseTimeElapsed: resetElapsed,
          });
        });

        return next;
      });

      // 2. Update Civilian Cars
      setCivilianCars((prevCars) =>
        prevCars.map((car) => {
          let newProgress = car.progress + car.speed * 0.15 * simSpeed;
          if (newProgress >= 1) newProgress = 0;
          return { ...car, progress: newProgress };
        })
      );

      // 3. Update Emergency Vehicles and Conflict Arbitration
      setVehicles((prevVehicles) => {
        if (prevVehicles.length === 0) return prevVehicles;

        // Group vehicles by their upcoming intersection
        const approachingMap = new Map<string, EmergencyVehicle[]>();

        prevVehicles.forEach((veh) => {
          if (veh.nextIntersectionId && veh.progressOnSegment >= 0.35) {
            const list = approachingMap.get(veh.nextIntersectionId) || [];
            list.push(veh);
            approachingMap.set(veh.nextIntersectionId, list);
          }
        });

        const activeConflicts: string[] = [];

        // Check for intersection conflicts
        approachingMap.forEach((reqVehicles, interId) => {
          if (reqVehicles.length >= 2) {
            activeConflicts.push(interId);

            // Execute conflict arbitration
            setIntersections((prevInter) => {
              const currentInter = prevInter.get(interId);
              if (!currentInter) return prevInter;

              try {
                const outcome = arbitrateIntersectionConflict(currentInter, reqVehicles);

                // Log conflict if not already logged recently
                setConflicts((prevConfs) => {
                  if (prevConfs.length > 0 && prevConfs[0].intersectionId === interId && Date.now() - prevConfs[0].timestamp < 6000) {
                    return prevConfs;
                  }
                  soundFX.playConflictAlert();
                  return [outcome, ...prevConfs.slice(0, 19)];
                });

                // Find winner vehicle direction
                const winner = reqVehicles.find((v) => v.id === outcome.winnerVehicleId) || reqVehicles[0];
                const fromCoord = parseIntersectionId(winner.currentIntersectionId);
                const toCoord = parseIntersectionId(interId);
                const isNS = fromCoord.x === toCoord.x;

                const updated = new Map(prevInter);
                updated.set(interId, {
                  ...currentInter,
                  isPreempted: isSignalFlowActive,
                  preemptedForVehicleId: winner.id,
                  preemptedDirection: isNS ? 'NS' : 'EW',
                });
                return updated;
              } catch {
                return prevInter;
              }
            });
          } else if (reqVehicles.length === 1 && isSignalFlowActive) {
            // Single vehicle preemption
            const singleVeh = reqVehicles[0];
            const fromCoord = parseIntersectionId(singleVeh.currentIntersectionId);
            const toCoord = parseIntersectionId(interId);
            const isNS = fromCoord.x === toCoord.x;

            setIntersections((prevInter) => {
              const currentInter = prevInter.get(interId);
              if (!currentInter) return prevInter;
              const updated = new Map(prevInter);
              updated.set(interId, {
                ...currentInter,
                isPreempted: true,
                preemptedForVehicleId: singleVeh.id,
                preemptedDirection: isNS ? 'NS' : 'EW',
              });
              return updated;
            });
          }
        });

        setActiveConflictIntersectionIds(activeConflicts);

        // Move vehicles along their segments
        const updatedVehicles = prevVehicles.map((veh) => {
          const nextInter = veh.nextIntersectionId ? intersections.get(veh.nextIntersectionId) : null;
          let canMove = true;

          // If baseline mode is active (NO SignalFlow), vehicle must wait for RED signals!
          if (!isSignalFlowActive && nextInter && veh.progressOnSegment >= 0.85) {
            const fromCoord = parseIntersectionId(veh.currentIntersectionId);
            const toCoord = parseIntersectionId(nextInter.id);
            const isNS = fromCoord.x === toCoord.x;

            const isGreen =
              (isNS && nextInter.activePhase === 'NS_GREEN') ||
              (!isNS && nextInter.activePhase === 'EW_GREEN');

            if (!isGreen) {
              canMove = false; // Stopped at red light!
            }
          }

          let newProgress = veh.progressOnSegment;
          let newRouteIndex = veh.routeIndex;
          let newCurrentId = veh.currentIntersectionId;
          let newNextId = veh.nextIntersectionId;

          if (canMove) {
            newProgress += veh.speed * 0.18 * simSpeed;
          }

          // Arrived at intersection
          if (newProgress >= 1.0) {
            newProgress = 0.05;
            newRouteIndex += 1;

            if (newRouteIndex < veh.route.length - 1) {
              newCurrentId = veh.route[newRouteIndex];
              newNextId = veh.route[newRouteIndex + 1];

              // Release previous intersection preemption
              if (veh.nextIntersectionId) {
                setIntersections((prev) => {
                  const inter = prev.get(veh.nextIntersectionId!);
                  if (inter && inter.preemptedForVehicleId === veh.id) {
                    const next = new Map(prev);
                    next.set(inter.id, {
                      ...inter,
                      isPreempted: false,
                      preemptedForVehicleId: undefined,
                      preemptedDirection: undefined,
                    });
                    return next;
                  }
                  return prev;
                });
              }
            } else {
              // Reached final destination!
              newProgress = 1.0;
            }
          }

          // Recalculate ETA and Urgency Score
          const remainingIntersections = Math.max(0, veh.route.length - newRouteIndex - 1);
          const remainingMeters = remainingIntersections * 400 + (1 - newProgress) * 400;

          const updatedScore = computeUrgencyScore({
            agency: veh.agency,
            category: veh.incidentId.includes('EMS') ? 'CARDIAC_ARREST' : veh.incidentId.includes('FIRE') ? 'STRUCTURE_FIRE_ALARM_3' : 'OFFICER_ASSISTANCE',
            severity: 4,
            timeElapsedSec: veh.timeElapsedSec + 1,
            responseTimeTargetSec: 360,
            distanceRemainingMeters: remainingMeters,
            routeAverageCongestion: 0.5,
          });

          const currentEtaSec = Math.max(5, Math.round(remainingMeters / 14));
          const currentBaselineEtaSec = Math.max(10, Math.round(remainingMeters / 7.5));

          return {
            ...veh,
            progressOnSegment: newProgress,
            routeIndex: newRouteIndex,
            currentIntersectionId: newCurrentId,
            nextIntersectionId: newNextId,
            distanceRemainingMeters: remainingMeters,
            timeElapsedSec: veh.timeElapsedSec + 1,
            etaSec: currentEtaSec,
            baselineEtaSec: currentBaselineEtaSec,
            scoreExplanation: updatedScore,
            isPreempting: isSignalFlowActive && updatedScore.priorityLevel === 'P1',
          };
        });

        // Filter out completed vehicles and replace with new ones to keep simulation alive
        const activeUnits = updatedVehicles.filter(
          (v) => v.routeIndex < v.route.length - 1 || v.progressOnSegment < 1.0
        );

        if (activeUnits.length < updatedVehicles.length) {
          // Log completion
          setMetrics((m) => ({
            ...m,
            totalIncidentsHandled: m.totalIncidentsHandled + 1,
            totalDelaySavedSeconds: m.totalDelaySavedSeconds + 85,
          }));
        }

        return activeUnits;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isRunning, simSpeed, isSignalFlowActive, intersections]);

  // Initial trigger for the conflict scenario on mount so the Conflict Desk is populated immediately
  useEffect(() => {
    if (!initialConflictFiredRef.current) {
      initialConflictFiredRef.current = true;
      const initialInter = intersections.get('I_2_2');
      if (initialInter && vehicles.length >= 2) {
        try {
          const outcome = arbitrateIntersectionConflict(initialInter, vehicles.slice(0, 2));
          setConflicts([outcome]);
        } catch {
          // fallback
        }
      }
    }
  }, [intersections, vehicles]);

  // Actions
  const handleReset = () => {
    setIntersections(createInitialIntersections());
    setRoadSegments(createInitialRoadSegments());
    const scenario = createScenarioCardiacVsFire();
    setVehicles(scenario.vehicles);
    setCivilianCars(generateInitialCivilianCars());
    setActiveConflictIntersectionIds(['I_2_2']);
    setSelectedVehicleId(null);
    setSelectedIntersectionId(null);

    // Seed conflict
    const inter = createInitialIntersections().get('I_2_2');
    if (inter && scenario.vehicles.length >= 2) {
      const outcome = arbitrateIntersectionConflict(inter, scenario.vehicles.slice(0, 2));
      setConflicts([outcome]);
    }
  };

  const handleLoadScenarioCardiacVsFire = () => {
    const scenario = createScenarioCardiacVsFire();
    setVehicles(scenario.vehicles);
    setActiveConflictIntersectionIds(['I_2_2']);
    const inter = intersections.get('I_2_2');
    if (inter && scenario.vehicles.length >= 2) {
      const outcome = arbitrateIntersectionConflict(inter, scenario.vehicles);
      setConflicts([outcome, ...conflicts]);
    }
    setCurrentTab('conflicts');
  };

  const handleLoadScenarioTripleThreat = () => {
    const scenario = createScenarioTripleThreat();
    setVehicles(scenario.vehicles);
    setActiveConflictIntersectionIds(['I_2_2']);
    setCurrentTab('simulator');
  };

  const handleLoadScenarioRushHour = () => {
    setRoadSegments((prev) => {
      const next = new Map(prev);
      next.forEach((road, id) => {
        next.set(id, { ...road, congestion: Math.min(0.95, road.congestion + 0.35) });
      });
      return next;
    });
    setShowCongestionOverlay(true);
    setCurrentTab('simulator');
  };

  const handleSpawnRandomIncident = () => {
    const { vehicle } = createRandomIncident();
    setVehicles((v) => [vehicle, ...v]);
  };

  const handleSpawnCustomIncident = (agency: Agency, category: IncidentCategory) => {
    const { vehicle } = createRandomIncident();
    const tpl = INCIDENT_TEMPLATES[category];
    const customized: EmergencyVehicle = {
      ...vehicle,
      agency,
      callSign: `${agency} Unit-${Math.floor(Math.random() * 800 + 100)}`,
      color: agency === 'EMS' ? '#06b6d4' : agency === 'FIRE' ? '#f43f5e' : '#3b82f6',
      scoreExplanation: computeUrgencyScore({
        agency,
        category,
        severity: tpl.baseSeverity as 1 | 2 | 3 | 4,
        timeElapsedSec: 0,
        responseTimeTargetSec: tpl.targetTimeSec,
        distanceRemainingMeters: vehicle.distanceRemainingMeters,
        routeAverageCongestion: 0.4,
      }),
    };
    setVehicles((v) => [customized, ...v]);
    setCurrentTab('simulator');
  };

  const inspectedVehicle = vehicles.find((v) => v.id === selectedVehicleId) || null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Google Maps Platform Quota Defense Banner */}
      {quotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Top Bar Navigation */}
      <TopNav
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        isRunning={isRunning}
        onToggleRunning={() => setIsRunning(!isRunning)}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        onReset={handleReset}
        isSignalFlowActive={isSignalFlowActive}
        onToggleSignalFlow={() => setIsSignalFlowActive(!isSignalFlowActive)}
        activeConflictCount={conflicts.length}
        activeVehicleCount={vehicles.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* TAB 1: Live Simulator */}
        {currentTab === 'simulator' && (
          <div className="space-y-6">
            {/* Top Live Priority Command Ribbon */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-400">
                    Live Priority Wave:
                  </span>
                </div>
                {vehicles.length > 0 ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">
                      {[...vehicles].sort((a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore)[0]?.callSign}
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="font-mono text-emerald-400 font-semibold">
                      Score {[...vehicles].sort((a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore)[0]?.scoreExplanation.totalScore} ({[...vehicles].sort((a, b) => b.scoreExplanation.totalScore - a.scoreExplanation.totalScore)[0]?.scoreExplanation.priorityLevel})
                    </span>
                    <span className="text-slate-500">·</span>
                    <span className="text-slate-300">
                      Corridor Signals Held Green to Destination
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">Monitoring traffic grid...</span>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {/* Real Google Map vs 3D City vs 2D View Switch */}
                <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs">
                  <button
                    onClick={() => setViewMode('google')}
                    className={`px-3 py-1 rounded font-semibold transition-colors flex items-center gap-1.5 ${
                      viewMode === 'google'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    <span>Real Google Map (Live Traffic)</span>
                  </button>
                  <button
                    onClick={() => setViewMode('3d')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      viewMode === '3d'
                        ? 'bg-cyan-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    3D City
                  </button>
                  <button
                    onClick={() => setViewMode('2d')}
                    className={`px-2.5 py-1 rounded font-semibold transition-colors ${
                      viewMode === '2d'
                        ? 'bg-slate-800 text-cyan-300 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    2D Thermal
                  </button>
                </div>

                <button
                  onClick={handleLoadScenarioCardiacVsFire}
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/10"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Simulate Conflict</span>
                </button>
                <button
                  onClick={handleSpawnRandomIncident}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <span>+ Dispatch Unit</span>
                </button>
              </div>
            </div>

            {/* TOP 2-COLUMN VIEW: Live Map (8 cols) + Live Prioritizer (4 cols) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left / Center: Interactive Live Map (Google Maps, 3D City, or 2D) */}
              <div className="lg:col-span-8">
                {viewMode === 'google' ? (
                  <GoogleRealTimeMap
                    intersections={intersections}
                    roadSegments={roadSegments}
                    vehicles={vehicles}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={setSelectedVehicleId}
                    selectedIntersectionId={selectedIntersectionId}
                    onSelectIntersection={setSelectedIntersectionId}
                    isSignalFlowActive={isSignalFlowActive}
                    activeConflictIntersectionIds={activeConflictIntersectionIds}
                  />
                ) : viewMode === '3d' ? (
                  <MapSimulator3D
                    intersections={intersections}
                    roadSegments={roadSegments}
                    vehicles={vehicles}
                    civilianCars={civilianCars}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={setSelectedVehicleId}
                    selectedIntersectionId={selectedIntersectionId}
                    onSelectIntersection={setSelectedIntersectionId}
                    showCongestionOverlay={showCongestionOverlay}
                    onToggleCongestion={() => setShowCongestionOverlay(!showCongestionOverlay)}
                    isSignalFlowActive={isSignalFlowActive}
                    activeConflictIntersectionIds={activeConflictIntersectionIds}
                  />
                ) : (
                  <MapSimulator
                    intersections={intersections}
                    roadSegments={roadSegments}
                    vehicles={vehicles}
                    civilianCars={civilianCars}
                    selectedVehicleId={selectedVehicleId}
                    onSelectVehicle={setSelectedVehicleId}
                    selectedIntersectionId={selectedIntersectionId}
                    onSelectIntersection={setSelectedIntersectionId}
                    showCongestionOverlay={showCongestionOverlay}
                    onToggleCongestion={() => setShowCongestionOverlay(!showCongestionOverlay)}
                    isSignalFlowActive={isSignalFlowActive}
                    activeConflictIntersectionIds={activeConflictIntersectionIds}
                  />
                )}
              </div>

              {/* Right / Alongside: Autonomous Live Prioritizer */}
              <div className="lg:col-span-4">
                <LivePrioritizer
                  vehicles={vehicles}
                  intersections={intersections}
                  conflicts={conflicts}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  onTriggerConflictDemo={handleLoadScenarioCardiacVsFire}
                  isSignalFlowActive={isSignalFlowActive}
                  onOpenConflictDesk={() => setCurrentTab('conflicts')}
                  onSpawnIncident={handleSpawnRandomIncident}
                />
              </div>
            </div>

            {/* Compact Mini-Queue & Active Fleet Strip */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Active Emergency Fleet Tracking</span>
                  <span className="text-xs font-mono font-normal text-slate-400">
                    ({vehicles.length} units in transit)
                  </span>
                </h2>
                <button
                  onClick={() => setCurrentTab('queue')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
                >
                  View Full Priority Queue →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {vehicles.map((veh) => (
                  <div
                    key={veh.id}
                    onClick={() => setSelectedVehicleId(veh.id)}
                    className="bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800/80 rounded-lg p-3.5 cursor-pointer transition-all flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 mt-0.5"
                        style={{ backgroundColor: veh.color }}
                      >
                        {veh.agency === 'EMS' && <Activity className="w-4 h-4" />}
                        {veh.agency === 'FIRE' && <Flame className="w-4 h-4" />}
                        {veh.agency === 'POLICE' && <Shield className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white text-xs">{veh.callSign}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          ETA:{' '}
                          <span className="font-mono font-bold text-emerald-400">
                            {Math.floor(veh.etaSec / 60)}m {veh.etaSec % 60}s
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                          veh.scoreExplanation.priorityLevel === 'P1'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {veh.scoreExplanation.priorityLevel} · {veh.scoreExplanation.totalScore}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Conflict Desk */}
        {currentTab === 'conflicts' && (
          <ConflictDesk
            conflicts={conflicts}
            vehicles={vehicles}
            onTriggerConflictDemo={handleLoadScenarioCardiacVsFire}
            onSelectVehicle={setSelectedVehicleId}
          />
        )}

        {/* TAB 3: Priority Queue */}
        {currentTab === 'queue' && (
          <IncidentQueuePanel
            vehicles={vehicles}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            onSpawnIncident={handleSpawnRandomIncident}
          />
        )}

        {/* TAB 4: Performance & Analytics */}
        {currentTab === 'analytics' && (
          <AnalyticsPanel metrics={metrics} isSignalFlowActive={isSignalFlowActive} />
        )}

        {/* TAB 5: Demo Scenarios */}
        {currentTab === 'scenarios' && (
          <ScenarioLauncher
            onLoadScenarioCardiacVsFire={handleLoadScenarioCardiacVsFire}
            onLoadScenarioTripleThreat={handleLoadScenarioTripleThreat}
            onLoadScenarioRushHour={handleLoadScenarioRushHour}
            onSpawnCustomIncident={handleSpawnCustomIncident}
          />
        )}
      </main>

      {/* Vehicle Inspector Modal Drawer */}
      {inspectedVehicle && (
        <VehicleInspector
          vehicle={inspectedVehicle}
          intersections={intersections}
          onClose={() => setSelectedVehicleId(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 px-6 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-400">SignalFlow Orchestrator</span>
          <span aria-hidden="true">·</span>
          <span>Smart Emergency Traffic Signal Optimizer</span>
        </div>
        <div>
          TCS iON AI Hackathon Prototype · Built with React, Vite & Tailwind CSS
        </div>
      </footer>
    </div>
  );
}
