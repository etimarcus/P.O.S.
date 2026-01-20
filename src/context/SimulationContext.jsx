/**
 * SIMULATION CONTEXT (Simplified for POS)
 * Provides default values for CellView rendering
 * Full version lives in Rubania project
 */

import { createContext, useContext, useMemo } from 'react'

const SimulationContext = createContext(null)

// Simplified defaults for cell visualization
const DEFAULTS = {
  // Spatial
  numGuilds: 10,
  guildSpacing: 700,
  innerAreaHa: 600,
  numCompounds: 8,
  compoundSpacing: 25,
  greenhouseLength: 22,
  greenhouseWidth: 18,
  polygonSides: 6,
  domeDiameter: 6,

  // School
  schoolPolygonSides: 6,
  schoolBuildingRadius: 30,
  schoolWaterDistance: 20,
  schoolWaterRingWidth: 5,

  // Paths
  bambooPathWidth: 5.5,
  canalPathWidth: 6,
  bambooOuterPathWidth: 6,
  radialPathWidth: 6,
  outerPondPathWidth: 3,

  // Urban
  showUrbanSector: true,
  urbanSectorAngle: 25,
  urbanSectorAngleOuter: 50,
  urbanPondInnerDiameter: 100,
  urbanPondInnerDepth: 3,
  urbanPondOuterDiameter: 100,
  urbanPondOuterDepth: 3,
  urbanStreets: 3,
  urbanStreetsOuter: 9,
  urbanCrossStreetsInner: 5,
  urbanCrossStreetsOuter: 3,
  urbanStreetWidth: 4,
  centralCanalWidth: 6,

  // Water
  perimeterCanalWidth: 30,
  perimeterCanalDepth: 5,
  guildCanalWidth: 2,
  interGuildCanalWidth: 2,
  guildMoatOffset: 5,
  guildMoatWidth: 3,
  guildMoatDepth: 2,

  // Grazing
  showGrazingCells: true,
  occupationDays: 2,
  recoveryDays: 45,

  // Trees
  blackLocustTrees: 19800,
  oakAshTrees: 4560,
  walnutTrees: 1400,
}

// Simplified system calculations
function calculateSystems(state) {
  const numGuilds = state.numGuilds ?? 10
  const numCompounds = state.numCompounds ?? 8
  const peoplePerDome = 2
  const polygonSides = state.polygonSides ?? 6

  const peoplePerCompound = polygonSides * peoplePerDome
  const peoplePerGuild = numCompounds * peoplePerCompound
  const totalPeople = numGuilds * peoplePerGuild

  // Guild geometry
  const guildDiameter = 150
  const guildRingRadius = 60
  const compoundRadius = 15

  return {
    spatial: {
      numGuilds,
      numCompounds,
      totalPeople,
      peoplePerGuild,
      guildDiameter,
      guildRingRadius,
      compoundRadius,
    },
    grazing: {
      numGrazingPaddocks: 24,
      areaPerPaddockHa: 1,
    },
    vegetation: {
      numFruitTrees: 5000,
      orchardZoneAreaHa: 50,
    },
    bamboo: {
      areaTotal: 80,
    },
    cattle: {
      pastureHa: 100,
    },
    dairy: {
      pastureHa: 50,
    },
    school: {
      numStudents: 200,
    },
  }
}

export function SimulationProvider({ children }) {
  const state = DEFAULTS
  const systems = useMemo(() => calculateSystems(state), [state])

  const value = useMemo(() => ({
    state,
    systems,
    totalPeople: systems.spatial?.totalPeople ?? 0,
    numGuilds: systems.spatial?.numGuilds ?? 8,
  }), [state, systems])

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    // Return default values if not in provider (graceful fallback)
    return {
      state: DEFAULTS,
      systems: calculateSystems(DEFAULTS),
      totalPeople: 0,
      numGuilds: 10,
    }
  }
  return context
}

export default SimulationContext
