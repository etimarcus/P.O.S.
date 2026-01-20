/**
 * CELL VIEW
 * Aerial view of Rubania cell
 * 
 * Structure (outside to center):
 * 1. Bamboo ring - energy plantation
 * 2. Canal perimetral - water reservoir
 * 3. Productive zone - orchards + grazing cells (from canal to guilds)
 * 4. Guild ring - compounds arranged around kernels
 *    - Between guilds: grazing cells intercalated
 *    - Inside guilds: vegetable gardens + legume trees (not orchards)
 * 5. Orchards - from guilds to school
 * 6. School + water ring - center
 */

import { useRef, useEffect, useState, useCallback } from 'react'
import { useSimulation } from '../../context/SimulationContext'

export function CellView({ onNavigate }) {
  const canvasRef = useRef(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })
  const [hoverTarget, setHoverTarget] = useState(null) // { type: 'guild'|'school'|'compound', index?, guildIndex? }
  const [zoomAnimation, setZoomAnimation] = useState(null) // { progress: 0-1, startTime }
  const sim = useSimulation()

  // Store geometry for hit testing
  const geometryRef = useRef({
    centerX: 0,
    centerY: 0,
    scale: 1,
    guildCenterR: 0,
    guildR: 0,
    guildRingR: 0,
    compR: 0,
    schoolR: 0,
    schoolWaterInnerR: 0,
    schoolWaterOuterR: 0,
    orchardInnerR: 0,
    orchardOuterR: 0,
    productiveInnerR: 0,
    productiveOuterR: 0,
    canalInnerR: 0,
    canalOuterR: 0,
    bambooInnerR: 0,
    bambooOuterR: 0,
    numGuilds: 0,
    numCompounds: 0,
    // Areas in hectares
    bambooAreaHa: 0,
    canalAreaHa: 0,
    productiveAreaHa: 0,
    orchardAreaHa: 0,
    schoolAreaHa: 0,
    schoolWaterAreaHa: 0,
    guildAreaHa: 0
  })

  // ResizeObserver to detect container size changes
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width, height })
      }
    })

    resizeObserver.observe(canvas)
    return () => resizeObserver.disconnect()
  }, [])
  
  // === STATE VALUES (inputs) ===
  const numGuilds = sim.state?.numGuilds ?? 8
  const guildSpacing = sim.state?.guildSpacing ?? 200          // distance from center to guild ring
  const innerAreaHa = sim.state?.innerAreaHa ?? 50            // area inside bamboo ring
  const numCompounds = sim.state?.numCompounds ?? 8
  const greenhouseLength = sim.state?.greenhouseLength ?? 30
  const greenhouseWidth = sim.state?.greenhouseWidth ?? 15
  const greenhouseMaxDim = Math.max(greenhouseLength, greenhouseWidth)
  const compoundSpacing = sim.state?.compoundSpacing ?? 30
  const polygonSides = sim.state?.polygonSides ?? 6
  const domeDiameter = sim.state?.domeDiameter ?? 8
  
  // School - building radius + water ring around it
  const schoolPolygonSides = sim.state?.schoolPolygonSides ?? 8
  const schoolBuildingRadius = sim.state?.schoolBuildingRadius ?? 25
  const schoolWaterDistance = sim.state?.schoolWaterDistance ?? 25  // distance from building edge to water
  const schoolWaterRingWidth = sim.state?.schoolWaterRingWidth ?? 8
  // Water ring is at distance from building edge, not from center
  const schoolWaterInnerRadius = schoolBuildingRadius + schoolWaterDistance
  const schoolWaterOuterRadius = schoolWaterInnerRadius + schoolWaterRingWidth
  
  // Water
  const perimeterCanalWidth = sim.state?.perimeterCanalWidth ?? 15
  const guildCanalWidth = sim.state?.guildCanalWidth ?? 5
  const interGuildCanalWidth = sim.state?.interGuildCanalWidth ?? 4

  // Guild moat (aquaculture ring around each guild)
  const guildMoatOffset = sim.state?.guildMoatOffset ?? 10
  const guildMoatWidth = sim.state?.guildMoatWidth ?? 4

  // Grazing rotation
  const showGrazingCells = sim.state?.showGrazingCells ?? true
  const occupationDays = sim.state?.occupationDays ?? 2
  const recoveryDays = sim.state?.recoveryDays ?? 45
  const numGrazingPaddocks = sim.systems?.grazing?.numGrazingPaddocks ?? 24
  const areaPerPaddockHa = sim.systems?.grazing?.areaPerPaddockHa ?? 1

  // Fruit trees (orchard zone) - calculated from spacing and area
  const numFruitTrees = sim.systems?.vegetation?.numFruitTrees ?? 0

  // Use vegetation system values for consistency
  const vegSystem = sim.systems?.vegetation ?? {}
  const orchardZoneAreaHaFromSystem = vegSystem.orchardZoneAreaHa ?? 0

  // Silvopasture trees by species
  const blackLocustTrees = sim.state?.blackLocustTrees ?? 19800
  const oakAshTrees = sim.state?.oakAshTrees ?? 4560
  const walnutTrees = sim.state?.walnutTrees ?? 1400
  const totalSilvopastureTrees = blackLocustTrees + oakAshTrees + walnutTrees

  // Paths
  const bambooPathWidth = sim.state?.bambooPathWidth ?? 4
  const canalPathWidth = sim.state?.canalPathWidth ?? 3
  const bambooOuterPathWidth = sim.state?.bambooOuterPathWidth ?? 3
  const radialPathWidth = sim.state?.radialPathWidth ?? 2

  // Urban sector (CBD at edge)
  const showUrbanSector = sim.state?.showUrbanSector ?? true
  const urbanSectorAngle = sim.state?.urbanSectorAngle ?? 33  // degrees - inner wedge (to canal)
  const urbanSectorAngleOuter = sim.state?.urbanSectorAngleOuter ?? 33  // degrees - outer wedge (bamboo zone)
  const urbanPondInnerDiameter = sim.state?.urbanPondInnerDiameter ?? 20
  const urbanPondInnerDepth = sim.state?.urbanPondInnerDepth ?? 3
  const urbanPondOuterDiameter = sim.state?.urbanPondOuterDiameter ?? 15
  const urbanPondOuterDepth = sim.state?.urbanPondOuterDepth ?? 2.5
  const urbanStreets = sim.state?.urbanStreets ?? 3
  const urbanStreetsOuter = sim.state?.urbanStreetsOuter ?? 2
  const urbanCrossStreetsInner = sim.state?.urbanCrossStreetsInner ?? 2
  const urbanCrossStreetsOuter = sim.state?.urbanCrossStreetsOuter ?? 3
  const urbanStreetWidth = sim.state?.urbanStreetWidth ?? 4
  const centralCanalWidth = sim.state?.centralCanalWidth ?? 6
  const outerPondPathWidth = sim.state?.outerPondPathWidth ?? 3

  // === CALCULATED VALUES (from spatial system) ===
  const guildDiameter = sim.systems?.spatial?.guildDiameter ?? 150
  const guildRingRadius = sim.systems?.spatial?.guildRingRadius ?? 60
  const compoundRadius = sim.systems?.spatial?.compoundRadius ?? 15
  const totalPeople = sim.systems?.spatial?.totalPeople ?? 0
  const numStudents = sim.systems?.school?.numStudents ?? 200
  const bambooAreaHa = sim.systems?.bamboo?.areaTotal ?? 30
  const pastureAreaHa = (sim.systems?.cattle?.pastureHa ?? 0) + (sim.systems?.dairy?.pastureHa ?? 0)
  
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const dpr = window.devicePixelRatio || 1
    
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)
    
    const W = rect.width
    const H = rect.height
    
    ctx.fillStyle = '#0a0a12'
    ctx.fillRect(0, 0, W, H)
    
    const centerX = W / 2
    const centerY = H / 2 + 10
    
    // =====================================================
    // GEOMETRY (all in METERS)
    // =====================================================

    // Urban sector angles - calculate first (needed for bamboo compensation)
    const urbanCenterAngle = -Math.PI / 2  // Top (north)
    const urbanAngleRad = showUrbanSector ? (urbanSectorAngle * Math.PI / 180) : 0  // Inner sector angle
    const urbanAngleOuterRad = showUrbanSector ? (urbanSectorAngleOuter * Math.PI / 180) : 0  // Outer sector angle
    const urbanFractionOuter = urbanAngleOuterRad / (Math.PI * 2)  // fraction of circle taken by urban outer (affects bamboo)

    // Bamboo ring: inner radius from innerAreaHa
    const bambooInnerRadiusM = Math.sqrt(innerAreaHa * 10000 / Math.PI)

    // Calculate bamboo outer radius, compensating for missing urban OUTER wedge
    // To maintain same bamboo area despite missing wedge:
    // Area = (1 - urbanFractionOuter) × π × (R_outer² - R_inner²)
    // R_outer = √(Area / (π × (1 - urbanFractionOuter)) + R_inner²)
    const bambooAreaM2 = bambooAreaHa * 10000
    const effectiveArcFraction = showUrbanSector ? (1 - urbanFractionOuter) : 1
    const bambooOuterRadiusM = Math.sqrt(bambooAreaM2 / (Math.PI * effectiveArcFraction) + bambooInnerRadiusM * bambooInnerRadiusM)
    const bambooThicknessM = bambooOuterRadiusM - bambooInnerRadiusM

    // Canal just inside bamboo
    const canalOuterRadiusM = bambooInnerRadiusM
    const canalInnerRadiusM = bambooInnerRadiusM - perimeterCanalWidth

    // Guild positioning
    const guildRadiusM = guildDiameter / 2
    const guildCenterRadiusM = guildSpacing  // distance from cell center to guild centers

    // Productive zone: from canal to guilds (orchards + grazing)
    const productiveOuterRadiusM = canalInnerRadiusM - 5
    const productiveInnerRadiusM = guildCenterRadiusM + guildRadiusM + 10

    // Food forest: from guilds to school
    const orchardOuterRadiusM = guildCenterRadiusM - guildRadiusM - 10
    const orchardInnerRadiusM = schoolWaterOuterRadius + 10

    // School - use building radius directly (already calculated at top)
    const schoolRadiusM = schoolBuildingRadius
    const schoolWaterOuterRadiusM = schoolWaterOuterRadius

    // Guilds fill the remaining arc, each gets equal spacing
    const guildsArcRad = Math.PI * 2 - urbanAngleRad
    const slotAngleRad = guildsArcRad / numGuilds
    // Guilds start at the edge of urban sector
    const guildsStartAngle = urbanCenterAngle + urbanAngleRad / 2 + slotAngleRad / 2
    
    // =====================================================
    // SCALE to fit view
    // =====================================================
    const padding = 30
    const availableSize = Math.min(W, H) - padding * 2
    const scale = availableSize / (bambooOuterRadiusM * 2)
    
    const toPixels = (m) => m * scale
    
    // Convert to pixels
    const bambooOuterR = toPixels(bambooOuterRadiusM)
    const bambooInnerR = toPixels(bambooInnerRadiusM)
    const canalOuterR = toPixels(canalOuterRadiusM)
    const canalInnerR = toPixels(canalInnerRadiusM)
    const productiveOuterR = toPixels(productiveOuterRadiusM)
    const productiveInnerR = toPixels(productiveInnerRadiusM)
    const orchardOuterR = toPixels(orchardOuterRadiusM)
    const orchardInnerR = toPixels(orchardInnerRadiusM)
    const guildCenterR = toPixels(guildCenterRadiusM)
    const guildR = toPixels(guildRadiusM)
    const schoolR = toPixels(schoolRadiusM)
    const schoolWaterInnerR = toPixels(schoolWaterInnerRadius)
    const schoolWaterOuterR = toPixels(schoolWaterOuterRadiusM)
    const compR = toPixels(compoundRadius)
    const ghR = toPixels(greenhouseMaxDim / 2)
    const guildRingR = toPixels(guildRingRadius)
    
    // =====================================================
    // DRAWING
    // =====================================================

    // Urban sector angles for drawing
    // Inner sector (guild ring to perimeter canal)
    const urbanStartAngle = urbanCenterAngle - urbanAngleRad / 2
    const urbanEndAngle = urbanCenterAngle + urbanAngleRad / 2
    // Outer sector (perimeter canal to bamboo edge)
    const urbanOuterStartAngle = urbanCenterAngle - urbanAngleOuterRad / 2
    const urbanOuterEndAngle = urbanCenterAngle + urbanAngleOuterRad / 2

    // === 1. BAMBOO RING (arc excluding outer urban sector) ===
    if (showUrbanSector) {
      const bambooGrad = ctx.createRadialGradient(centerX, centerY, bambooInnerR, centerX, centerY, bambooOuterR)
      bambooGrad.addColorStop(0, '#0d3320')
      bambooGrad.addColorStop(1, '#1a472a')
      ctx.beginPath()
      // Use outer angle for bamboo exclusion
      ctx.arc(centerX, centerY, bambooOuterR, urbanOuterEndAngle, urbanOuterStartAngle + Math.PI * 2)
      ctx.arc(centerX, centerY, bambooInnerR, urbanOuterStartAngle + Math.PI * 2, urbanOuterEndAngle, true)
      ctx.closePath()
      ctx.fillStyle = bambooGrad
      ctx.fill()
    } else {
      drawRing(ctx, centerX, centerY, bambooOuterR, bambooInnerR, '#1a472a', '#0d3320')
    }

    // Bamboo texture (only in non-urban arc)
    ctx.fillStyle = '#2d5a3d'
    const bambooCount = Math.max(24, Math.floor(bambooOuterR * 0.2))
    for (let i = 0; i < bambooCount; i++) {
      const angle = (i / bambooCount) * Math.PI * 2 - Math.PI / 2  // start from top
      // Skip texture in urban outer sector
      if (showUrbanSector && angle >= urbanOuterStartAngle && angle <= urbanOuterEndAngle) continue
      const r = bambooOuterR - 4
      const x = centerX + Math.cos(angle) * r
      const y = centerY + Math.sin(angle) * r
      ctx.beginPath()
      ctx.moveTo(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6)
      ctx.lineTo(x + Math.cos(angle - 0.1) * 2, y + Math.sin(angle - 0.1) * 2)
      ctx.lineTo(x + Math.cos(angle + 0.1) * 2, y + Math.sin(angle + 0.1) * 2)
      ctx.closePath()
      ctx.fill()
    }
    

    // === 1b. BAMBOO RING PATH (service road through middle of bamboo ring) ===
    if (bambooPathWidth > 0) {
      const pathRadiusM = (bambooOuterRadiusM + bambooInnerRadiusM) / 2
      const pathR = toPixels(pathRadiusM)
      const pathWidthPx = toPixels(bambooPathWidth)

      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = pathWidthPx
      ctx.lineCap = 'butt'
      ctx.beginPath()
      if (showUrbanSector) {
        ctx.arc(centerX, centerY, pathR, urbanOuterEndAngle, urbanOuterStartAngle + Math.PI * 2)
      } else {
        ctx.arc(centerX, centerY, pathR, 0, Math.PI * 2)
      }
      ctx.stroke()
    }

    // === 1c. BAMBOO OUTER PATH (service road on outer edge of bamboo ring) ===
    if (bambooOuterPathWidth > 0) {
      const outerPathR = bambooOuterR + toPixels(bambooOuterPathWidth / 2)
      const outerPathWidthPx = toPixels(bambooOuterPathWidth)

      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = outerPathWidthPx
      ctx.lineCap = 'butt'
      ctx.beginPath()
      if (showUrbanSector) {
        ctx.arc(centerX, centerY, outerPathR, urbanOuterEndAngle, urbanOuterStartAngle + Math.PI * 2)
      } else {
        ctx.arc(centerX, centerY, outerPathR, 0, Math.PI * 2)
      }
      ctx.stroke()
    }

    // === 2. PERIMETER CANAL (complete circle - continues through urban sector) ===
    if (canalInnerR > 0 && canalOuterR > canalInnerR) {
      const canalGrad = ctx.createRadialGradient(centerX, centerY, canalInnerR, centerX, centerY, canalOuterR)
      canalGrad.addColorStop(0, '#1d4ed8')
      canalGrad.addColorStop(0.5, '#3b82f6')
      canalGrad.addColorStop(1, '#1d4ed8')
      drawRing(ctx, centerX, centerY, canalOuterR, canalInnerR, null, null, canalGrad)
    }

    // === 2b. CANAL PATHS (service roads on both sides of perimeter canal) ===
    if (canalPathWidth > 0) {
      const canalPathWidthPx = toPixels(canalPathWidth)
      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = canalPathWidthPx
      ctx.lineCap = 'butt'

      // Inner canal path (towards productive zone) - exclude urban sector
      const canalPathInnerR = canalInnerR - toPixels(canalPathWidth / 2)
      ctx.beginPath()
      if (showUrbanSector) {
        ctx.arc(centerX, centerY, canalPathInnerR, urbanEndAngle, urbanStartAngle + Math.PI * 2)
      } else {
        ctx.arc(centerX, centerY, canalPathInnerR, 0, Math.PI * 2)
      }
      ctx.stroke()

      // Outer canal path (towards bamboo) - exclude urban sector
      const canalPathOuterR = canalOuterR + toPixels(canalPathWidth / 2)
      ctx.beginPath()
      if (showUrbanSector) {
        ctx.arc(centerX, centerY, canalPathOuterR, urbanOuterEndAngle, urbanOuterStartAngle + Math.PI * 2)
      } else {
        ctx.arc(centerX, centerY, canalPathOuterR, 0, Math.PI * 2)
      }
      ctx.stroke()
    }

    // === 3. PRODUCTIVE ZONE (Orchards + Grazing) ===
    if (productiveOuterR > productiveInnerR) {
      // Full ring - urban sector will be drawn on top later
      drawRing(ctx, centerX, centerY, productiveOuterR, productiveInnerR, '#3d6b4a', '#2d5a3d')

      // Draw grazing cells
      if (showGrazingCells && numGrazingPaddocks > 0) {
        drawGrazingCells(ctx, centerX, centerY,
          productiveOuterR, productiveInnerR,
          guildCenterR, guildR, numGuilds,
          numGrazingPaddocks, occupationDays, recoveryDays,
          guildsStartAngle, slotAngleRad)
      }
    }
    
    // === 4. ORCHARDS (between guilds and school) ===
    if (orchardOuterR > orchardInnerR) {
      const forestGrad = ctx.createRadialGradient(centerX, centerY, orchardInnerR, centerX, centerY, orchardOuterR)
      forestGrad.addColorStop(0, '#1a472a')
      forestGrad.addColorStop(0.5, '#2d5a3d')
      forestGrad.addColorStop(1, '#1a472a')
      // Full ring - urban sector will cover its portion
      drawRing(ctx, centerX, centerY, orchardOuterR, orchardInnerR, null, null, forestGrad)
    }

    // === 4b. ORCHARD TREES (orange dots - full circle, urban sector covers them) ===
    if (numFruitTrees > 0 && orchardOuterR > orchardInnerR) {
      ctx.fillStyle = '#ea580c'  // deeper orange for orchard

      const orchardStartR = orchardInnerR
      const orchardEndR = orchardOuterR
      const orchardLength = orchardEndR - orchardStartR

      // Seeded random for consistent tree positions
      const seed = numFruitTrees * 7
      const seededRandom = (i) => {
        const x = Math.sin(seed * 0.1 + i * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }

      // Distribute trees in full circle (urban sector will cover its portion)
      for (let i = 0; i < numFruitTrees; i++) {
        const angle = seededRandom(i * 2) * Math.PI * 2
        const radialProgress = seededRandom(i * 2 + 1)
        const r = orchardStartR + radialProgress * orchardLength

        const x = centerX + Math.cos(angle) * r
        const y = centerY + Math.sin(angle) * r

        ctx.beginPath()
        ctx.arc(x, y, 0.5, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // === 4c. SILVOPASTURE TREES (in guild slots only) ===
    // Productive zone = between guilds outer edge and perimeter canal (grazing cells area)
    if (totalSilvopastureTrees > 0 && productiveOuterR > productiveInnerR) {
      const silvStartR = productiveInnerR
      const silvEndR = productiveOuterR
      const silvLength = silvEndR - silvStartR

      // Seeded random for consistent tree positions
      const seed = totalSilvopastureTrees * 11
      const seededRandom = (i) => {
        const x = Math.sin(seed * 0.1 + i * 12.9898) * 43758.5453
        return x - Math.floor(x)
      }

      // Species colors
      const SPECIES_COLORS = {
        blackLocust: '#22c55e',
        oakAsh: '#16a34a',
        walnut: '#15803d'
      }

      // Guild arc (excluding urban sector)
      // Arc spans from first guild slot start to last guild slot end
      const guildsArcRad = numGuilds * slotAngleRad
      const treeArcStart = guildsStartAngle - slotAngleRad / 2
      let treeIdx = 0

      // Black Locust trees
      ctx.fillStyle = SPECIES_COLORS.blackLocust
      for (let i = 0; i < blackLocustTrees; i++) {
        const angleInArc = seededRandom(treeIdx * 2) * guildsArcRad
        const angle = treeArcStart + angleInArc
        const radialProgress = seededRandom(treeIdx * 2 + 1)
        const r = silvStartR + radialProgress * silvLength

        ctx.beginPath()
        ctx.arc(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, 0.4, 0, Math.PI * 2)
        ctx.fill()
        treeIdx++
      }

      // Oak/Ash trees
      ctx.fillStyle = SPECIES_COLORS.oakAsh
      for (let i = 0; i < oakAshTrees; i++) {
        const angleInArc = seededRandom(treeIdx * 2) * guildsArcRad
        const angle = treeArcStart + angleInArc
        const radialProgress = seededRandom(treeIdx * 2 + 1)
        const r = silvStartR + radialProgress * silvLength

        ctx.beginPath()
        ctx.arc(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, 0.4, 0, Math.PI * 2)
        ctx.fill()
        treeIdx++
      }

      // Walnut trees
      ctx.fillStyle = SPECIES_COLORS.walnut
      for (let i = 0; i < walnutTrees; i++) {
        const angleInArc = seededRandom(treeIdx * 2) * guildsArcRad
        const angle = treeArcStart + angleInArc
        const radialProgress = seededRandom(treeIdx * 2 + 1)
        const r = silvStartR + radialProgress * silvLength

        ctx.beginPath()
        ctx.arc(centerX + Math.cos(angle) * r, centerY + Math.sin(angle) * r, 0.4, 0, Math.PI * 2)
        ctx.fill()
        treeIdx++
      }
    }

    // === 5. SCHOOL WATER RING ===
    if (schoolWaterOuterR > schoolWaterInnerR) {
      const waterGrad = ctx.createRadialGradient(centerX, centerY, schoolWaterInnerR, centerX, centerY, schoolWaterOuterR)
      waterGrad.addColorStop(0, '#1d4ed8')
      waterGrad.addColorStop(0.5, '#3b82f6')
      waterGrad.addColorStop(1, '#1d4ed8')
      drawRing(ctx, centerX, centerY, schoolWaterOuterR, schoolWaterInnerR, null, null, waterGrad)
    }

    // === 6. EARTH SCHOOL ===
    drawPolygon(ctx, centerX, centerY, schoolR, schoolPolygonSides, '#4a3728', '#3d2e22')

    // School accent border
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < schoolPolygonSides; i++) {
      const angle = (i / schoolPolygonSides) * Math.PI * 2 - Math.PI / 2
      const x = centerX + Math.cos(angle) * schoolR
      const y = centerY + Math.sin(angle) * schoolR
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()


    // === 6b. GUILD ZONE FILL (toroid between productive zone and orchards) ===
    if (productiveInnerR > orchardOuterR) {
      // Full ring - urban sector will cover its portion
      drawRing(ctx, centerX, centerY, productiveInnerR, orchardOuterR, '#3d6b4a', '#2d5a3d')
    }

    // NOTE: Inter-guild canal removed - replaced by guild moats (individual aquaculture rings around each guild)

    // Calculate areas in hectares for display
    const calcRingAreaHa = (outerM, innerM) => Math.PI * (outerM * outerM - innerM * innerM) / 10000
    const calcCircleAreaHa = (radiusM) => Math.PI * radiusM * radiusM / 10000

    // Store geometry for hit testing
    geometryRef.current = {
      centerX, centerY, scale,
      guildCenterR, guildR, guildRingR, compR, schoolR, ghR,
      schoolWaterInnerR, schoolWaterOuterR,
      orchardInnerR, orchardOuterR,
      productiveInnerR, productiveOuterR,
      canalInnerR, canalOuterR,
      bambooInnerR, bambooOuterR,
      numGuilds, numCompounds,
      // Areas in hectares (using meter values for accuracy)
      bambooAreaHa: bambooAreaHa,
      canalAreaHa: calcRingAreaHa(canalOuterRadiusM, canalInnerRadiusM),
      productiveAreaHa: calcRingAreaHa(productiveOuterRadiusM, productiveInnerRadiusM),
      orchardAreaHa: orchardZoneAreaHaFromSystem,
      schoolAreaHa: calcCircleAreaHa(schoolRadiusM),
      schoolWaterAreaHa: calcRingAreaHa(schoolWaterOuterRadius, schoolWaterInnerRadius),
      guildAreaHa: calcCircleAreaHa(guildRadiusM),
      greenhouseAreaHa: (greenhouseLength * greenhouseWidth) / 10000,
      // Distances and widths in meters
      bambooInnerM: bambooInnerRadiusM,
      bambooOuterM: bambooOuterRadiusM,
      bambooWidthM: bambooThicknessM,
      canalInnerM: canalInnerRadiusM,
      canalOuterM: canalOuterRadiusM,
      canalWidthM: perimeterCanalWidth,
      canalDepthM: sim.state?.perimeterCanalDepth ?? 5,
      canalLengthM: 2 * Math.PI * ((canalInnerRadiusM + canalOuterRadiusM) / 2),
      productiveInnerM: productiveInnerRadiusM,
      productiveOuterM: productiveOuterRadiusM,
      productiveWidthM: productiveOuterRadiusM - productiveInnerRadiusM,
      orchardInnerM: orchardInnerRadiusM,
      orchardOuterM: orchardOuterRadiusM,
      orchardWidthM: orchardOuterRadiusM - orchardInnerRadiusM,
      schoolRadiusM: schoolRadiusM,
      schoolWaterInnerM: schoolWaterInnerRadius,
      schoolWaterOuterM: schoolWaterOuterRadius,
      schoolWaterWidthM: schoolWaterRingWidth,
      schoolWaterDepthM: sim.state?.schoolWaterDepth ?? 2,
      guildRadiusM: guildRadiusM,
      guildCenterM: guildCenterRadiusM,
      greenhouseLengthM: greenhouseLength,
      greenhouseWidthM: greenhouseWidth,
      // Guild ring zone (where guilds are positioned)
      guildRingInnerM: orchardOuterRadiusM,
      guildRingOuterM: productiveInnerRadiusM,
      guildRingWidthM: productiveInnerRadiusM - orchardOuterRadiusM,
      guildRingAreaHa: calcRingAreaHa(productiveInnerRadiusM, orchardOuterRadiusM),
      // All guilds total area
      allGuildsAreaHa: calcCircleAreaHa(guildRadiusM) * numGuilds,
      // Guild positioning angles
      guildsStartAngle,
      slotAngleRad,
      // Urban sector data
      showUrbanSector,
      urbanAngleRad,
      urbanAngleOuterRad,
      // Guild moat data
      guildMoatOffset,
      guildMoatWidth,
      guildMoatInnerM: guildRadiusM + guildMoatOffset,
      guildMoatOuterM: guildRadiusM + guildMoatOffset + guildMoatWidth,
      guildMoatInnerR: toPixels(guildRadiusM + guildMoatOffset),
      guildMoatOuterR: toPixels(guildRadiusM + guildMoatOffset + guildMoatWidth),
      guildMoatDepthM: sim.state?.guildMoatDepth ?? 1.5,
      guildMoatPerimeterM: 2 * Math.PI * (guildRadiusM + guildMoatOffset + guildMoatWidth / 2),
      guildMoatVolumeM3: Math.PI * (Math.pow(guildRadiusM + guildMoatOffset + guildMoatWidth, 2) - Math.pow(guildRadiusM + guildMoatOffset, 2)) * (sim.state?.guildMoatDepth ?? 1.5)
    }

    // === 7. GUILDS (each in its own slot) ===
    for (let i = 0; i < numGuilds; i++) {
      // Each guild gets one slot, starting after urban sector
      const angle = guildsStartAngle + i * slotAngleRad
      const gx = centerX + Math.cos(angle) * guildCenterR
      const gy = centerY + Math.sin(angle) * guildCenterR

      // Guild background (productive area)
      ctx.fillStyle = '#2d4a3a'
      ctx.beginPath()
      ctx.arc(gx, gy, guildR, 0, Math.PI * 2)
      ctx.fill()

      // Vegetable gardens (inside guild, between kernel and compounds)
      const gardenInnerR = ghR + 5
      const gardenOuterR = guildRingR - compR - 5
      if (gardenOuterR > gardenInnerR) {
        // Garden ring
        ctx.fillStyle = '#4a7c5940'
        ctx.beginPath()
        ctx.arc(gx, gy, gardenOuterR, 0, Math.PI * 2)
        ctx.arc(gx, gy, gardenInnerR, 0, Math.PI * 2, true)
        ctx.fill()
      }

      // Greenhouse/kernel (center)
      ctx.fillStyle = '#22c55e30'
      ctx.strokeStyle = '#22c55e'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(gx, gy, ghR, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()


      // Compounds
      for (let c = 0; c < numCompounds; c++) {
        const compAngle = (c / numCompounds) * Math.PI * 2
        const compX = gx + Math.cos(compAngle) * guildRingR
        const compY = gy + Math.sin(compAngle) * guildRingR

        // Compound polygon
        drawPolygon(ctx, compX, compY, compR, polygonSides, '#4a3728', '#3d2e22')

        // Domes
        ctx.fillStyle = '#8b7355'
        const domeR = toPixels(domeDiameter / 2)
        for (let d = 0; d < polygonSides; d++) {
          const domeAngle = (d / polygonSides) * Math.PI * 2 + Math.PI / polygonSides
          const domeDistance = compR * 0.7
          const dx = compX + Math.cos(domeAngle) * domeDistance
          const dy = compY + Math.sin(domeAngle) * domeDistance
          ctx.beginPath()
          ctx.arc(dx, dy, Math.max(2, domeR), 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Guild moat (aquaculture ring around guild)
      if (guildMoatWidth > 0) {
        const moatInnerRadiusM = guildRadiusM + guildMoatOffset
        const moatOuterRadiusM = moatInnerRadiusM + guildMoatWidth
        const moatInnerR = toPixels(moatInnerRadiusM)
        const moatOuterR = toPixels(moatOuterRadiusM)

        // Draw moat ring (water)
        const moatGrad = ctx.createRadialGradient(gx, gy, moatInnerR, gx, gy, moatOuterR)
        moatGrad.addColorStop(0, '#1d4ed8')
        moatGrad.addColorStop(0.5, '#3b82f6')
        moatGrad.addColorStop(1, '#1d4ed8')

        ctx.beginPath()
        ctx.arc(gx, gy, moatOuterR, 0, Math.PI * 2)
        ctx.arc(gx, gy, moatInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fillStyle = moatGrad
        ctx.fill()

        // Subtle edge for definition
        ctx.strokeStyle = '#60a5fa'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(gx, gy, moatOuterR, 0, Math.PI * 2)
        ctx.stroke()
      }

    }

    // === 7a-bis. INTER-GUILD CONNECTING CANALS ===
    // Draw canals connecting adjacent guild moats (circular arcs along the guild ring)
    if (guildMoatWidth > 0 && interGuildCanalWidth > 0) {
      const moatOuterRadiusM = guildRadiusM + guildMoatOffset + guildMoatWidth
      const canalWidthPx = Math.max(2, toPixels(interGuildCanalWidth))

      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = canalWidthPx
      ctx.lineCap = 'round'

      // Angular offset for moat outer edge (from guild center angle)
      const moatAngularOffset = Math.asin(moatOuterRadiusM / guildCenterRadiusM)

      // Connect adjacent guilds
      for (let i = 0; i < numGuilds - 1; i++) {
        const angle1 = guildsStartAngle + (i * slotAngleRad)
        const angle2 = guildsStartAngle + ((i + 1) * slotAngleRad)

        // Arc start: after current guild's moat ends
        const arcStart = angle1 + moatAngularOffset
        // Arc end: before next guild's moat starts
        const arcEnd = angle2 - moatAngularOffset

        // Only draw if there's a gap (moats don't overlap)
        if (arcEnd > arcStart) {
          ctx.beginPath()
          ctx.arc(centerX, centerY, guildCenterR, arcStart, arcEnd)
          ctx.stroke()
        }
      }

      if (showUrbanSector) {
        // Connect first and last guilds to the inner pond (circular arcs along guild ring)
        const innerPondRadiusM = urbanPondInnerDiameter / 2
        const innerPondAngularOffset = Math.asin(innerPondRadiusM / guildCenterRadiusM)

        // First guild to inner pond (arc going counter-clockwise)
        const firstGuildAngle = guildsStartAngle
        const arcStartFirst = urbanCenterAngle + innerPondAngularOffset
        const arcEndFirst = firstGuildAngle - moatAngularOffset

        ctx.beginPath()
        ctx.arc(centerX, centerY, guildCenterR, arcStartFirst, arcEndFirst)
        ctx.stroke()

        // Last guild to inner pond (arc going clockwise)
        const lastGuildAngle = guildsStartAngle + (numGuilds - 1) * slotAngleRad
        const arcStartLast = lastGuildAngle + moatAngularOffset
        const arcEndLast = urbanCenterAngle - innerPondAngularOffset + Math.PI * 2  // Add 2π to go the long way

        ctx.beginPath()
        ctx.arc(centerX, centerY, guildCenterR, arcStartLast, arcEndLast)
        ctx.stroke()
      } else {
        // When urban sector is hidden, connect last guild directly to first guild
        const lastGuildAngle = guildsStartAngle + (numGuilds - 1) * slotAngleRad
        const firstGuildAngle = guildsStartAngle + Math.PI * 2  // First guild (wrap around)

        const arcStart = lastGuildAngle + moatAngularOffset
        const arcEnd = firstGuildAngle - moatAngularOffset

        if (arcEnd > arcStart) {
          ctx.beginPath()
          ctx.arc(centerX, centerY, guildCenterR, arcStart, arcEnd)
          ctx.stroke()
        }
      }
    }

    // === 7b. URBAN SECTOR (two wedges with different angles) ===
    if (showUrbanSector) {
      // INNER WEDGE: from guild ring to perimeter canal (uses urbanSectorAngle)
      const urbanInnerR = productiveInnerR
      ctx.beginPath()
      ctx.arc(centerX, centerY, canalInnerR, urbanStartAngle, urbanEndAngle)
      ctx.arc(centerX, centerY, urbanInnerR, urbanEndAngle, urbanStartAngle, true)
      ctx.closePath()
      ctx.fillStyle = '#4a4a5a'
      ctx.fill()

      // OUTER WEDGE: from perimeter canal to bamboo outer edge (uses urbanSectorAngleOuter)
      const urbanOuterR = bambooOuterR
      ctx.beginPath()
      ctx.arc(centerX, centerY, urbanOuterR, urbanOuterStartAngle, urbanOuterEndAngle)
      ctx.arc(centerX, centerY, canalOuterR, urbanOuterEndAngle, urbanOuterStartAngle, true)
      ctx.closePath()
      ctx.fillStyle = '#5a5a6a'  // Slightly different color for outer zone
      ctx.fill()

      // Central canal (radial) - runs from school water to perimeter canal
      const centralCanalWidthPx = Math.max(2, toPixels(centralCanalWidth))

      // Central canal starts at school water ring and goes to perimeter canal
      // Stop before inner canal path (don't cross into canal)
      const centralCanalStartR = schoolWaterOuterR
      const centralCanalEndR = canalInnerR - toPixels(canalPathWidth)

      // Central canal (water) - paths alongside are handled by radial streets
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = centralCanalWidthPx
      ctx.beginPath()
      ctx.moveTo(centerX + Math.cos(urbanCenterAngle) * centralCanalStartR,
                 centerY + Math.sin(urbanCenterAngle) * centralCanalStartR)
      ctx.lineTo(centerX + Math.cos(urbanCenterAngle) * centralCanalEndR,
                 centerY + Math.sin(urbanCenterAngle) * centralCanalEndR)
      ctx.stroke()

      // Inner Pond - at intersection of central canal and guild connection canal
      const innerPondR = toPixels(urbanPondInnerDiameter / 2)
      const innerPondX = centerX + Math.cos(urbanCenterAngle) * guildCenterR
      const innerPondY = centerY + Math.sin(urbanCenterAngle) * guildCenterR

      const innerPondGrad = ctx.createRadialGradient(innerPondX, innerPondY, 0, innerPondX, innerPondY, innerPondR)
      innerPondGrad.addColorStop(0, '#1d4ed8')
      innerPondGrad.addColorStop(0.6, '#3b82f6')
      innerPondGrad.addColorStop(1, '#1d4ed8')

      ctx.beginPath()
      ctx.arc(innerPondX, innerPondY, innerPondR, 0, Math.PI * 2)
      ctx.fillStyle = innerPondGrad
      ctx.fill()
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.stroke()

      // Re-draw perimeter canal arc through urban sector (use max of both angles)
      if (canalInnerR > 0 && canalOuterR > canalInnerR) {
        const perimeterGrad = ctx.createRadialGradient(centerX, centerY, canalInnerR, centerX, centerY, canalOuterR)
        perimeterGrad.addColorStop(0, '#1d4ed8')
        perimeterGrad.addColorStop(0.5, '#3b82f6')
        perimeterGrad.addColorStop(1, '#1d4ed8')
        // Use the larger of the two angles for the canal
        const canalStartAngle = urbanAngleRad >= urbanAngleOuterRad ? urbanStartAngle : urbanOuterStartAngle
        const canalEndAngle = urbanAngleRad >= urbanAngleOuterRad ? urbanEndAngle : urbanOuterEndAngle
        ctx.beginPath()
        ctx.arc(centerX, centerY, canalOuterR, canalStartAngle, canalEndAngle)
        ctx.arc(centerX, centerY, canalInnerR, canalEndAngle, canalStartAngle, true)
        ctx.closePath()
        ctx.fillStyle = perimeterGrad
        ctx.fill()
      }

      // NOTE: Inter-guild canal redraw removed - replaced by guild moats

      // === URBAN STREETS ===
      const streetWidthPx = Math.max(1, toPixels(urbanStreetWidth))
      ctx.strokeStyle = '#8b7355'  // brownish street color
      ctx.lineWidth = streetWidthPx
      ctx.lineCap = 'round'

      // Radial streets - distributed on each side of the central canal (inner sector only)
      // urbanStreets = number of streets per side
      // The innermost street on each side is parallel to the central canal (perpendicular offset)
      // Other streets are radial from edge towards center
      // Respect canal edge: stop before inner canal path
      if (urbanStreets > 0) {
        const innerStreetEnd = canalInnerR - toPixels(canalPathWidth)  // Stop before inner canal path

        // Perpendicular offset for streets adjacent to central canal
        const perpAngle = urbanCenterAngle + Math.PI / 2
        const pathOffset = toPixels(centralCanalWidth / 2 + urbanStreetWidth / 2 + 1)  // 1m gap

        // Left side streets
        if (urbanStreets === 1) {
          // Only one street: draw it parallel to canal
          ctx.beginPath()
          ctx.moveTo(centerX + Math.cos(urbanCenterAngle) * urbanInnerR + Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * urbanInnerR + Math.sin(perpAngle) * pathOffset)
          ctx.lineTo(centerX + Math.cos(urbanCenterAngle) * innerStreetEnd + Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * innerStreetEnd + Math.sin(perpAngle) * pathOffset)
          ctx.stroke()
        } else {
          // Multiple streets: first at edge, last parallel to canal, others distributed between
          const halfAngle = urbanAngleRad / 2
          const leftSpacing = halfAngle / (urbanStreets - 1)

          for (let s = 0; s < urbanStreets - 1; s++) {
            const streetAngle = urbanStartAngle + s * leftSpacing
            ctx.beginPath()
            ctx.moveTo(centerX + Math.cos(streetAngle) * urbanInnerR,
                       centerY + Math.sin(streetAngle) * urbanInnerR)
            ctx.lineTo(centerX + Math.cos(streetAngle) * innerStreetEnd,
                       centerY + Math.sin(streetAngle) * innerStreetEnd)
            ctx.stroke()
          }
          // Last street: parallel to canal
          ctx.beginPath()
          ctx.moveTo(centerX + Math.cos(urbanCenterAngle) * urbanInnerR + Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * urbanInnerR + Math.sin(perpAngle) * pathOffset)
          ctx.lineTo(centerX + Math.cos(urbanCenterAngle) * innerStreetEnd + Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * innerStreetEnd + Math.sin(perpAngle) * pathOffset)
          ctx.stroke()
        }

        // Right side streets
        if (urbanStreets === 1) {
          // Only one street: draw it parallel to canal
          ctx.beginPath()
          ctx.moveTo(centerX + Math.cos(urbanCenterAngle) * urbanInnerR - Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * urbanInnerR - Math.sin(perpAngle) * pathOffset)
          ctx.lineTo(centerX + Math.cos(urbanCenterAngle) * innerStreetEnd - Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * innerStreetEnd - Math.sin(perpAngle) * pathOffset)
          ctx.stroke()
        } else {
          // Multiple streets: first at edge, last parallel to canal, others distributed between
          const halfAngle = urbanAngleRad / 2
          const rightSpacing = halfAngle / (urbanStreets - 1)

          for (let s = 0; s < urbanStreets - 1; s++) {
            const streetAngle = urbanEndAngle - s * rightSpacing
            ctx.beginPath()
            ctx.moveTo(centerX + Math.cos(streetAngle) * urbanInnerR,
                       centerY + Math.sin(streetAngle) * urbanInnerR)
            ctx.lineTo(centerX + Math.cos(streetAngle) * innerStreetEnd,
                       centerY + Math.sin(streetAngle) * innerStreetEnd)
            ctx.stroke()
          }
          // Last street: parallel to canal
          ctx.beginPath()
          ctx.moveTo(centerX + Math.cos(urbanCenterAngle) * urbanInnerR - Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * urbanInnerR - Math.sin(perpAngle) * pathOffset)
          ctx.lineTo(centerX + Math.cos(urbanCenterAngle) * innerStreetEnd - Math.cos(perpAngle) * pathOffset,
                     centerY + Math.sin(urbanCenterAngle) * innerStreetEnd - Math.sin(perpAngle) * pathOffset)
          ctx.stroke()
        }
      }

      // Radial streets OUTER - distributed evenly across the full outer sector
      // First street at one edge, last street at other edge
      // Respect canal edges: start after outer canal path, end at bamboo outer path
      if (urbanStreetsOuter > 0) {
        const outerStreetStart = canalOuterR + toPixels(canalPathWidth)  // After outer canal path
        const outerStreetEnd = bambooOuterR + toPixels(bambooOuterPathWidth / 2)  // At bamboo outer path

        // Distribute streets evenly across the full outer sector angle
        const outerSpacing = urbanStreetsOuter > 1 ? urbanAngleOuterRad / (urbanStreetsOuter - 1) : 0

        for (let s = 0; s < urbanStreetsOuter; s++) {
          const streetAngle = urbanOuterStartAngle + s * outerSpacing
          ctx.beginPath()
          ctx.moveTo(centerX + Math.cos(streetAngle) * outerStreetStart,
                     centerY + Math.sin(streetAngle) * outerStreetStart)
          ctx.lineTo(centerX + Math.cos(streetAngle) * outerStreetEnd,
                     centerY + Math.sin(streetAngle) * outerStreetEnd)
          ctx.stroke()
        }
      }

      // Cross streets INNER (arc streets between guild ring and perimeter canal)
      // First street at guild ring edge, last at inner canal path center
      // Split into two arcs to avoid crossing the central canal
      if (urbanCrossStreetsInner > 0) {
        const innerZoneStart = urbanInnerR  // At guild ring edge
        const innerZoneEnd = canalInnerR - toPixels(canalPathWidth / 2)  // At inner canal path center
        // Include both edges: divide by (count - 1) for spacing
        const innerSpacing = urbanCrossStreetsInner > 1 ? (innerZoneEnd - innerZoneStart) / (urbanCrossStreetsInner - 1) : 0

        // Calculate gap to avoid central canal
        const centralGapWidth = centralCanalWidth + urbanStreetWidth

        for (let c = 0; c < urbanCrossStreetsInner; c++) {
          const crossR = innerZoneStart + c * innerSpacing
          // Angular half-width of the central canal gap at this radius
          const gapHalfAngle = toPixels(centralGapWidth / 2) / crossR

          // Left arc: from urbanStartAngle to just before central canal
          ctx.beginPath()
          ctx.arc(centerX, centerY, crossR, urbanStartAngle, urbanCenterAngle - gapHalfAngle)
          ctx.stroke()

          // Right arc: from just after central canal to urbanEndAngle
          ctx.beginPath()
          ctx.arc(centerX, centerY, crossR, urbanCenterAngle + gapHalfAngle, urbanEndAngle)
          ctx.stroke()
        }
      }

      // Cross streets OUTER (arc streets between perimeter canal and bamboo edge - uses outer angle)
      // First street aligns with outer canal path, last aligns with bamboo outer path
      if (urbanCrossStreetsOuter > 0) {
        // Align with the actual path positions
        const outerZoneStart = canalOuterR + toPixels(canalPathWidth / 2)  // Align with outer canal path
        const outerZoneEnd = bambooOuterR + toPixels(bambooOuterPathWidth / 2)  // Align with bamboo outer path
        // Include both edges: divide by (count - 1) for spacing
        const outerSpacing = urbanCrossStreetsOuter > 1 ? (outerZoneEnd - outerZoneStart) / (urbanCrossStreetsOuter - 1) : 0
        for (let c = 0; c < urbanCrossStreetsOuter; c++) {
          const crossR = outerZoneStart + c * outerSpacing
          ctx.beginPath()
          ctx.arc(centerX, centerY, crossR, urbanOuterStartAngle, urbanOuterEndAngle)
          ctx.stroke()
        }
      }

      // Outer Pond - at intersection of central canal and perimeter canal
      // Drawn last so it's on top of perimeter canal and streets
      const outerPondR = toPixels(urbanPondOuterDiameter / 2)
      const perimeterCanalCenterR = (canalInnerR + canalOuterR) / 2
      const outerPondX = centerX + Math.cos(urbanCenterAngle) * perimeterCanalCenterR
      const outerPondY = centerY + Math.sin(urbanCenterAngle) * perimeterCanalCenterR

      const outerPondGrad = ctx.createRadialGradient(outerPondX, outerPondY, 0, outerPondX, outerPondY, outerPondR)
      outerPondGrad.addColorStop(0, '#1d4ed8')
      outerPondGrad.addColorStop(0.6, '#3b82f6')
      outerPondGrad.addColorStop(1, '#1d4ed8')

      ctx.beginPath()
      ctx.arc(outerPondX, outerPondY, outerPondR, 0, Math.PI * 2)
      ctx.fillStyle = outerPondGrad
      ctx.fill()
      ctx.strokeStyle = '#60a5fa'
      ctx.lineWidth = 2
      ctx.stroke()

      // Path around outer pond
      if (outerPondPathWidth > 0) {
        const outerPondPathR = outerPondR + toPixels(outerPondPathWidth / 2)
        ctx.strokeStyle = '#8b7355'
        ctx.lineWidth = toPixels(outerPondPathWidth)
        ctx.beginPath()
        ctx.arc(outerPondX, outerPondY, outerPondPathR, 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // === 8. RADIAL CANALS (drawn in segments to avoid guilds + moats) ===
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = Math.max(2, toPixels(guildCanalWidth))

    // Calculate moat outer radius (guild edge + offset + moat width)
    const moatOuterRadiusM = guildRadiusM + guildMoatOffset + guildMoatWidth
    const moatOuterR = toPixels(moatOuterRadiusM)

    for (let i = 0; i < numGuilds; i++) {
      // Each guild has its own slot
      const angle = guildsStartAngle + i * slotAngleRad

      // Segment 1: From school water to moat outer edge
      const seg1Start = schoolWaterOuterR
      const seg1End = guildCenterR - moatOuterR - 2

      if (seg1End > seg1Start) {
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle) * seg1Start, centerY + Math.sin(angle) * seg1Start)
        ctx.lineTo(centerX + Math.cos(angle) * seg1End, centerY + Math.sin(angle) * seg1End)
        ctx.stroke()
      }

      // Segment 2: From moat outer edge to perimeter canal
      const seg2Start = guildCenterR + moatOuterR + 2
      const seg2End = canalInnerR

      if (seg2End > seg2Start) {
        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle) * seg2Start, centerY + Math.sin(angle) * seg2Start)
        ctx.lineTo(centerX + Math.cos(angle) * seg2End, centerY + Math.sin(angle) * seg2End)
        ctx.stroke()
      }
    }

    // === 8b. RADIAL PATHS (from outer canal path through bamboo to outer edge path) ===
    if (radialPathWidth > 0) {
      ctx.strokeStyle = '#8b7355'
      ctx.lineWidth = Math.max(1, toPixels(radialPathWidth))
      ctx.lineCap = 'butt'

      // Start after outer canal path, end at bamboo outer path
      const radialPathStart = canalOuterR + toPixels(canalPathWidth)
      const radialPathEnd = bambooOuterR + toPixels(bambooOuterPathWidth / 2)

      for (let i = 0; i < numGuilds; i++) {
        const angle = guildsStartAngle + i * slotAngleRad

        ctx.beginPath()
        ctx.moveTo(centerX + Math.cos(angle) * radialPathStart,
                   centerY + Math.sin(angle) * radialPathStart)
        ctx.lineTo(centerX + Math.cos(angle) * radialPathEnd,
                   centerY + Math.sin(angle) * radialPathEnd)
        ctx.stroke()
      }
    }

    // === 9. HOVER OVERLAY AND INFO BOX ===
    if (hoverTarget) {
      ctx.save()

      // Draw white overlay on hovered region
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'

      if (hoverTarget.type === 'bamboo') {
        // Bamboo ring (arc excluding urban)
        ctx.beginPath()
        if (showUrbanSector) {
          ctx.arc(centerX, centerY, bambooOuterR, urbanOuterEndAngle, urbanOuterStartAngle + Math.PI * 2)
          ctx.arc(centerX, centerY, bambooInnerR, urbanOuterStartAngle + Math.PI * 2, urbanOuterEndAngle, true)
        } else {
          ctx.arc(centerX, centerY, bambooOuterR, 0, Math.PI * 2)
          ctx.arc(centerX, centerY, bambooInnerR, 0, Math.PI * 2, true)
        }
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'canal') {
        ctx.beginPath()
        ctx.arc(centerX, centerY, canalOuterR, 0, Math.PI * 2)
        ctx.arc(centerX, centerY, canalInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'productive') {
        ctx.beginPath()
        ctx.arc(centerX, centerY, productiveOuterR, 0, Math.PI * 2)
        ctx.arc(centerX, centerY, productiveInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'orchard') {
        ctx.beginPath()
        ctx.arc(centerX, centerY, orchardOuterR, 0, Math.PI * 2)
        ctx.arc(centerX, centerY, orchardInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'school') {
        ctx.beginPath()
        for (let i = 0; i < schoolPolygonSides; i++) {
          const a = (i / schoolPolygonSides) * Math.PI * 2 - Math.PI / 2
          const px = centerX + Math.cos(a) * schoolR
          const py = centerY + Math.sin(a) * schoolR
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'schoolWater') {
        ctx.beginPath()
        ctx.arc(centerX, centerY, schoolWaterOuterR, 0, Math.PI * 2)
        ctx.arc(centerX, centerY, schoolWaterInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'guild') {
        const angle = guildsStartAngle + hoverTarget.index * slotAngleRad
        const gx = centerX + Math.cos(angle) * guildCenterR
        const gy = centerY + Math.sin(angle) * guildCenterR
        ctx.beginPath()
        ctx.arc(gx, gy, guildR, 0, Math.PI * 2)
        ctx.fill()
      } else if (hoverTarget.type === 'guildMoat') {
        const angle = guildsStartAngle + hoverTarget.index * slotAngleRad
        const gx = centerX + Math.cos(angle) * guildCenterR
        const gy = centerY + Math.sin(angle) * guildCenterR
        const moatInnerR = geometryRef.current.guildMoatInnerR
        const moatOuterR = geometryRef.current.guildMoatOuterR
        ctx.beginPath()
        ctx.arc(gx, gy, moatOuterR, 0, Math.PI * 2)
        ctx.arc(gx, gy, moatInnerR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'greenhouse') {
        const angle = guildsStartAngle + hoverTarget.index * slotAngleRad
        const gx = centerX + Math.cos(angle) * guildCenterR
        const gy = centerY + Math.sin(angle) * guildCenterR
        ctx.beginPath()
        ctx.arc(gx, gy, ghR, 0, Math.PI * 2)
        ctx.fill()
      } else if (hoverTarget.type === 'compound') {
        const angle = guildsStartAngle + hoverTarget.guildIndex * slotAngleRad
        const gx = centerX + Math.cos(angle) * guildCenterR
        const gy = centerY + Math.sin(angle) * guildCenterR
        const compAngle = (hoverTarget.index / numCompounds) * Math.PI * 2
        const compX = gx + Math.cos(compAngle) * guildRingR
        const compY = gy + Math.sin(compAngle) * guildRingR
        ctx.beginPath()
        for (let j = 0; j < polygonSides; j++) {
          const a = (j / polygonSides) * Math.PI * 2 - Math.PI / 2
          const px = compX + Math.cos(a) * compR
          const py = compY + Math.sin(a) * compR
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'urban') {
        // Urban sector overlay
        ctx.beginPath()
        ctx.arc(centerX, centerY, canalInnerR, urbanStartAngle, urbanEndAngle)
        ctx.arc(centerX, centerY, productiveInnerR, urbanEndAngle, urbanStartAngle, true)
        ctx.closePath()
        ctx.fill()
        ctx.beginPath()
        ctx.arc(centerX, centerY, bambooOuterR, urbanOuterStartAngle, urbanOuterEndAngle)
        ctx.arc(centerX, centerY, canalOuterR, urbanOuterEndAngle, urbanOuterStartAngle, true)
        ctx.closePath()
        ctx.fill()
      } else if (hoverTarget.type === 'guildRing') {
        ctx.beginPath()
        ctx.arc(centerX, centerY, productiveInnerR, 0, Math.PI * 2)
        ctx.arc(centerX, centerY, orchardOuterR, 0, Math.PI * 2, true)
        ctx.closePath()
        ctx.fill()
      }

      // Draw info box in upper right corner (away from sidebar)
      const boxPadding = 10
      const lineHeight = 16
      const fontSize = 12

      // Build info lines
      const lines = []
      lines.push({ label: '', value: hoverTarget.label || hoverTarget.type, bold: true })

      if (hoverTarget.areaHa !== undefined && hoverTarget.areaHa > 0) {
        lines.push({ label: 'Area', value: `${hoverTarget.areaHa.toFixed(1)} ha` })
      }
      if (hoverTarget.diameterM !== undefined && hoverTarget.diameterM > 0) {
        lines.push({ label: 'Diameter', value: `${hoverTarget.diameterM.toFixed(0)} m` })
      }
      if (hoverTarget.lengthM !== undefined && hoverTarget.lengthM > 0) {
        lines.push({ label: 'Length', value: `${hoverTarget.lengthM.toFixed(0)} m` })
      }
      if (hoverTarget.widthM !== undefined && hoverTarget.widthM > 0) {
        lines.push({ label: 'Width', value: `${hoverTarget.widthM.toFixed(0)} m` })
      }
      if (hoverTarget.depthM !== undefined && hoverTarget.depthM > 0) {
        lines.push({ label: 'Depth', value: `${hoverTarget.depthM.toFixed(1)} m` })
      }
      if (hoverTarget.volumeM3 !== undefined && hoverTarget.volumeM3 > 0) {
        lines.push({ label: 'Volume', value: `${hoverTarget.volumeM3.toFixed(0)} m³` })
      }
      if (hoverTarget.description) {
        lines.push({ label: '', value: hoverTarget.description, italic: true })
      }

      // Calculate box dimensions
      ctx.font = `${fontSize}px system-ui, sans-serif`
      let maxWidth = 0
      for (const line of lines) {
        const text = line.label ? `${line.label}: ${line.value}` : line.value
        maxWidth = Math.max(maxWidth, ctx.measureText(text).width)
      }
      const boxWidth = maxWidth + boxPadding * 2
      const boxHeight = lines.length * lineHeight + boxPadding * 2

      // Position text in upper right corner with margin
      const boxMargin = 12
      const boxX = W - boxWidth - boxMargin
      const boxY = boxMargin

      // Draw text with shadow for readability (no box)
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)'
      ctx.shadowBlur = 4
      ctx.shadowOffsetX = 1
      ctx.shadowOffsetY = 1
      ctx.fillStyle = '#ffffff'
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]
        const y = boxY + boxPadding + (i + 1) * lineHeight - 4
        if (line.bold) {
          ctx.font = `bold ${fontSize}px system-ui, sans-serif`
        } else if (line.italic) {
          ctx.font = `italic ${fontSize - 1}px system-ui, sans-serif`
          ctx.fillStyle = '#999999'
        } else {
          ctx.font = `${fontSize}px system-ui, sans-serif`
          ctx.fillStyle = '#ffffff'
        }
        const text = line.label ? `${line.label}: ${line.value}` : line.value
        ctx.fillText(text, boxX + boxPadding, y)
      }

      // Reset shadow
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0

      ctx.restore()
    }

    // === 10. ZOOM ANIMATION OVERLAY ===
    if (zoomAnimation && zoomAnimation.progress > 0) {
      const maxRadius = Math.sqrt(W * W + H * H) // Diagonal of canvas
      const currentRadius = schoolR + (maxRadius - schoolR) * zoomAnimation.progress

      ctx.fillStyle = '#f59e0b' // Golden yellow
      ctx.beginPath()
      ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2)
      ctx.fill()
    }

  }, [canvasSize, sim.state, sim.systems?.spatial, sim.systems?.grazing, sim.systems?.vegetation,
      sim.systems?.bamboo, sim.systems?.cattle, sim.systems?.dairy, sim.systems?.school, hoverTarget, zoomAnimation])

  // === HIT TESTING ===
  const getHitTarget = useCallback((e) => {
    const canvas = canvasRef.current
    if (!canvas) return null

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const geo = geometryRef.current
    const { centerX, centerY, guildCenterR, guildR, guildRingR, compR, schoolR, numGuilds, numCompounds, ghR } = geo

    // Distance from center
    const distToCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)

    // Angle from center (for urban sector detection)
    const angleFromCenter = Math.atan2(y - centerY, x - centerX)

    // Urban sector detection (at top = -PI/2)
    const urbanCenterAngle = -Math.PI / 2
    const urbanAngleRad = geo.urbanAngleRad || 0
    const urbanAngleOuterRad = geo.urbanAngleOuterRad || 0
    const urbanStartAngle = urbanCenterAngle - urbanAngleRad / 2
    const urbanEndAngle = urbanCenterAngle + urbanAngleRad / 2
    const urbanOuterStartAngle = urbanCenterAngle - urbanAngleOuterRad / 2
    const urbanOuterEndAngle = urbanCenterAngle + urbanAngleOuterRad / 2

    const isInUrbanInner = urbanAngleRad > 0 && angleFromCenter >= urbanStartAngle && angleFromCenter <= urbanEndAngle
    const isInUrbanOuter = urbanAngleOuterRad > 0 && angleFromCenter >= urbanOuterStartAngle && angleFromCenter <= urbanOuterEndAngle

    // Check school first (center)
    if (distToCenter <= schoolR) {
      return {
        type: 'school', label: 'Earth School',
        areaHa: geo.schoolAreaHa, diameterM: geo.schoolRadiusM * 2,
        description: 'Education center for the cell'
      }
    }

    // Check school water ring
    if (distToCenter > geo.schoolWaterInnerR && distToCenter <= geo.schoolWaterOuterR) {
      return {
        type: 'schoolWater', label: 'School Water Ring',
        areaHa: geo.schoolWaterAreaHa, widthM: geo.schoolWaterWidthM, depthM: geo.schoolWaterDepthM || 2,
        description: 'Aquaculture and water storage'
      }
    }

    // Check each guild (using slot-based positioning)
    const { guildsStartAngle, slotAngleRad } = geo
    for (let i = 0; i < numGuilds; i++) {
      const angle = guildsStartAngle + i * slotAngleRad
      const gx = centerX + Math.cos(angle) * guildCenterR
      const gy = centerY + Math.sin(angle) * guildCenterR

      const distToGuild = Math.sqrt((x - gx) ** 2 + (y - gy) ** 2)

      // Check greenhouse/kernel first (center of guild)
      if (ghR && distToGuild <= ghR) {
        return {
          type: 'greenhouse', index: i, label: `Greenhouse ${i + 1}`,
          lengthM: geo.greenhouseLengthM || 30, widthM: geo.greenhouseWidthM || 15,
          areaHa: geo.greenhouseAreaHa || 0.045,
          description: 'Year-round vegetable production'
        }
      }

      // Check compounds within this guild
      for (let c = 0; c < numCompounds; c++) {
        const compAngle = (c / numCompounds) * Math.PI * 2
        const compX = gx + Math.cos(compAngle) * guildRingR
        const compY = gy + Math.sin(compAngle) * guildRingR

        const distToComp = Math.sqrt((x - compX) ** 2 + (y - compY) ** 2)
        if (distToComp <= compR) {
          return {
            type: 'compound', guildIndex: i, index: c, label: `Compound ${c + 1}`,
            description: 'Housing with private domes'
          }
        }
      }

      // Check if in guild area (but not in greenhouse or compound)
      if (distToGuild <= guildR) {
        return {
          type: 'guild', index: i, label: `Guild ${i + 1}`,
          areaHa: geo.guildAreaHa, diameterM: geo.guildRadiusM * 2,
          description: 'Production unit with compounds'
        }
      }

      // Check guild moat (aquaculture ring around guild)
      if (geo.guildMoatWidth > 0 && distToGuild > geo.guildMoatInnerR && distToGuild <= geo.guildMoatOuterR) {
        return {
          type: 'guildMoat', index: i, label: `Guild ${i + 1} Moat`,
          widthM: geo.guildMoatWidth,
          depthM: geo.guildMoatDepthM,
          lengthM: geo.guildMoatPerimeterM,
          volumeM3: geo.guildMoatVolumeM3,
          description: 'Aquaculture ring'
        }
      }
    }

    // Check urban sector (inner and outer zones)
    if (geo.showUrbanSector) {
      // Inner urban (between productive zone and canal)
      if (isInUrbanInner && distToCenter > geo.productiveInnerR && distToCenter <= geo.canalInnerR) {
        return {
          type: 'urban', label: 'Urban Sector (Inner)',
          areaHa: geo.urbanInnerAreaHa || 0,
          description: 'CBD, markets, cultural venues'
        }
      }
      // Outer urban (between canal and bamboo edge)
      if (isInUrbanOuter && distToCenter > geo.canalOuterR && distToCenter <= geo.bambooOuterR) {
        return {
          type: 'urban', label: 'Urban Sector (Outer)',
          areaHa: geo.urbanOuterAreaHa || 0,
          description: 'Extended urban amenities'
        }
      }
    }

    // Check orchard zone (between school water and guilds)
    if (distToCenter > geo.orchardInnerR && distToCenter <= geo.orchardOuterR) {
      return {
        type: 'orchard', label: 'Orchard',
        areaHa: geo.orchardAreaHa, widthM: geo.orchardWidthM,
        description: 'Fruit trees + small livestock'
      }
    }

    // Check guild ring zone (between orchard and silvopasture)
    if (distToCenter > geo.orchardOuterR && distToCenter <= geo.productiveInnerR) {
      return {
        type: 'guildRing', label: 'Guild Zone',
        areaHa: geo.guildRingAreaHa, widthM: geo.guildRingWidthM,
        description: 'Gardens and legume trees'
      }
    }

    // Check productive zone (between guilds and canal)
    if (distToCenter > geo.productiveInnerR && distToCenter <= geo.productiveOuterR) {
      return {
        type: 'productive', label: 'Silvopasture',
        areaHa: geo.productiveAreaHa, widthM: geo.productiveWidthM,
        description: 'Cattle grazing with trees'
      }
    }

    // Check canal
    if (distToCenter > geo.canalInnerR && distToCenter <= geo.canalOuterR) {
      return {
        type: 'canal', label: 'Perimeter Canal',
        areaHa: geo.canalAreaHa, widthM: geo.canalWidthM, depthM: geo.canalDepthM || 5,
        lengthM: geo.canalLengthM,
        description: 'Water reservoir and aquaculture'
      }
    }

    // Check bamboo ring
    if (distToCenter > geo.bambooInnerR && distToCenter <= geo.bambooOuterR) {
      return {
        type: 'bamboo', label: 'Bamboo Plantation',
        areaHa: geo.bambooAreaHa, widthM: geo.bambooWidthM,
        description: 'Biomass for energy production'
      }
    }

    return null
  }, [])

  // Mouse handlers
  const handleMouseMove = useCallback((e) => {
    const target = getHitTarget(e)
    setHoverTarget(target)
  }, [getHitTarget])

  const handleMouseLeave = useCallback(() => {
    setHoverTarget(null)
  }, [])

  const handleClick = useCallback((e) => {
    const target = getHitTarget(e)
    if (!target || !onNavigate) return

    if (target.type === 'school') {
      // Start zoom animation
      setZoomAnimation({ progress: 0, startTime: performance.now() })
    } else if (target.type === 'guild') {
      onNavigate('guild')
    } else if (target.type === 'compound') {
      onNavigate('compound')
    }
  }, [getHitTarget, onNavigate])

  // Zoom animation effect
  useEffect(() => {
    if (!zoomAnimation) return

    const canvas = canvasRef.current
    if (!canvas) return

    const duration = 600 // ms
    const animate = (currentTime) => {
      const elapsed = currentTime - zoomAnimation.startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic for smooth deceleration
      const eased = 1 - Math.pow(1 - progress, 3)

      if (progress < 1) {
        setZoomAnimation(prev => ({ ...prev, progress: eased }))
        requestAnimationFrame(animate)
      } else {
        // Animation complete - navigate
        setZoomAnimation(null)
        onNavigate?.('school')
      }
    }

    requestAnimationFrame(animate)
  }, [zoomAnimation?.startTime, onNavigate])

  // Determine cursor style
  const cursorStyle = hoverTarget ? 'pointer' : 'default'

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: '100%', display: 'block', borderRadius: '6px', cursor: cursorStyle }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    />
  )
}

// === HELPER FUNCTIONS ===

function drawRing(ctx, cx, cy, outerR, innerR, color1, color2, gradient) {
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true)
  ctx.closePath()
  
  if (gradient) {
    ctx.fillStyle = gradient
  } else {
    const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR)
    grad.addColorStop(0, color2 || color1)
    grad.addColorStop(1, color1)
    ctx.fillStyle = grad
  }
  ctx.fill()
}

function drawPolygon(ctx, cx, cy, r, sides, fillColor, strokeColor) {
  ctx.beginPath()
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2
    const x = cx + Math.cos(angle) * r
    const y = cy + Math.sin(angle) * r
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = fillColor
  ctx.fill()
  if (strokeColor) {
    ctx.strokeStyle = strokeColor
    ctx.lineWidth = 1
    ctx.stroke()
  }
}

function drawGrazingCells(ctx, centerX, centerY, outerR, innerR, guildCenterR, guildR, numGuilds, numCeldas, diasOcup, diasRecup, guildsStartAngle, slotAngleRad) {
  // Holistic grazing: each guild manages its own paddocks within its silvopasture sector
  // Paddocks per guild = ceil(recoveryDays / occupationDays) + 1
  const paddocksPerGuild = Math.ceil(diasRecup / diasOcup) + 1

  // Current active paddock
  const rotationCycleDays = paddocksPerGuild * diasOcup
  const currentDay = Math.floor(Date.now() / (1000 * 60)) % rotationCycleDays
  const activePaddockInGuild = Math.floor(currentDay / diasOcup) % paddocksPerGuild

  // Small angular gap between adjacent guild sectors for visual separation
  const angularGap = 0.02  // radians

  // Radial gap between paddock rings
  const radialGap = 2  // pixels

  // Paddocks are concentric rings from guild outer edge to perimeter canal
  const totalRadialDistance = outerR - innerR
  const paddockRadialHeight = (totalRadialDistance - radialGap * (paddocksPerGuild - 1)) / paddocksPerGuild

  // Draw paddocks for each guild (each guild has one slot)
  for (let g = 0; g < numGuilds; g++) {
    // Guild center angle (each gets one slot)
    const guildCenterAngle = guildsStartAngle + g * slotAngleRad

    // Sector spans the slot width
    const halfSector = slotAngleRad / 2
    const sectorStartAngle = guildCenterAngle - halfSector + angularGap / 2
    const sectorEndAngle = guildCenterAngle + halfSector - angularGap / 2

    // Draw each paddock as a concentric ring within the sector
    for (let p = 0; p < paddocksPerGuild; p++) {
      // Ring radii (from guild outward to canal)
      const ringInnerR = innerR + p * (paddockRadialHeight + radialGap)
      const ringOuterR = ringInnerR + paddockRadialHeight

      // Determine paddock state
      const isActive = p === activePaddockInGuild
      const daysSinceOccupied = ((activePaddockInGuild - p + paddocksPerGuild) % paddocksPerGuild) * diasOcup
      const colorEstado = getCellColor(isActive, daysSinceOccupied, diasRecup)

      // Draw arc ring (paddock)
      ctx.beginPath()
      ctx.arc(centerX, centerY, ringOuterR, sectorStartAngle, sectorEndAngle)
      ctx.arc(centerX, centerY, ringInnerR, sectorEndAngle, sectorStartAngle, true)
      ctx.closePath()

      ctx.fillStyle = isActive ? colorEstado : colorEstado + '40'
      ctx.fill()
      ctx.strokeStyle = colorEstado
      ctx.lineWidth = isActive ? 2 : 0.5
      ctx.stroke()

      // Cow icon on active paddock
      if (isActive) {
        const midAngle = guildCenterAngle
        const midR = (ringInnerR + ringOuterR) / 2
        ctx.font = '10px system-ui'
        ctx.textAlign = 'center'
        ctx.fillStyle = '#fff'
        ctx.fillText('🐄', centerX + Math.cos(midAngle) * midR, centerY + Math.sin(midAngle) * midR + 3)
      }
    }
  }
}

function getCellColor(esActiva, diasDesdeOcupacion, diasRecup) {
  if (esActiva) return '#f59e0b'
  if (diasDesdeOcupacion < diasRecup * 0.3) return '#ef4444'
  if (diasDesdeOcupacion < diasRecup * 0.7) return '#eab308'
  if (diasDesdeOcupacion < diasRecup) return '#84cc16'
  return '#22c55e'
}

export default CellView
