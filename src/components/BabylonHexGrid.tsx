import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, PointerEventTypes, ActionManager, ExecuteCodeAction, Texture, DynamicTexture, Animation, SpotLight, PointLight, ShadowGenerator } from '@babylonjs/core';
import { useGame } from '@/stores/game';
import type { Hex, TerrainType, Unit } from '@/types/battle';
import UnitContextMenu from '@/components/UnitContextMenu';
import DiceDialog from '@/components/DiceDialog';
import CounterAttackDialog from '@/components/CounterAttackDialog';
import { reachableCosts } from '@/utils/path';
import { axialDistance } from '@/utils/hex';
import { WORLD_THEMES, type ThemeConfig } from '@/utils/worldThemes';

export default function BabylonHexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useGame();
  const sceneRef = useRef<Scene | null>(null);
  const hexMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const unitMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const objectiveMeshesRef = useRef<Map<number, Mesh>>(new Map());
  const movementIndicatorsRef = useRef<Mesh[]>([]);
  const terrainObjectsRef = useRef<Mesh[]>([]);
  const targetCrosshairsRef = useRef<Mesh[]>([]);
  const selectedUnitIdRef = useRef<string | undefined>(undefined);
  const phaseRef = useRef<typeof g.phase>(g.phase);
  const [menu, setMenu] = useState<{u:Unit, x:number, y:number}|null>(null);
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>();
  
  // Keep refs in sync with state
  useEffect(() => {
    selectedUnitIdRef.current = g.selectedUnitId;
    phaseRef.current = g.phase;
  }, [g.selectedUnitId, g.phase]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Get current theme configuration
    const theme = WORLD_THEMES[g.worldTheme];
    
    // Create engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(theme.backgroundColor.r, theme.backgroundColor.g, theme.backgroundColor.b, 1);
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = theme.fogDensity;
    scene.fogColor = theme.fogColor;
    sceneRef.current = scene;

    // Setup camera - isometric view with better zoom limits
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,      // Alpha (horizontal rotation)
      Math.PI / 3,      // Beta (vertical angle) - 60 degrees for isometric
      40,               // Radius (distance from target) - closer default
      Vector3.Zero(),   // Target
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 8;  // Allow much closer zoom
    camera.upperRadiusLimit = 80; // Slightly less far zoom
    camera.lowerBetaLimit = Math.PI / 6;  // Don't go too flat
    camera.upperBetaLimit = Math.PI / 2.2; // Don't go too vertical
    camera.wheelPrecision = 20; // Smoother zoom (lower = faster zoom)
    camera.panningSensibility = 50; // Adjust panning speed

    // Grim Dark Lighting - balanced for visibility
    // Ambient light - adjusted based on theme
    const ambientLight = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = theme.ambientIntensity;
    ambientLight.groundColor = theme.ambientColor.scale(0.4);
    ambientLight.diffuse = theme.ambientColor;

    // Theme-specific lighting colors
    let spotColor1, spotColor2, pointColor1, pointColor2;
    let spotIntensity1, spotIntensity2, pointIntensity1, pointIntensity2;
    
    if (theme.terrainColors.water.r > 0.6) {
      // Lava world - red/orange lighting
      spotColor1 = new Color3(1.0, 0.4, 0.2); // Red-orange
      spotColor2 = new Color3(1.0, 0.6, 0.3); // Orange
      pointColor1 = new Color3(1.0, 0.3, 0.1); // Deep red glow
      pointColor2 = new Color3(1.0, 0.5, 0.2); // Orange glow
      spotIntensity1 = 1.5;
      spotIntensity2 = 1.3;
      pointIntensity1 = 0.6;
      pointIntensity2 = 0.5;
    } else if (theme.terrainColors.water.b > 0.6) {
      // Ice world - cold blue lighting
      spotColor1 = new Color3(0.7, 0.8, 1.0); // Cold blue
      spotColor2 = new Color3(0.8, 0.9, 1.0); // Icy white
      pointColor1 = new Color3(0.5, 0.7, 1.0); // Blue glow
      pointColor2 = new Color3(0.6, 0.8, 1.0); // Cyan glow
      spotIntensity1 = 1.4;
      spotIntensity2 = 1.2;
      pointIntensity1 = 0.4;
      pointIntensity2 = 0.4;
    } else if (theme.ambientIntensity > 0.7) {
      // Bright world (Grassland) - warm natural light
      spotColor1 = new Color3(1.0, 0.95, 0.8); // Warm sunlight
      spotColor2 = new Color3(0.95, 0.9, 0.75); // Golden light
      pointColor1 = new Color3(1.0, 0.9, 0.7); // Warm glow
      pointColor2 = new Color3(0.9, 0.85, 0.7); // Soft glow
      spotIntensity1 = 1.6;
      spotIntensity2 = 1.4;
      pointIntensity1 = 0.3;
      pointIntensity2 = 0.3;
    } else {
      // Dark world (Grim Dark, Jungle) - cold industrial
      spotColor1 = new Color3(0.9, 0.95, 1.0); // Cold blue-white
      spotColor2 = new Color3(1.0, 0.95, 0.8); // Warm industrial
      pointColor1 = new Color3(1.0, 0.5, 0.2); // Orange fire
      pointColor2 = new Color3(0.3, 0.9, 1.0); // Blue energy
      spotIntensity1 = 1.2;
      spotIntensity2 = 1.0;
      pointIntensity1 = 0.4;
      pointIntensity2 = 0.35;
    }

    // Dramatic spotlight from above
    const spotlight1 = new SpotLight(
      'spotlight1',
      new Vector3(-10, 20, -10),
      new Vector3(0.3, -1, 0.3),
      Math.PI / 3,
      2,
      scene
    );
    spotlight1.intensity = spotIntensity1;
    spotlight1.diffuse = spotColor1;

    // Second spotlight from different angle
    const spotlight2 = new SpotLight(
      'spotlight2',
      new Vector3(15, 18, 15),
      new Vector3(-0.4, -1, -0.4),
      Math.PI / 3,
      2,
      scene
    );
    spotlight2.intensity = spotIntensity2;
    spotlight2.diffuse = spotColor2;

    // Point lights for atmosphere
    const pointLight1 = new PointLight('fire1', new Vector3(-20, 5, -20), scene);
    pointLight1.intensity = pointIntensity1;
    pointLight1.diffuse = pointColor1;
    pointLight1.range = 35;

    const pointLight2 = new PointLight('fire2', new Vector3(25, 4, 20), scene);
    pointLight2.intensity = pointIntensity2;
    pointLight2.diffuse = pointColor2;
    pointLight2.range = 30;

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      if (engine) {
        engine.resize();
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (sceneRef.current) {
        sceneRef.current.dispose();
      }
      if (engine) {
        engine.dispose();
      }
    };
  }, [g.worldTheme]); // Re-create scene when theme changes

  // Create hex meshes when grid changes
  useEffect(() => {
    console.log('🔍 Hex mesh effect triggered - scene:', !!sceneRef.current, 'grid length:', g.grid.length);
    if (!sceneRef.current || g.grid.length === 0) {
      console.warn('⚠️ Skipping hex mesh creation - scene:', !!sceneRef.current, 'grid:', g.grid.length);
      return;
    }
    const scene = sceneRef.current;
    const hexSize = 1; // Size of each hex in 3D space

    // Clear existing meshes
    hexMeshesRef.current.forEach(mesh => mesh.dispose());
    hexMeshesRef.current.clear();

    // Get theme once for this effect
    const theme = WORLD_THEMES[g.worldTheme];

    // Create hex meshes with click interaction
    console.log('🎲 Creating hex meshes - grid size:', g.grid.length, 'grid sample:', g.grid.slice(0, 3));
    if (g.grid.length === 0) {
      console.error('❌ Grid is empty! Cannot create hex meshes.');
      return;
    }
    
    g.grid.forEach((hex) => {
      const hexMesh = createHexMesh(hex, hexSize, scene, (clickedHex) => {
        handleHexClick(clickedHex);
      }, theme);
      hexMeshesRef.current.set(`${hex.q},${hex.r}`, hexMesh);
    });
    console.log('✅ Created', hexMeshesRef.current.size, 'hex meshes');

    // Add 3D terrain objects (buildings, debris, mountains)
    terrainObjectsRef.current.forEach(mesh => mesh.dispose());
    terrainObjectsRef.current = [];
    
    // Track building positions to prevent overlap
    const buildingPositions: Set<string> = new Set();
    
    // Mark hexes with units as occupied (initial deployment)
    g.units.filter(u => u.position).forEach(u => {
      buildingPositions.add(`${u.position!.q},${u.position!.r}`);
    });
    
    // Mark hexes with objectives as occupied
    g.objectives.forEach(obj => {
      buildingPositions.add(`${obj.position.q},${obj.position.r}`);
      // Also mark neighbors to keep area clear
      const neighbors = [
        [obj.position.q + 1, obj.position.r],
        [obj.position.q - 1, obj.position.r],
        [obj.position.q, obj.position.r + 1],
        [obj.position.q, obj.position.r - 1],
        [obj.position.q + 1, obj.position.r - 1],
        [obj.position.q - 1, obj.position.r + 1]
      ];
      neighbors.forEach(([q, r]) => buildingPositions.add(`${q},${r}`));
    });
    
    g.grid.forEach((hex) => {
      const objects = createTerrainObjects(hex, hexSize, scene, buildingPositions, theme);
      terrainObjectsRef.current.push(...objects);
    });

  }, [g.grid, g.worldTheme]);

  // Create/update unit meshes when units change OR phase changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const hexSize = 1;

    // Clear existing unit meshes
    unitMeshesRef.current.forEach(mesh => mesh.dispose());
    unitMeshesRef.current.clear();

    // Create unit meshes
    const theme = WORLD_THEMES[g.worldTheme];
    g.units.filter(u => u.position).forEach((unit) => {
      const isSelected = unit.id === g.selectedUnitId;
      const unitMesh = createUnitMesh(unit, hexSize, scene, isSelected, (clickedUnit, event) => {
        handleUnitClick(clickedUnit, event);
      }, theme);
      unitMeshesRef.current.set(unit.id, unitMesh);
      
      // Make hex under this unit non-pickable to prevent conflicts
      const hexKey = `${unit.position!.q},${unit.position!.r}`;
      const hexMesh = hexMeshesRef.current.get(hexKey);
      if (hexMesh) {
        hexMesh.isPickable = false;
      }
    });
    
    // Re-enable picking for hexes without units
    hexMeshesRef.current.forEach((hexMesh, key) => {
      const hasUnit = g.units.some(u => u.position && `${u.position.q},${u.position.r}` === key);
      hexMesh.isPickable = !hasUnit;
    });

  }, [g.units, g.selectedUnitId, g.phase, g.worldTheme]);

  // Create/update objective markers
  useEffect(() => {
    if (!sceneRef.current || g.phase !== 'playing') return;

    const scene = sceneRef.current;
    const hexSize = 1;

    // Clear existing objective meshes
    objectiveMeshesRef.current.forEach(mesh => mesh.dispose());
    objectiveMeshesRef.current.clear();

    // Create objective markers
    const theme = WORLD_THEMES[g.worldTheme];
    g.objectives.forEach((obj) => {
      const objMesh = createObjectiveMesh(obj, hexSize, scene, theme);
      objectiveMeshesRef.current.set(obj.id, objMesh);
    });

  }, [g.objectives, g.phase, g.worldTheme]);

  // Highlight hexes for movement/deployment and show movement indicators
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    const hexSize = 1;
    
    console.log('Movement indicators effect - selectedUnitId:', g.selectedUnitId, 'phase:', g.phase);
    
    // Clear old movement indicators
    movementIndicatorsRef.current.forEach(mesh => mesh.dispose());
    movementIndicatorsRef.current = [];
    
    // Update hex materials for deployment zones or movement range
    hexMeshesRef.current.forEach((hexMesh, key) => {
      const hex = hexMesh.metadata.hex as Hex;
      const material = hexMesh.material as StandardMaterial;
      
      if (g.phase === 'deploy' && g.canDeployOn(hex)) {
        material.emissiveColor = new Color3(0.1, 0.3, 0.5); // Blue glow for deployable
      } else {
        material.emissiveColor = new Color3(0, 0, 0); // No glow
      }
    });
    
    // Show movement range for selected unit
    if (g.phase === 'playing' && g.selectedUnitId) {
      console.log('Trying to show movement range for:', g.selectedUnitId);
      const selUnit = g.units.find(u => u.id === g.selectedUnitId);
      console.log('Found unit:', selUnit?.name, 'hasMoved:', selUnit?.hasMoved, 'usedWeapons:', selUnit?.usedWeapons?.length);
      
      if (selUnit && selUnit.position && !selUnit.hasMoved && (selUnit.usedWeapons?.length || 0) === 0) {
        const maxMove = selUnit.speed;
        const maxRun = selUnit.speed * 2;
        console.log('Calculating reachable hexes - maxMove:', maxMove, 'maxRun:', maxRun);
        const allCosts = reachableCosts(selUnit, g.grid, selUnit.position, maxRun);
        console.log('Reachable hexes:', allCosts.size);
        
        const theme = WORLD_THEMES[g.worldTheme];
        
        for (const [hexKey, cost] of allCosts) {
          const [qStr, rStr] = hexKey.split(',');
          const q = parseInt(qStr);
          const r = parseInt(rStr);
          
          if (q === selUnit.position!.q && r === selUnit.position!.r) continue; // Skip current position
          
          // Get the hex to calculate its top position
          const targetHex = g.grid.find(h => h.q === q && h.r === r);
          if (!targetHex) continue;
          
          const terrainHeight = theme.terrainHeights[targetHex.terrain];
          const baseThickness = 0.5;
          
          // Calculate hex top Y position (same logic as in createHexMesh)
          let hexTopY: number;
          if (terrainHeight < 0) {
            const thickness = baseThickness + terrainHeight;
            hexTopY = terrainHeight / 2 + thickness / 2;
          } else {
            hexTopY = baseThickness + terrainHeight;
          }
          
          const w = Math.sqrt(3) * hexSize;
          const h = 2 * hexSize;
          const x = w * (q + r / 2);
          const z = h * (3 / 4) * r;
          
          // Create movement indicator (thin disc) ON TOP of the hex
          const indicator = MeshBuilder.CreateCylinder(
            `move-indicator-${hexKey}`,
            { height: 0.08, diameter: hexSize * 1.8, tessellation: 6 },
            scene
          );
          indicator.position = new Vector3(x, hexTopY + 0.05, z); // Just above hex top
          indicator.rotation.y = Math.PI / 6;
          indicator.isPickable = false; // Don't block hex clicks!
          
          const mat = new StandardMaterial(`move-mat-${hexKey}`, scene);
          if (cost <= maxMove) {
            mat.diffuseColor = new Color3(0.3, 0.8, 0.3); // Green for walk
            mat.emissiveColor = new Color3(0.2, 0.5, 0.2);
          } else {
            mat.diffuseColor = new Color3(0.8, 0.6, 0.2); // Orange for run
            mat.emissiveColor = new Color3(0.5, 0.4, 0.1);
          }
          mat.alpha = 0.5;
          indicator.material = mat;
          
          movementIndicatorsRef.current.push(indicator);
        }
        console.log('Created', movementIndicatorsRef.current.length, 'movement indicators');
      }
    }
    
  }, [g.phase, g.selectedUnitId, g.currentPlayer, g.units, g.grid, g.worldTheme]);

  // Show crosshairs over ranged targets
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    const hexSize = 1;
    
    // Clear old crosshairs
    targetCrosshairsRef.current.forEach(mesh => mesh.dispose());
    targetCrosshairsRef.current = [];
    
    // Only show during playing phase with selected unit
    if (g.phase !== 'playing' || !g.selectedUnitId) return;
    
    const selectedUnit = g.units.find(u => u.id === g.selectedUnitId);
    if (!selectedUnit || !selectedUnit.position || selectedUnit.hasRun) return;
    
    // Get ranged weapons
    const rangedWeapons = selectedUnit.weapons.filter(w => 
      (w.range || 0) > 0 && !selectedUnit.usedWeapons?.includes(w.name)
    );
    
    if (rangedWeapons.length === 0) return;
    
    // Find all enemy units in range
    const enemies = g.units.filter(u => 
      u.owner !== selectedUnit.owner && 
      u.position &&
      u.wounds > 0
    );
    
    enemies.forEach(enemy => {
      if (!enemy.position || !selectedUnit.position) return;
      
      const dist = axialDistance(selectedUnit.position, enemy.position);
      
      // Check if any ranged weapon can reach
      const canShoot = rangedWeapons.some(w => dist <= (w.range || 0));
      if (!canShoot) return;
      
      // Check line of sight and cover
      const targetHex = g.grid.find(h => h.q === enemy.position!.q && h.r === enemy.position!.r);
      if (!targetHex) return;
      
      // Calculate cover modifier (terrain-based + buildings)
      const inCover = targetHex.terrain === 'forest' || targetHex.terrain === 'ruin' || targetHex.terrain === 'rock' || targetHex.hasBuilding;
      
      // Create crosshair
      const w = Math.sqrt(3) * hexSize;
      const h = 2 * hexSize;
      const x = w * (enemy.position.q + enemy.position.r / 2);
      const z = h * (3 / 4) * enemy.position.r;
      
      const theme = WORLD_THEMES[g.worldTheme];
      const terrainHeight = theme.terrainHeights[targetHex.terrain];
      const baseThickness = 0.5;
      let hexTopY: number;
      if (terrainHeight < 0) {
        const thickness = baseThickness + terrainHeight;
        hexTopY = terrainHeight / 2 + thickness / 2;
      } else {
        hexTopY = baseThickness + terrainHeight;
      }
      
      // Create crosshair plane
      const crosshair = MeshBuilder.CreatePlane(
        `crosshair-${enemy.id}`,
        { size: 1.2 },
        scene
      );
      crosshair.position = new Vector3(x, hexTopY + 2.5, z);
      crosshair.billboardMode = Mesh.BILLBOARDMODE_ALL;
      
      // Create crosshair texture
      const crosshairTexture = new DynamicTexture(`crosshair-tex-${enemy.id}`, 256, scene);
      const ctx = crosshairTexture.getContext() as CanvasRenderingContext2D;
      
      // Draw crosshair
      const centerX = 128;
      const centerY = 128;
      const radius = 80;
      
      // Background circle (semi-transparent)
      ctx.fillStyle = inCover ? 'rgba(255, 165, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      
      // Crosshair lines
      ctx.strokeStyle = inCover ? '#FFA500' : '#FF0000'; // Orange if in cover, red otherwise
      ctx.lineWidth = 6;
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - radius);
      ctx.lineTo(centerX, centerY - 20);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY + 20);
      ctx.lineTo(centerX, centerY + radius);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(centerX - radius, centerY);
      ctx.lineTo(centerX - 20, centerY);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.moveTo(centerX + 20, centerY);
      ctx.lineTo(centerX + radius, centerY);
      ctx.stroke();
      
      // Center dot
      ctx.fillStyle = inCover ? '#FFA500' : '#FF0000';
      ctx.beginPath();
      ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Cover indicator (shield icon if in cover)
      if (inCover) {
        ctx.fillStyle = '#FFA500';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🛡️', centerX, centerY - radius - 30);
      }
      
      crosshairTexture.update();
      
      const crosshairMat = new StandardMaterial(`crosshair-mat-${enemy.id}`, scene);
      crosshairMat.diffuseTexture = crosshairTexture;
      crosshairMat.emissiveTexture = crosshairTexture;
      crosshairMat.emissiveColor = new Color3(1, 1, 1);
      crosshairMat.opacityTexture = crosshairTexture;
      crosshairMat.backFaceCulling = false;
      crosshair.material = crosshairMat;
      
      targetCrosshairsRef.current.push(crosshair);
    });
    
  }, [g.phase, g.selectedUnitId, g.units, g.grid, g.worldTheme]);

  // Handle hex click
  function handleHexClick(hex: Hex) {
    const currentPhase = phaseRef.current;
    console.log('handleHexClick called:', hex.q, hex.r, 'phase:', currentPhase, 'selectedUnitId:', selectedUnitIdRef.current);
    setSelectedHex(hex);
    if (currentPhase === 'deploy') {
      console.log('Deploy phase - selectedUnitId:', g.selectedUnitId);
      if (!g.selectedUnitId) {
        console.log('No unit selected');
        return;
      }
      if (!g.canDeployOn(hex)) {
        console.log('Cannot deploy on this hex');
        return;
      }
      console.log('Placing unit:', g.selectedUnitId);
      g.placeUnit(g.selectedUnitId, hex);
      return;
    }
    if (currentPhase === 'playing') {
      // Use ref instead of state to avoid async issues
      const selectedId = selectedUnitIdRef.current;
      if (!selectedId) {
        console.log('No unit selected for movement (ref)');
        return;
      }
      const selUnit = g.units.find(u => u.id === selectedId);
      console.log('Playing phase - selected unit:', selUnit?.name, 'ID:', selectedId);
      if (selUnit && selUnit.position) {
        // Calculate distance to determine if we need to run
        const dq = hex.q - selUnit.position.q;
        const dr = hex.r - selUnit.position.r;
        const distance = (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
        
        const maxWalk = selUnit.speed;
        const needsRun = distance > maxWalk;
        
        console.log('Attempting to move unit to:', hex.q, hex.r, 'distance:', distance, 'needsRun:', needsRun);
        g.moveUnit(selUnit.id, hex, needsRun);
      } else {
        console.log('Unit not found or has no position');
      }
    }
  }

  // Handle unit click
  function handleUnitClick(u: Unit, event?: PointerEvent) {
    console.log('handleUnitClick called:', u.name, 'button:', event?.button, 'phase:', g.phase);
    
    // Right-click context menu - check FIRST before other logic
    if (event && event.button === 2) {
      console.log('Right-click detected - opening context menu');
      event.preventDefault();
      setMenu({u, x: event.clientX, y: event.clientY});
      return; // Don't process other logic
    }
    
    console.log('Left-click - owner:', u.owner, 'currentPlayer:', g.currentPlayer, 'activated:', u.activated);
    
    if (g.phase === 'deploy') {
      if (u.owner === g.currentPlayer && u.position) {
        console.log('Unplacing unit');
        g.unplaceUnit(u.id);
      } else if (u.owner === g.currentPlayer) {
        console.log('Selecting unit for deployment');
        g.selectUnit(u.id);
        console.log('After selectUnit, selectedUnitId:', g.selectedUnitId);
      }
    } else if (g.phase === 'playing') {
      if (u.owner === g.currentPlayer && !u.activated) {
        console.log('Selecting own unit, ID:', u.id);
        console.log('Before selectUnit - g.selectedUnitId:', g.selectedUnitId);
        console.log('Before selectUnit - g.phase:', g.phase);
        console.log('Before selectUnit - g.currentPlayer:', g.currentPlayer);
        
        g.selectUnit(u.id);
        
        console.log('After selectUnit - g.selectedUnitId:', g.selectedUnitId);
        console.log('After selectUnit - g.phase:', g.phase);
        
        // Force a small delay to check if state updates
        setTimeout(() => {
          console.log('After 100ms - selectedUnitId:', g.selectedUnitId);
          console.log('After 100ms - phase:', g.phase);
          const foundUnit = g.units.find(unit => unit.id === u.id);
          console.log('After 100ms - unit still exists?', !!foundUnit);
        }, 100);
      } else if (g.selectedUnitId && u.owner !== g.currentPlayer) {
        // Attack enemy unit
        console.log('Attacking enemy unit');
        const availableWeapons = g.getAvailableWeapons(g.selectedUnitId);
        if (availableWeapons.length > 0) {
          g.attack(g.selectedUnitId, u.id, availableWeapons[0].name);
        } else {
          console.log('No available weapons');
        }
      } else {
        console.log('Cannot select unit - activated:', u.activated, 'owner:', u.owner, 'currentPlayer:', g.currentPlayer);
      }
    }
  }

  return (
    <>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1, // Behind UI elements (which have zIndex 50+)
      }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            touchAction: 'none',
          }}
        />
      </div>
      {menu && <UnitContextMenu unit={menu.u} x={menu.x} y={menu.y} onClose={()=>setMenu(null)} />}
      <CounterAttackDialog />
      {g.pendingAttack && (() => {
        const atk = g.units.find(u => u.id === g.pendingAttack!.attackerId);
        const tgt = g.units.find(u => u.id === g.pendingAttack!.targetId);
        const weapon = atk?.weapons.find(w => w.name === g.pendingAttack!.weaponName);
        if (!atk || !tgt || !weapon) return null;
        
        return (
          <DiceDialog
            attackerName={atk.name}
            targetName={tgt.name}
            weaponName={weapon.name}
            attackerQuality={atk.quality}
            targetDefense={tgt.defense}
            weaponAP={weapon.ap}
            attacks={weapon.attacks}
            isExhausted={atk.isExhausted}
            isCounterAttack={g.pendingAttack.isCounterAttack}
            onClose={(hits, wounds) => g.executeAttack(hits, wounds)}
          />
        );
      })()}
    </>
  );
}

// Helper function to create a single hex mesh
function createHexMesh(hex: Hex, size: number, scene: Scene, onClick: (hex: Hex) => void, theme: ThemeConfig): Mesh {
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const x = w * (hex.q + hex.r / 2);
  const z = h * (3 / 4) * hex.r; // Using Z for the hex grid plane
  const heightOffset = theme.terrainHeights[hex.terrain];

  // Create hexagon using cylinder with 6 sides
  // Thickness represents the height of the terrain
  const baseThickness = 0.5; // Increased base thickness for more prominent hexes
  
  // For water (negative height), create depression
  // For land (positive height), add to base thickness
  let thickness: number;
  let yPosition: number;
  
  if (heightOffset < 0) {
    // Water: thinner hex, positioned lower
    thickness = baseThickness + heightOffset; // Will be less than baseThickness
    yPosition = heightOffset / 2; // Bottom goes below Y=0
  } else {
    // Land: normal or elevated
    thickness = baseThickness + heightOffset;
    yPosition = thickness / 2; // Bottom at Y=0
  }
  
  const hex3D = MeshBuilder.CreateCylinder(
    `hex-${hex.q}-${hex.r}`,
    {
      height: thickness,
      diameter: size * 2,
      tessellation: 6, // 6 sides for hexagon
    },
    scene
  );

  // Position the hex
  hex3D.position = new Vector3(x, yPosition, z);
  hex3D.rotation.y = Math.PI / 6; // Rotate to align flat side

  // Material with procedural textures
  const material = new StandardMaterial(`mat-${hex.q}-${hex.r}`, scene);
  material.diffuseColor = theme.terrainColors[hex.terrain];
  material.specularColor = new Color3(0.1, 0.1, 0.1);
  
  // Check if Minecraft world - USE SAME DETECTION AS BUILDINGS!
  const isMinecraftWorld = (theme.terrainColors.open.g > 0.6 && theme.ambientIntensity > 0.85 && theme.terrainColors.water.b < 0.8) || 
                           (theme.terrainColors.open.r > 0.65 && theme.terrainColors.water.b > 0.75 && theme.ambientIntensity > 0.8 && theme.ambientIntensity < 0.9);
  
  // Add Minecraft block textures
  if (isMinecraftWorld && (hex.terrain === 'open' || hex.terrain === 'road' || hex.terrain === 'forest')) {
    const blockTexture = new DynamicTexture(`block-tex-${hex.q}-${hex.r}`, 128, scene);
    const ctx = blockTexture.getContext() as CanvasRenderingContext2D;
    
    if (hex.terrain === 'open') {
      // Grass block top
      ctx.fillStyle = '#7CBD6B';
      ctx.fillRect(0, 0, 128, 128);
      // Add pixel noise for Minecraft look
      for (let i = 0; i < 200; i++) {
        const brightness = Math.random() * 40 - 20;
        ctx.fillStyle = `rgb(${123 + brightness}, ${189 + brightness}, ${107 + brightness})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 4, 4);
      }
    } else if (hex.terrain === 'road') {
      // Dirt/gravel
      ctx.fillStyle = '#8B7355';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 200; i++) {
        const brightness = Math.random() * 30 - 15;
        ctx.fillStyle = `rgb(${139 + brightness}, ${115 + brightness}, ${85 + brightness})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 4, 4);
      }
    } else if (hex.terrain === 'forest') {
      // Grass with darker shade
      ctx.fillStyle = '#6BA861';
      ctx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 200; i++) {
        const brightness = Math.random() * 30 - 15;
        ctx.fillStyle = `rgb(${107 + brightness}, ${168 + brightness}, ${97 + brightness})`;
        ctx.fillRect(Math.random() * 128, Math.random() * 128, 4, 4);
      }
    }
    
    blockTexture.update();
    material.diffuseTexture = blockTexture;
  }
  
  // Add procedural textures for certain terrains
  if (hex.terrain === 'water' || hex.terrain === 'lake' || hex.terrain === 'river') {
    // Water/Lava texture - changes based on theme
    const waterTexture = new DynamicTexture(`water-tex-${hex.q}-${hex.r}`, 128, scene);
    const ctx = waterTexture.getContext() as CanvasRenderingContext2D;
    
    // Theme-specific colors
    let color1, color2, waveColor, specular, emissive;
    
    if (theme.terrainColors.water.r > 0.6) {
      // Lava world - glowing orange/red
      color1 = '#ff4500';
      color2 = '#ff8c00';
      waveColor = 'rgba(255, 200, 100, 0.6)';
      specular = new Color3(0.8, 0.4, 0.2);
      emissive = new Color3(0.5, 0.2, 0.1);
    } else if (theme.terrainColors.water.b > 0.6) {
      // Ice world - frozen blue
      color1 = '#c0d8e8';
      color2 = '#e0f0ff';
      waveColor = 'rgba(200, 220, 240, 0.4)';
      specular = new Color3(0.6, 0.7, 0.8);
      emissive = new Color3(0.05, 0.08, 0.12);
    } else {
      // Default water - dark blue/green
      color1 = '#1a2530';
      color2 = '#243540';
      waveColor = 'rgba(60, 80, 100, 0.4)';
      specular = new Color3(0.3, 0.4, 0.5);
      emissive = new Color3(0.03, 0.05, 0.08);
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 128, 128);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.5, color2);
    gradient.addColorStop(1, color1);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
    
    // Wave lines
    ctx.strokeStyle = waveColor;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const y = (i / 8) * 128;
      ctx.moveTo(0, y);
      for (let x = 0; x < 128; x += 8) {
        const wave = Math.sin((x + i * 20) * 0.08) * 3;
        ctx.lineTo(x, y + wave);
      }
      ctx.stroke();
    }
    
    waterTexture.update();
    material.diffuseTexture = waterTexture;
    material.specularColor = specular;
    material.emissiveColor = emissive;
  } else if (hex.terrain === 'open') {
    // Grass/ground texture
    const groundTexture = new DynamicTexture(`ground-tex-${hex.q}-${hex.r}`, 128, scene);
    const ctx = groundTexture.getContext() as CanvasRenderingContext2D;
    
    ctx.fillStyle = '#3a3530';
    ctx.fillRect(0, 0, 128, 128);
    
    // Add dirt patches
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 128;
      const y = Math.random() * 128;
      const size = Math.random() * 2 + 1;
      const brightness = Math.random() * 20 - 10;
      ctx.fillStyle = `rgba(${50 + brightness}, ${45 + brightness}, ${40 + brightness}, 0.4)`;
      ctx.fillRect(x, y, size, size);
    }
    
    groundTexture.update();
    material.diffuseTexture = groundTexture;
  }
  
  // Add slight variation for visual interest
  const variation = (Math.sin(hex.q * 12.9898 + hex.r * 78.233) * 0.5 + 0.5) * 0.1;
  material.diffuseColor = material.diffuseColor.scale(1 - variation);

  // Add ambient color for depth
  material.ambientColor = material.diffuseColor.scale(0.3);

  hex3D.material = material;

  // Enable picking
  hex3D.metadata = { hex };
  hex3D.isPickable = true;
  hex3D.actionManager = new ActionManager(scene);
  hex3D.actionManager.registerAction(
    new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
      console.log('Hex clicked:', hex.q, hex.r, hex.terrain);
      onClick(hex);
    })
  );

  return hex3D;
}

// Helper function to create a 3D unit mesh with image texture
function createUnitMesh(
  unit: Unit, 
  hexSize: number, 
  scene: Scene,
  isSelected: boolean,
  onClick: (unit: Unit, event?: PointerEvent) => void,
  theme: ThemeConfig
): Mesh {
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (unit.position!.q + unit.position!.r / 2);
  const z = h * (3 / 4) * unit.position!.r;
  
  // Get the terrain height at this position
  const terrainHeight = theme.terrainHeights['open']; // TODO: Get actual terrain from grid
  const baseThickness = 0.5;
  
  // Calculate hex top position (same logic as in createHexMesh)
  let hexTopY: number;
  if (terrainHeight < 0) {
    // Water: top is lower
    const thickness = baseThickness + terrainHeight;
    hexTopY = terrainHeight / 2 + thickness / 2;
  } else {
    // Land: top is at baseThickness + heightOffset
    hexTopY = baseThickness + terrainHeight;
  }

  // Create unit as two planes (front and back) for proper texture orientation
  // Keep square aspect ratio for proper image display
  const unitWidth = 1.6; // Full hex width (hex size is ~1.732)
  const unitHeight = 1.6; // Same as width for square aspect ratio
  
  // Create a parent mesh to hold both planes
  const unitMesh = new Mesh(`unit-${unit.id}`, scene);
  // Position unit so its BOTTOM is at hexTopY (standing on top of hex)
  unitMesh.position = new Vector3(x, hexTopY + 0.05, z);

  // Player color for sides
  const playerColor = unit.owner === 0 
    ? new Color3(0.2, 0.4, 0.8)  // Blue for player 0
    : new Color3(0.8, 0.2, 0.2); // Red for player 1

  // Create a dynamic texture for the front and back faces with unit image - HIGHER RESOLUTION
  const faceTexture = new DynamicTexture(`unit-texture-${unit.id}`, 1024, scene, false);
  const ctx = faceTexture.getContext() as CanvasRenderingContext2D;
  
  // Create material for the card first
  const cardMaterial = new StandardMaterial(`unit-card-${unit.id}`, scene);
  cardMaterial.diffuseTexture = faceTexture;
  cardMaterial.diffuseColor = new Color3(2.5, 2.5, 2.5); // Very bright
  cardMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Very reflective
  cardMaterial.backFaceCulling = false; // Show both sides
  // Add emissive to make cards self-illuminated
  cardMaterial.emissiveTexture = faceTexture;
  cardMaterial.emissiveColor = new Color3(0.6, 0.6, 0.6); // Self-illuminated
  
  // Fill background with LIGHTER player color
  ctx.fillStyle = unit.owner === 0 ? '#3b5998' : '#b85450'; // Much lighter colors
  ctx.fillRect(0, 0, 1024, 1024);
  
  // Add border/frame
  ctx.strokeStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
  ctx.lineWidth = 16;
  ctx.strokeRect(8, 8, 1008, 1008);
  
  // Add health bar on RIGHT side (vertical)
  const barWidth = 100;
  const barX = 1024 - barWidth - 20;
  const barHeight = 800;
  const barY = 112;
  
  // Background
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(barX, barY, barWidth, barHeight);
  
  // Health bar (fills from bottom to top)
  const healthPercent = unit.wounds / unit.maxWounds;
  const filledHeight = barHeight * healthPercent;
  ctx.fillStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
  ctx.fillRect(barX + 8, barY + barHeight - filledHeight - 8, barWidth - 16, filledHeight);
  
  faceTexture.update();
  
  // Load and draw unit image asynchronously
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Clear and redraw everything with image
    ctx.fillStyle = unit.owner === 0 ? '#3b5998' : '#b85450';
    ctx.fillRect(0, 0, 1024, 1024);
    
    // Draw image in center (larger for better quality)
    const imgSize = 800;
    const offset = (1024 - imgSize) / 2;
    ctx.drawImage(img, offset, offset, imgSize, imgSize);
    
    // Add border/frame
    ctx.strokeStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = 16;
    ctx.strokeRect(8, 8, 1008, 1008);
    
    // Add health bar on RIGHT side (vertical)
    const barWidth = 100;
    const barX = 1024 - barWidth - 20;
    const barHeight = 800;
    const barY = 112;
    
    // Background
    ctx.fillStyle = '#0a0c12';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    
    // Health bar (fills from bottom to top)
    const healthPercent = unit.wounds / unit.maxWounds;
    const filledHeight = barHeight * healthPercent;
    ctx.fillStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
    ctx.fillRect(barX + 8, barY + barHeight - filledHeight - 8, barWidth - 16, filledHeight);
    
    faceTexture.update();
  };
  img.onerror = () => {
    console.error('Failed to load unit image:', unit.image);
  };
  img.src = unit.image;

  // Create a thin box for the card body
  const cardDepth = 0.05;
  const cardBox = MeshBuilder.CreateBox(
    `unit-box-${unit.id}`,
    { width: unitWidth, height: unitHeight, depth: cardDepth },
    scene
  );
  // Position box so its center is at unitHeight/2 (parent is at bottom of unit)
  cardBox.position = new Vector3(0, unitHeight / 2, 0);
  cardBox.parent = unitMesh;
  
  // Create side material (for the thin edges)
  const sideMaterial = new StandardMaterial(`unit-side-${unit.id}`, scene);
  sideMaterial.diffuseColor = playerColor.scale(2.0); // Brighter player color
  sideMaterial.emissiveColor = playerColor.scale(0.8); // Strong glow
  sideMaterial.specularColor = new Color3(1.0, 1.0, 1.0); // Very reflective
  cardBox.material = sideMaterial;

  // Create front plane (larger than box to sit on top)
  const frontPlane = MeshBuilder.CreatePlane(
    `unit-front-${unit.id}`,
    { width: unitWidth * 1.01, height: unitHeight * 1.01 },
    scene
  );
  // Position plane at center height, slightly in front
  frontPlane.position = new Vector3(0, unitHeight / 2, cardDepth / 2 + 0.001);
  cardMaterial.specularColor = new Color3(0.5, 0.5, 0.5); // Make more reflective
  frontPlane.material = cardMaterial;
  frontPlane.parent = unitMesh;

  // Create back plane (rotated 180 degrees, larger than box)
  const backPlane = MeshBuilder.CreatePlane(
    `unit-back-${unit.id}`,
    { width: unitWidth * 1.01, height: unitHeight * 1.01 },
    scene
  );
  // Position plane at center height, slightly behind
  backPlane.position = new Vector3(0, unitHeight / 2, -cardDepth / 2 - 0.001);
  backPlane.rotation.y = Math.PI; // Rotate 180 degrees so texture is right way up
  backPlane.material = cardMaterial;
  backPlane.parent = unitMesh;

  // Add connecting pole from top-right corner to health circle
  const poleHeight = 0.5;
  const pole = MeshBuilder.CreateCylinder(
    `health-pole-${unit.id}`,
    { height: poleHeight, diameter: 0.05, tessellation: 8 },
    scene
  );
  pole.position = new Vector3(unitWidth / 2, unitHeight + poleHeight / 2, 0);
  pole.parent = unitMesh;
  
  // Check if unit is activated for pole color
  const isActivated = (unit as any).activated;
  
  const poleMat = new StandardMaterial(`pole-mat-${unit.id}`, scene);
  if (isActivated) {
    poleMat.diffuseColor = new Color3(0.4, 0.4, 0.4); // Gray for used units
    poleMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
  } else {
    poleMat.diffuseColor = playerColor.scale(1.5); // Player color for ready units
    poleMat.emissiveColor = playerColor.scale(0.5);
  }
  pole.material = poleMat;
  
  // Add health number circle - connected to pole (as a plane facing camera)
  const healthCircle = MeshBuilder.CreatePlane(
    `health-circle-${unit.id}`,
    { size: 0.8 },
    scene
  );
  healthCircle.position = new Vector3(unitWidth / 2, unitHeight + poleHeight + 0.4, 0);
  healthCircle.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera
  healthCircle.parent = unitMesh;
  
  // Create texture for health number
  const healthTexture = new DynamicTexture(`health-tex-${unit.id}`, 256, scene);
  const hCtx = healthTexture.getContext() as CanvasRenderingContext2D;
  
  // Draw circle background - GRAY if activated, player color if ready
  if (isActivated) {
    hCtx.fillStyle = '#666666'; // Gray for used units
  } else {
    hCtx.fillStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444'; // Player color for ready units
  }
  hCtx.beginPath();
  hCtx.arc(128, 128, 120, 0, Math.PI * 2);
  hCtx.fill();
  
  // White border
  hCtx.strokeStyle = 'white';
  hCtx.lineWidth = 8;
  hCtx.stroke();
  
  // Health number
  hCtx.fillStyle = 'white';
  hCtx.font = 'bold 140px Arial';
  hCtx.textAlign = 'center';
  hCtx.textBaseline = 'middle';
  hCtx.fillText(`${unit.wounds}`, 128, 128);
  
  healthTexture.update();
  
  const healthMat = new StandardMaterial(`health-mat-${unit.id}`, scene);
  healthMat.diffuseTexture = healthTexture;
  healthMat.emissiveTexture = healthTexture;
  healthMat.emissiveColor = new Color3(1.0, 1.0, 1.0); // Very bright
  healthMat.backFaceCulling = false;
  healthCircle.material = healthMat;

  // Add activation indicator if unit is activated - LARGE overlay
  if ((unit as any).activated) {
    const indicatorSize = unitWidth * 0.9; // Cover most of the card
    const indicator = MeshBuilder.CreatePlane(
      `activated-${unit.id}`,
      { width: indicatorSize, height: unitHeight * 0.9 },
      scene
    );
    // Position in center of card, slightly in front
    indicator.position = new Vector3(0, unitHeight / 2, cardDepth / 2 + 0.003);
    indicator.parent = unitMesh;
    indicator.isPickable = false;
    
    // Create semi-transparent dark overlay with USED text
    const indicatorTexture = new DynamicTexture(`activated-tex-${unit.id}`, 512, scene);
    const iCtx = indicatorTexture.getContext() as CanvasRenderingContext2D;
    
    // Dark semi-transparent background
    iCtx.fillStyle = 'rgba(20, 20, 20, 0.75)';
    iCtx.fillRect(0, 0, 512, 512);
    
    // Large USED text
    iCtx.fillStyle = '#ff4444';
    iCtx.font = 'bold 120px Arial';
    iCtx.textAlign = 'center';
    iCtx.textBaseline = 'middle';
    iCtx.fillText('USED', 256, 256);
    
    // Add X symbol
    iCtx.strokeStyle = '#ff4444';
    iCtx.lineWidth = 20;
    iCtx.beginPath();
    iCtx.moveTo(100, 100);
    iCtx.lineTo(412, 412);
    iCtx.moveTo(412, 100);
    iCtx.lineTo(100, 412);
    iCtx.stroke();
    
    indicatorTexture.update();
    
    const indicatorMat = new StandardMaterial(`activated-mat-${unit.id}`, scene);
    indicatorMat.diffuseTexture = indicatorTexture;
    indicatorMat.emissiveColor = new Color3(0.8, 0.2, 0.2); // Red glow
    indicatorMat.opacityTexture = indicatorTexture;
    indicator.material = indicatorMat;
  }

  // Add spotlight for unit - from above to illuminate both unit and hex
  const unitSpotlight = new SpotLight(
    `unit-spotlight-${unit.id}`,
    new Vector3(0, unitHeight + 2, 0),
    new Vector3(0, -1, 0),
    Math.PI / 3,
    2,
    scene
  );
  
  // Player colors: Player 0 = Blue, Player 1 = Red
  if (unit.owner === 0) {
    unitSpotlight.diffuse = new Color3(0.6, 0.9, 1.0); // Very bright Blue
    unitSpotlight.specular = new Color3(0.4, 0.6, 0.9);
  } else {
    unitSpotlight.diffuse = new Color3(1.0, 0.6, 0.6); // Very bright Red
    unitSpotlight.specular = new Color3(0.9, 0.4, 0.4);
  }
  
  // Dim the light if unit is activated (can't be used this round)
  if ((unit as any).activated) {
    unitSpotlight.intensity = 1.5; // Dim but still visible
  } else {
    unitSpotlight.intensity = 6.0; // Very bright spotlight
  }
  
  unitSpotlight.range = 15; // Large range
  unitSpotlight.parent = unitMesh; // Attach to unit so it moves with it

  // Enable picking on all child meshes
  unitMesh.metadata = { unit };
  unitMesh.isPickable = true;
  
  // Make all children pickable and forward clicks to parent
  [cardBox, frontPlane, backPlane].forEach(child => {
    child.isPickable = true;
    child.metadata = { unit };
    child.actionManager = new ActionManager(scene);
    
    // Left click
    child.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnPickTrigger, (evt) => {
        console.log('Unit clicked:', unit.name, unit.id);
        // Stop event propagation to prevent hex click
        if (evt.sourceEvent) {
          evt.sourceEvent.stopPropagation();
        }
        onClick(unit, evt.sourceEvent as PointerEvent);
      })
    );
    
    // Right click for context menu
    child.actionManager.registerAction(
      new ExecuteCodeAction(ActionManager.OnRightPickTrigger, (evt) => {
        console.log('Unit right-clicked:', unit.name, unit.id);
        if (evt.sourceEvent) {
          evt.sourceEvent.stopPropagation();
        }
        onClick(unit, evt.sourceEvent as PointerEvent);
      })
    );
  });

  return unitMesh;
}

// Helper function to create a 3D objective marker (floating hologram)
function createObjectiveMesh(
  objective: import('@/types/battle').ObjectiveMarker,
  hexSize: number,
  scene: Scene,
  theme: ThemeConfig
): Mesh {
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (objective.position.q + objective.position.r / 2);
  const z = h * (3 / 4) * objective.position.r;
  
  // Get hex top position
  const terrainHeight = theme.terrainHeights['open']; // TODO: Get actual terrain
  const baseThickness = 0.5;
  
  // Calculate hex top position (same logic as in createHexMesh)
  let hexTopY: number;
  if (terrainHeight < 0) {
    // Water: top is lower
    const thickness = baseThickness + terrainHeight;
    hexTopY = terrainHeight / 2 + thickness / 2;
  } else {
    // Land: top is at baseThickness + heightOffset
    hexTopY = baseThickness + terrainHeight;
  }

  // Create floating hexagonal marker
  const markerHeight = 0.3;
  const markerSize = 0.5;
  const floatHeight = 2.0; // Float above hex top
  
  const marker = MeshBuilder.CreateCylinder(
    `objective-${objective.id}`,
    {
      height: markerHeight,
      diameter: markerSize * 2,
      tessellation: 6,
    },
    scene
  );

  marker.position = new Vector3(x, hexTopY + floatHeight, z);
  marker.rotation.y = Math.PI / 6;
  marker.isPickable = false; // Don't block hex clicks

  // Add floating animation
  const floatAnim = new Animation(
    `float-${objective.id}`,
    'position.y',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );
  
  const keys = [
    { frame: 0, value: hexTopY + floatHeight },
    { frame: 60, value: hexTopY + floatHeight + 0.2 },
    { frame: 120, value: hexTopY + floatHeight }
  ];
  
  floatAnim.setKeys(keys);
  marker.animations.push(floatAnim);
  scene.beginAnimation(marker, 0, 120, true);

  // Add rotation animation
  const rotAnim = new Animation(
    `rotate-${objective.id}`,
    'rotation.y',
    30,
    Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );
  
  const rotKeys = [
    { frame: 0, value: Math.PI / 6 },
    { frame: 180, value: Math.PI / 6 + Math.PI * 2 }
  ];
  
  rotAnim.setKeys(rotKeys);
  marker.animations.push(rotAnim);
  scene.beginAnimation(marker, 0, 180, true);

  // Material based on control status
  const material = new StandardMaterial(`obj-mat-${objective.id}`, scene);
  
  if (objective.contested) {
    material.diffuseColor = new Color3(1.0, 0.6, 0.0); // Orange
    material.emissiveColor = new Color3(0.8, 0.4, 0.0);
  } else if (objective.controlledBy === 0) {
    material.diffuseColor = new Color3(0.3, 0.5, 1.0); // Blue
    material.emissiveColor = new Color3(0.2, 0.4, 0.8);
  } else if (objective.controlledBy === 1) {
    material.diffuseColor = new Color3(1.0, 0.3, 0.3); // Red
    material.emissiveColor = new Color3(0.8, 0.2, 0.2);
  } else {
    material.diffuseColor = new Color3(0.5, 0.5, 0.5); // Gray (neutral)
    material.emissiveColor = new Color3(0.3, 0.3, 0.3);
  }

  material.alpha = 0.7; // Semi-transparent
  marker.material = material;

  // Add number text (using dynamic texture) - positioned ON the marker
  const textPlane = MeshBuilder.CreatePlane(
    `obj-text-${objective.id}`,
    { size: 0.6 },
    scene
  );
  textPlane.position = new Vector3(0, 0, 0); // Relative to parent (marker)
  textPlane.billboardMode = Mesh.BILLBOARDMODE_ALL; // Always face camera
  textPlane.isPickable = false; // Don't block hex clicks

  const textTexture = new DynamicTexture(`obj-text-tex-${objective.id}`, 256, scene);
  const textMaterial = new StandardMaterial(`obj-text-mat-${objective.id}`, scene);
  textMaterial.diffuseTexture = textTexture;
  textMaterial.emissiveColor = new Color3(1.5, 1.5, 1.5); // Bright white
  textMaterial.opacityTexture = textTexture;
  textMaterial.backFaceCulling = false;
  textPlane.material = textMaterial;

  const ctx = textTexture.getContext() as CanvasRenderingContext2D;
  ctx.fillStyle = 'white';
  ctx.font = 'bold 120px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(objective.id.toString(), 128, 128);
  textTexture.update();

  // Parent text to marker so they move together
  textPlane.parent = marker;

  // Add light beam from marker to ground - extends to neighboring hexes (1 hex radius)
  const beamHeight = floatHeight;
  // Hex distance calculation: sqrt(3) * hexSize ≈ 1.73 for adjacent hex
  const beamRadius = 2.2; // Covers center + 1 hex radius exactly
  
  const beam = MeshBuilder.CreateCylinder(
    `obj-beam-${objective.id}`,
    {
      height: beamHeight,
      diameterTop: markerSize * 1.5,
      diameterBottom: beamRadius * 2, // Diameter = 4.4 (covers 1 hex around)
      tessellation: 32,
    },
    scene
  );
  beam.position = new Vector3(x, hexTopY + floatHeight - beamHeight / 2, z);
  beam.isPickable = false; // Don't block hex clicks
  
  const beamMat = new StandardMaterial(`obj-beam-mat-${objective.id}`, scene);
  
  if (objective.contested) {
    beamMat.diffuseColor = new Color3(1.0, 0.6, 0.0);
    beamMat.emissiveColor = new Color3(0.5, 0.3, 0.0);
  } else if (objective.controlledBy === 0) {
    beamMat.diffuseColor = new Color3(0.3, 0.5, 1.0);
    beamMat.emissiveColor = new Color3(0.15, 0.25, 0.5);
  } else if (objective.controlledBy === 1) {
    beamMat.diffuseColor = new Color3(1.0, 0.3, 0.3);
    beamMat.emissiveColor = new Color3(0.5, 0.15, 0.15);
  } else {
    beamMat.diffuseColor = new Color3(0.5, 0.5, 0.5);
    beamMat.emissiveColor = new Color3(0.2, 0.2, 0.2);
  }
  
  beamMat.alpha = 0.3; // Semi-transparent beam
  beam.material = beamMat;

  return marker;
}

// Helper function to create 3D terrain objects (buildings, debris, mountains)
function createTerrainObjects(hex: Hex, hexSize: number, scene: Scene, buildingPositions: Set<string>, theme: ThemeConfig): Mesh[] {
  const objects: Mesh[] = [];
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (hex.q + hex.r / 2);
  const z = h * (3 / 4) * hex.r;
  const terrainHeight = theme.terrainHeights[hex.terrain];
  const baseThickness = 0.5;
  
  let hexTopY: number;
  if (terrainHeight < 0) {
    const thickness = baseThickness + terrainHeight;
    hexTopY = terrainHeight / 2 + thickness / 2;
  } else {
    hexTopY = baseThickness + terrainHeight;
  }
  
  // Helper to check if hex is near water
  const isNearWater = (q: number, r: number, radius: number = 1): boolean => {
    const neighbors = [
      [q + 1, r], [q - 1, r],
      [q, r + 1], [q, r - 1],
      [q + 1, r - 1], [q - 1, r + 1]
    ];
    for (const [nq, nr] of neighbors) {
      const key = `${nq},${nr}`;
      if (buildingPositions.has(key)) return true;
    }
    return false;
  };

  // Mountains: Create rocky formations (skip for Minecraft worlds)
  // Use SAME detection as buildings!
  const isMinecraftWorld = (theme.terrainColors.open.g > 0.6 && theme.ambientIntensity > 0.85 && theme.terrainColors.water.b < 0.8) || 
                           (theme.terrainColors.open.r > 0.65 && theme.terrainColors.water.b > 0.75 && theme.ambientIntensity > 0.8 && theme.ambientIntensity < 0.9);
  
  if (hex.terrain === 'mountain' && !isMinecraftWorld) {
    const numRocks = Math.floor(Math.random() * 3) + 2;
    for (let i = 0; i < numRocks; i++) {
      const offsetX = (Math.random() - 0.5) * hexSize * 0.8;
      const offsetZ = (Math.random() - 0.5) * hexSize * 0.8;
      const rockHeight = Math.random() * 1.5 + 1.0;
      const rockSize = Math.random() * 0.4 + 0.3;
      
      const rock = MeshBuilder.CreateBox(
        `rock-${hex.q}-${hex.r}-${i}`,
        { width: rockSize, height: rockHeight, depth: rockSize },
        scene
      );
      rock.position = new Vector3(x + offsetX, hexTopY + rockHeight / 2, z + offsetZ);
      rock.rotation.y = Math.random() * Math.PI;
      rock.scaling.y = 1 + Math.random() * 0.5;
      
      const rockMat = new StandardMaterial(`rock-mat-${hex.q}-${hex.r}-${i}`, scene);
      rockMat.diffuseColor = new Color3(0.3, 0.28, 0.26);
      rockMat.specularColor = new Color3(0.1, 0.1, 0.1);
      rock.material = rockMat;
      
      objects.push(rock);
    }
  }

  // Rocks: Smaller rock formations
  if (hex.terrain === 'rock') {
    const numRocks = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < numRocks; i++) {
      const offsetX = (Math.random() - 0.5) * hexSize * 0.6;
      const offsetZ = (Math.random() - 0.5) * hexSize * 0.6;
      const rockHeight = Math.random() * 0.8 + 0.4;
      const rockSize = Math.random() * 0.3 + 0.2;
      
      const rock = MeshBuilder.CreateBox(
        `rock-${hex.q}-${hex.r}-${i}`,
        { width: rockSize, height: rockHeight, depth: rockSize },
        scene
      );
      rock.position = new Vector3(x + offsetX, hexTopY + rockHeight / 2, z + offsetZ);
      rock.rotation.y = Math.random() * Math.PI;
      
      const rockMat = new StandardMaterial(`rock-mat-${hex.q}-${hex.r}-${i}`, scene);
      rockMat.diffuseColor = new Color3(0.35, 0.32, 0.3);
      rock.material = rockMat;
      
      objects.push(rock);
    }
  }

  // Theme-specific structures
  const hexKey = `${hex.q},${hex.r}`;
  
  // Determine structure type based on theme - CHECK MINECRAFT FIRST!
  // Minecraft Village: green grass (g > 0.6) + bright (ambient > 0.85) + NOT too blue water
  const isMinecraftVillage = theme.terrainColors.open.g > 0.6 && theme.ambientIntensity > 0.85 && theme.terrainColors.water.b < 0.8;
  // Minecraft Island: sandy (r > 0.65) + ocean water (b > 0.75) + moderate brightness
  const isMinecraftIsland = theme.terrainColors.open.r > 0.65 && theme.terrainColors.water.b > 0.75 && theme.ambientIntensity > 0.8 && theme.ambientIntensity < 0.9;
  const isLavaWorld = theme.terrainColors.water.r > 0.6;
  // Ice World: very bright + blue water + white terrain (high r, g, b)
  const isIceWorld = theme.terrainColors.open.r > 0.6 && theme.terrainColors.open.g > 0.7 && theme.terrainColors.open.b > 0.8;
  const isGrassland = theme.ambientIntensity > 0.7 && !isMinecraftVillage && !isMinecraftIsland && !isIceWorld; // Grassland but not Minecraft
  const isJungle = hex.terrain === 'forest' || (theme.ambientIntensity < 0.7 && !isLavaWorld && !isIceWorld && !isMinecraftVillage && !isMinecraftIsland);
  
  // Debug: Log once per grid generation
  if (hex.q === 0 && hex.r === 0) {
    console.log('🏘️ Theme detection:', {
      isMinecraftVillage,
      isMinecraftIsland,
      isLavaWorld,
      isIceWorld,
      isGrassland,
      openG: theme.terrainColors.open.g,
      ambient: theme.ambientIntensity,
      openR: theme.terrainColors.open.r,
      waterB: theme.terrainColors.water.b
    });
  }
  
  // Lower spawn rate for Minecraft villages
  const spawnChance = (isMinecraftVillage || isMinecraftIsland) ? 0.12 : 0.08;
  
  // In Minecraft worlds, place structures on open, road AND ruin terrain (no mountains)
  const canPlaceStructure = 
    ((isMinecraftVillage || isMinecraftIsland) ? 
      (hex.terrain === 'open' || hex.terrain === 'ruin' || hex.terrain === 'road') && Math.random() < spawnChance :
      (hex.terrain === 'ruin' || (hex.terrain === 'open' && Math.random() < spawnChance))
    ) &&
    terrainHeight >= 0 && // Only on land, not in water (shipwrecks are on land in Minecraft)
    !buildingPositions.has(hexKey) &&
    !(isMinecraftIsland ? false : isNearWater(hex.q, hex.r)); // Allow near water for island shipwrecks
  
  // Debug: Log when placing structures
  if (canPlaceStructure && (hex.q === 0 || hex.q === 1) && hex.r === 0) {
    console.log('🏠 Placing structure on hex', hex.q, hex.r, '- isMinecraftVillage:', isMinecraftVillage);
  }
  
  if (canPlaceStructure) {
    // Mark this hex as having a building (blocks movement/deployment, provides cover)
    hex.hasBuilding = true;
    
    // Mark this position and neighbors as occupied
    buildingPositions.add(hexKey);
    buildingPositions.add(`${hex.q + 1},${hex.r}`);
    buildingPositions.add(`${hex.q - 1},${hex.r}`);
    buildingPositions.add(`${hex.q},${hex.r + 1}`);
    buildingPositions.add(`${hex.q},${hex.r - 1}`);
    
    let building: Mesh;
    let buildingHeight: number = 0;
    let buildingWidth: number = 0;
    let buildingDepth: number = 0;
    let skipDefaultTexture = false;
    
    // CHECK MINECRAFT FIRST before other themes!
    if (isMinecraftVillage) {
      // MINECRAFT VILLAGE HOUSE - detailed with stone base, white walls, wood beams
      buildingHeight = Math.random() * 1.8 + 1.5;
      buildingWidth = Math.random() * 1.8 + 1.5;
      buildingDepth = buildingWidth * 0.85;
      
      // Stone foundation/base
      const baseHeight = 0.3;
      const base = MeshBuilder.CreateBox(
        `mc-base-${hex.q}-${hex.r}`,
        { width: buildingWidth + 0.1, height: baseHeight, depth: buildingDepth + 0.1 },
        scene
      );
      base.position = new Vector3(x, hexTopY + baseHeight / 2, z);
      
      const baseMat = new StandardMaterial(`mc-base-mat-${hex.q}-${hex.r}`, scene);
      const baseTexture = new DynamicTexture(`mc-base-tex-${hex.q}-${hex.r}`, 128, scene);
      const bCtx = baseTexture.getContext() as CanvasRenderingContext2D;
      
      // Cobblestone texture
      bCtx.fillStyle = '#7A7A7A';
      bCtx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 20; i++) {
        bCtx.fillStyle = i % 2 === 0 ? '#6A6A6A' : '#8A8A8A';
        bCtx.fillRect(Math.random() * 128, Math.random() * 128, 16, 16);
      }
      baseTexture.update();
      baseMat.diffuseTexture = baseTexture;
      base.material = baseMat;
      objects.push(base);
      
      // Main house body (white/beige plaster)
      building = MeshBuilder.CreateBox(
        `mc-house-${hex.q}-${hex.r}`,
        { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
        scene
      );
      building.position = new Vector3(x, hexTopY + baseHeight + buildingHeight / 2, z);
      
      const houseMat = new StandardMaterial(`mc-house-mat-${hex.q}-${hex.r}`, scene);
      const houseTexture = new DynamicTexture(`mc-house-tex-${hex.q}-${hex.r}`, 512, scene);
      const hCtx = houseTexture.getContext() as CanvasRenderingContext2D;
      
      // White/beige plaster background
      hCtx.fillStyle = '#E8D4B8';
      hCtx.fillRect(0, 0, 512, 512);
      
      // Dark oak wood beams (vertical)
      const beamWidth = 40;
      const beamColor = '#5C4033';
      for (let i = 0; i < 4; i++) {
        const beamX = i * 128 + 20;
        hCtx.fillStyle = beamColor;
        hCtx.fillRect(beamX, 0, beamWidth, 512);
        // Wood grain
        for (let j = 0; j < 10; j++) {
          hCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          hCtx.lineWidth = 2;
          hCtx.beginPath();
          hCtx.moveTo(beamX, j * 51);
          hCtx.lineTo(beamX + beamWidth, j * 51);
          hCtx.stroke();
        }
      }
      
      // Horizontal beams
      for (let i = 0; i < 3; i++) {
        const beamY = i * 170 + 20;
        hCtx.fillStyle = beamColor;
        hCtx.fillRect(0, beamY, 512, beamWidth);
      }
      
      // Window (dark)
      hCtx.fillStyle = '#3A3A3A';
      hCtx.fillRect(200, 180, 100, 120);
      hCtx.strokeStyle = beamColor;
      hCtx.lineWidth = 8;
      hCtx.strokeRect(200, 180, 100, 120);
      
      houseTexture.update();
      houseMat.diffuseTexture = houseTexture;
      houseMat.diffuseColor = new Color3(1, 1, 1);
      building.material = houseMat;
      objects.push(building);
      
      // Oak plank roof (flat, blocky Minecraft style)
      const roofHeight = 0.3;
      const roofWidth = buildingWidth + 0.4;
      const roofDepth = buildingDepth + 0.4;
      
      const roof = MeshBuilder.CreateBox(
        `mc-roof-${hex.q}-${hex.r}`,
        { width: roofWidth, height: roofHeight, depth: roofDepth },
        scene
      );
      roof.position = new Vector3(x, hexTopY + baseHeight + buildingHeight + roofHeight / 2, z);
      
      const roofMat = new StandardMaterial(`mc-roof-mat-${hex.q}-${hex.r}`, scene);
      const roofTexture = new DynamicTexture(`mc-roof-tex-${hex.q}-${hex.r}`, 256, scene);
      const rCtx = roofTexture.getContext() as CanvasRenderingContext2D;
      
      // Oak planks (horizontal strips)
      rCtx.fillStyle = '#9C7F4E';
      rCtx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) {
        const stripY = i * 16;
        rCtx.fillStyle = i % 2 === 0 ? '#8B6F47' : '#A68C5A';
        rCtx.fillRect(0, stripY, 256, 16);
        rCtx.strokeStyle = '#6B5437';
        rCtx.lineWidth = 1;
        rCtx.strokeRect(0, stripY, 256, 16);
      }
      roofTexture.update();
      roofMat.diffuseTexture = roofTexture;
      roofMat.diffuseColor = new Color3(1, 1, 1);
      roof.material = roofMat;
      objects.push(roof);
      
      // Chimney (cobblestone)
      if (Math.random() < 0.6) {
        const chimney = MeshBuilder.CreateBox(
          `chimney-${hex.q}-${hex.r}`,
          { width: 0.3, height: 0.8, depth: 0.3 },
          scene
        );
        chimney.position = new Vector3(x + buildingWidth * 0.3, hexTopY + baseHeight + buildingHeight + roofHeight * 0.6 + 0.4, z);
        chimney.material = baseMat;
        objects.push(chimney);
      }
      
      skipDefaultTexture = true;
    } else if (isLavaWorld) {
      // VOLCANO - detailed with rocky texture
      buildingHeight = Math.random() * 4 + 3;
      const volcanoBase = Math.random() * 2 + 2;
      building = MeshBuilder.CreateCylinder(
        `volcano-${hex.q}-${hex.r}`,
        { height: buildingHeight, diameterTop: volcanoBase * 0.2, diameterBottom: volcanoBase, tessellation: 12 },
        scene
      );
      building.position = new Vector3(x, hexTopY + buildingHeight / 2, z);
      building.rotation.y = Math.random() * Math.PI;
      
      // Create lava texture
      const volcanoTexture = new DynamicTexture(`volcano-tex-${hex.q}-${hex.r}`, 256, scene);
      const vCtx = volcanoTexture.getContext() as CanvasRenderingContext2D;
      
      // Dark volcanic rock base
      vCtx.fillStyle = '#1a1510';
      vCtx.fillRect(0, 0, 256, 256);
      
      // Add lava cracks
      for (let i = 0; i < 20; i++) {
        vCtx.strokeStyle = `rgba(255, ${100 + Math.random() * 50}, 20, ${0.3 + Math.random() * 0.4})`;
        vCtx.lineWidth = Math.random() * 3 + 1;
        vCtx.beginPath();
        vCtx.moveTo(Math.random() * 256, Math.random() * 256);
        vCtx.lineTo(Math.random() * 256, Math.random() * 256);
        vCtx.stroke();
      }
      
      // Add rocky texture
      for (let i = 0; i < 100; i++) {
        const size = Math.random() * 8 + 2;
        vCtx.fillStyle = `rgba(${20 + Math.random() * 30}, ${15 + Math.random() * 20}, ${10}, 0.5)`;
        vCtx.fillRect(Math.random() * 256, Math.random() * 256, size, size);
      }
      
      volcanoTexture.update();
      
      const volcanoMat = new StandardMaterial(`volcano-mat-${hex.q}-${hex.r}`, scene);
      volcanoMat.diffuseTexture = volcanoTexture;
      volcanoMat.diffuseColor = new Color3(0.8, 0.8, 0.8);
      volcanoMat.emissiveColor = new Color3(0.5, 0.2, 0.05); // Glowing
      volcanoMat.specularColor = new Color3(0.1, 0.05, 0.02);
      building.material = volcanoMat;
      objects.push(building);
      
      // Add lava glow at top
      const lavaGlow = MeshBuilder.CreateCylinder(
        `lava-${hex.q}-${hex.r}`,
        { height: 0.2, diameter: volcanoBase * 0.4, tessellation: 12 },
        scene
      );
      lavaGlow.position = new Vector3(x, hexTopY + buildingHeight + 0.1, z);
      const lavaMat = new StandardMaterial(`lava-mat-${hex.q}-${hex.r}`, scene);
      lavaMat.diffuseColor = new Color3(1.0, 0.4, 0.1);
      lavaMat.emissiveColor = new Color3(1.0, 0.5, 0.2);
      lavaGlow.material = lavaMat;
      objects.push(lavaGlow);
      
      skipDefaultTexture = true;
    } else if (isIceWorld) {
      // ICEBERG - jagged and crystalline
      buildingHeight = Math.random() * 3 + 2;
      buildingWidth = Math.random() * 2 + 1.5;
      
      // Create multiple ice crystals for jagged look
      const numCrystals = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < numCrystals; i++) {
        const crystalHeight = buildingHeight * (0.6 + Math.random() * 0.4);
        const crystalWidth = buildingWidth * (0.5 + Math.random() * 0.3);
        const offsetX = (Math.random() - 0.5) * buildingWidth * 0.4;
        const offsetZ = (Math.random() - 0.5) * buildingWidth * 0.4;
        
        const crystal = MeshBuilder.CreateCylinder(
          `ice-crystal-${hex.q}-${hex.r}-${i}`,
          { height: crystalHeight, diameterTop: crystalWidth * 0.2, diameterBottom: crystalWidth, tessellation: 6 },
          scene
        );
        crystal.position = new Vector3(x + offsetX, hexTopY + crystalHeight / 2, z + offsetZ);
        crystal.rotation.y = Math.random() * Math.PI;
        crystal.rotation.x = (Math.random() - 0.5) * 0.2;
        crystal.rotation.z = (Math.random() - 0.5) * 0.2;
        
        const iceMat = new StandardMaterial(`ice-mat-${hex.q}-${hex.r}-${i}`, scene);
        iceMat.diffuseColor = new Color3(0.85, 0.92, 1.0);
        iceMat.specularColor = new Color3(1.0, 1.0, 1.0);
        iceMat.specularPower = 128; // Very shiny
        iceMat.alpha = 0.9; // Slightly transparent
        iceMat.emissiveColor = new Color3(0.15, 0.18, 0.22);
        crystal.material = iceMat;
        objects.push(crystal);
      }
      
      building = objects[objects.length - 1]; // Reference last crystal for height calc
      skipDefaultTexture = true;
    } else if (isGrassland) {
      // COTTAGE
      buildingHeight = Math.random() * 1.5 + 1.2;
      buildingWidth = Math.random() * 1.2 + 1;
      buildingDepth = buildingWidth * 0.8;
      building = MeshBuilder.CreateBox(
        `cottage-${hex.q}-${hex.r}`,
        { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
        scene
      );
      building.position = new Vector3(x, hexTopY + buildingHeight / 2, z);
      const cottageMat = new StandardMaterial(`cottage-mat-${hex.q}-${hex.r}`, scene);
      cottageMat.diffuseColor = new Color3(0.6, 0.5, 0.4);
      building.material = cottageMat;
      objects.push(building);
      
      // Thatched Roof with texture
      const roof = MeshBuilder.CreateCylinder(
        `roof-${hex.q}-${hex.r}`,
        { height: buildingHeight * 0.6, diameterTop: 0.1, diameterBottom: buildingWidth * 1.3, tessellation: 4 },
        scene
      );
      roof.position = new Vector3(x, hexTopY + buildingHeight + buildingHeight * 0.3, z);
      roof.rotation.y = Math.PI / 4;
      
      // Create straw texture
      const thatchTexture = new DynamicTexture(`thatch-tex-${hex.q}-${hex.r}`, 256, scene);
      const tCtx = thatchTexture.getContext() as CanvasRenderingContext2D;
      
      // Base straw color
      tCtx.fillStyle = '#8B7355';
      tCtx.fillRect(0, 0, 256, 256);
      
      // Add straw strands (horizontal lines)
      for (let i = 0; i < 40; i++) {
        const y = (i / 40) * 256;
        tCtx.strokeStyle = `rgba(${120 + Math.random() * 40}, ${90 + Math.random() * 30}, ${50 + Math.random() * 20}, ${0.6 + Math.random() * 0.4})`;
        tCtx.lineWidth = Math.random() * 2 + 1;
        tCtx.beginPath();
        tCtx.moveTo(0, y);
        for (let x = 0; x < 256; x += 10) {
          tCtx.lineTo(x, y + (Math.random() - 0.5) * 3);
        }
        tCtx.stroke();
      }
      
      // Add texture variation
      for (let i = 0; i < 100; i++) {
        tCtx.fillStyle = `rgba(${100 + Math.random() * 50}, ${70 + Math.random() * 30}, ${40 + Math.random() * 20}, 0.3)`;
        tCtx.fillRect(Math.random() * 256, Math.random() * 256, Math.random() * 5 + 2, Math.random() * 3 + 1);
      }
      
      thatchTexture.update();
      
      const roofMat = new StandardMaterial(`roof-mat-${hex.q}-${hex.r}`, scene);
      roofMat.diffuseTexture = thatchTexture;
      roofMat.diffuseColor = new Color3(1, 1, 1);
      roofMat.specularColor = new Color3(0.1, 0.1, 0.1);
      roof.material = roofMat;
      objects.push(roof);
      skipDefaultTexture = true;
    } else if (isJungle && hex.terrain === 'forest') {
      // JUNGLE TREE
      buildingHeight = Math.random() * 5 + 4;
      const trunkHeight = buildingHeight * 0.6;
      const trunk = MeshBuilder.CreateCylinder(
        `tree-${hex.q}-${hex.r}`,
        { height: trunkHeight, diameterTop: 0.3, diameterBottom: 0.5, tessellation: 8 },
        scene
      );
      trunk.position = new Vector3(x, hexTopY + trunkHeight / 2, z);
      const trunkMat = new StandardMaterial(`trunk-mat-${hex.q}-${hex.r}`, scene);
      trunkMat.diffuseColor = new Color3(0.3, 0.2, 0.15);
      trunk.material = trunkMat;
      objects.push(trunk);
      
      // Canopy
      building = MeshBuilder.CreateSphere(
        `canopy-${hex.q}-${hex.r}`,
        { diameter: Math.random() * 3 + 2.5, segments: 8 },
        scene
      );
      building.position = new Vector3(x, hexTopY + trunkHeight + 1, z);
      building.scaling.y = 0.7;
      const canopyMat = new StandardMaterial(`canopy-mat-${hex.q}-${hex.r}`, scene);
      canopyMat.diffuseColor = new Color3(0.2, 0.4, 0.2);
      canopyMat.emissiveColor = new Color3(0.05, 0.1, 0.05);
      building.material = canopyMat;
      objects.push(building);
      skipDefaultTexture = true;
    } else if (isMinecraftVillage) {
      // MINECRAFT VILLAGE HOUSE - detailed with stone base, white walls, wood beams
      buildingHeight = Math.random() * 1.8 + 1.5;
      buildingWidth = Math.random() * 1.8 + 1.5;
      buildingDepth = buildingWidth * 0.85;
      
      // Stone foundation/base
      const baseHeight = 0.3;
      const base = MeshBuilder.CreateBox(
        `mc-base-${hex.q}-${hex.r}`,
        { width: buildingWidth + 0.1, height: baseHeight, depth: buildingDepth + 0.1 },
        scene
      );
      base.position = new Vector3(x, hexTopY + baseHeight / 2, z);
      
      const baseMat = new StandardMaterial(`mc-base-mat-${hex.q}-${hex.r}`, scene);
      const baseTexture = new DynamicTexture(`mc-base-tex-${hex.q}-${hex.r}`, 128, scene);
      const bCtx = baseTexture.getContext() as CanvasRenderingContext2D;
      
      // Cobblestone texture
      bCtx.fillStyle = '#7A7A7A';
      bCtx.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 20; i++) {
        bCtx.fillStyle = i % 2 === 0 ? '#6A6A6A' : '#8A8A8A';
        bCtx.fillRect(Math.random() * 128, Math.random() * 128, 16, 16);
      }
      baseTexture.update();
      baseMat.diffuseTexture = baseTexture;
      base.material = baseMat;
      objects.push(base);
      
      // Main house body (white/beige plaster)
      building = MeshBuilder.CreateBox(
        `mc-house-${hex.q}-${hex.r}`,
        { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
        scene
      );
      building.position = new Vector3(x, hexTopY + baseHeight + buildingHeight / 2, z);
      
      const houseMat = new StandardMaterial(`mc-house-mat-${hex.q}-${hex.r}`, scene);
      const houseTexture = new DynamicTexture(`mc-house-tex-${hex.q}-${hex.r}`, 512, scene);
      const hCtx = houseTexture.getContext() as CanvasRenderingContext2D;
      
      // White/beige plaster background
      hCtx.fillStyle = '#E8D4B8';
      hCtx.fillRect(0, 0, 512, 512);
      
      // Dark oak wood beams (vertical)
      const beamWidth = 40;
      const beamColor = '#5C4033';
      for (let i = 0; i < 4; i++) {
        const x = i * 128 + 20;
        hCtx.fillStyle = beamColor;
        hCtx.fillRect(x, 0, beamWidth, 512);
        // Wood grain
        for (let j = 0; j < 10; j++) {
          hCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          hCtx.lineWidth = 2;
          hCtx.beginPath();
          hCtx.moveTo(x, j * 51);
          hCtx.lineTo(x + beamWidth, j * 51);
          hCtx.stroke();
        }
      }
      
      // Horizontal beams
      for (let i = 0; i < 3; i++) {
        const y = i * 170 + 20;
        hCtx.fillStyle = beamColor;
        hCtx.fillRect(0, y, 512, beamWidth);
      }
      
      // Window (dark)
      hCtx.fillStyle = '#3A3A3A';
      hCtx.fillRect(200, 180, 100, 120);
      hCtx.strokeStyle = beamColor;
      hCtx.lineWidth = 8;
      hCtx.strokeRect(200, 180, 100, 120);
      
      houseTexture.update();
      houseMat.diffuseTexture = houseTexture;
      houseMat.diffuseColor = new Color3(1, 1, 1);
      building.material = houseMat;
      objects.push(building);
      
      // Oak plank roof (flat, blocky Minecraft style)
      const roofHeight = 0.3; // Much flatter
      const roofWidth = buildingWidth + 0.4;
      const roofDepth = buildingDepth + 0.4;
      
      const roof = MeshBuilder.CreateBox(
        `mc-roof-${hex.q}-${hex.r}`,
        { width: roofWidth, height: roofHeight, depth: roofDepth },
        scene
      );
      roof.position = new Vector3(x, hexTopY + baseHeight + buildingHeight + roofHeight / 2, z);
      
      const roofMat = new StandardMaterial(`mc-roof-mat-${hex.q}-${hex.r}`, scene);
      const roofTexture = new DynamicTexture(`mc-roof-tex-${hex.q}-${hex.r}`, 256, scene);
      const rCtx = roofTexture.getContext() as CanvasRenderingContext2D;
      
      // Oak planks (horizontal strips)
      rCtx.fillStyle = '#9C7F4E';
      rCtx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 16; i++) {
        const y = i * 16;
        rCtx.fillStyle = i % 2 === 0 ? '#8B6F47' : '#A68C5A';
        rCtx.fillRect(0, y, 256, 16);
        rCtx.strokeStyle = '#6B5437';
        rCtx.lineWidth = 1;
        rCtx.strokeRect(0, y, 256, 16);
      }
      roofTexture.update();
      roofMat.diffuseTexture = roofTexture;
      roofMat.diffuseColor = new Color3(1, 1, 1);
      roof.material = roofMat;
      objects.push(roof);
      
      // Chimney (cobblestone)
      if (Math.random() < 0.6) {
        const chimney = MeshBuilder.CreateBox(
          `chimney-${hex.q}-${hex.r}`,
          { width: 0.3, height: 0.8, depth: 0.3 },
          scene
        );
        chimney.position = new Vector3(x + buildingWidth * 0.3, hexTopY + baseHeight + buildingHeight + roofHeight * 0.6 + 0.4, z);
        chimney.material = baseMat; // Reuse cobblestone
        objects.push(chimney);
      }
      
      skipDefaultTexture = true;
    } else if (isMinecraftIsland) {
      // MINECRAFT SHIPWRECK
      buildingHeight = Math.random() * 1.2 + 0.8;
      buildingWidth = Math.random() * 2 + 1.5;
      buildingDepth = buildingWidth * 0.6;
      
      // Broken ship hull
      building = MeshBuilder.CreateBox(
        `shipwreck-${hex.q}-${hex.r}`,
        { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
        scene
      );
      building.position = new Vector3(x, hexTopY + buildingHeight / 2, z);
      building.rotation.y = Math.random() * Math.PI;
      building.rotation.z = (Math.random() - 0.5) * 0.3; // Tilted
      
      // Wood planks texture
      const shipMat = new StandardMaterial(`ship-mat-${hex.q}-${hex.r}`, scene);
      const shipTexture = new DynamicTexture(`ship-tex-${hex.q}-${hex.r}`, 256, scene);
      const sCtx = shipTexture.getContext() as CanvasRenderingContext2D;
      
      // Dark oak/spruce planks
      sCtx.fillStyle = '#4A3728';
      sCtx.fillRect(0, 0, 256, 256);
      
      // Vertical planks
      for (let i = 0; i < 8; i++) {
        const x = i * 32;
        sCtx.fillStyle = i % 2 === 0 ? '#3E2F22' : '#56402F';
        sCtx.fillRect(x, 0, 32, 256);
        sCtx.strokeStyle = '#2A1F18';
        sCtx.lineWidth = 2;
        sCtx.strokeRect(x, 0, 32, 256);
      }
      
      // Damage/holes
      for (let i = 0; i < 10; i++) {
        sCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        sCtx.fillRect(Math.random() * 256, Math.random() * 256, 20, 20);
      }
      
      shipTexture.update();
      shipMat.diffuseTexture = shipTexture;
      shipMat.diffuseColor = new Color3(1, 1, 1);
      building.material = shipMat;
      objects.push(building);
      
      // Treasure chest (rare)
      if (Math.random() < 0.2) {
        const chest = MeshBuilder.CreateBox(
          `chest-${hex.q}-${hex.r}`,
          { width: 0.4, height: 0.3, depth: 0.3 },
          scene
        );
        chest.position = new Vector3(x + (Math.random() - 0.5) * buildingWidth * 0.5, hexTopY + buildingHeight + 0.15, z);
        const chestMat = new StandardMaterial(`chest-mat-${hex.q}-${hex.r}`, scene);
        chestMat.diffuseColor = new Color3(0.6, 0.5, 0.3); // Gold trim
        chestMat.emissiveColor = new Color3(0.3, 0.25, 0.1);
        chest.material = chestMat;
        objects.push(chest);
      }
      
      skipDefaultTexture = true;
    } else {
      // GRIM DARK INDUSTRIAL (default)
      buildingHeight = Math.random() * 3 + 2.5;
      buildingWidth = Math.random() * 1.5 + 1.5;
      buildingDepth = Math.random() * 1.5 + 1.5;
      building = MeshBuilder.CreateBox(
        `building-${hex.q}-${hex.r}`,
        { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
        scene
      );
      building.position = new Vector3(x, hexTopY + buildingHeight / 2, z);
    }
    
    if (!skipDefaultTexture) {
      building.rotation.y = Math.random() * Math.PI * 2;
      
      // Create textured material
      const buildingMat = new StandardMaterial(`building-mat-${hex.q}-${hex.r}`, scene);
    
    // Create procedural texture for industrial look
    const texture = new DynamicTexture(`building-tex-${hex.q}-${hex.r}`, 512, scene);
    const ctx = texture.getContext() as CanvasRenderingContext2D;
    
    // Base color - dark industrial
    ctx.fillStyle = '#2a2520';
    ctx.fillRect(0, 0, 512, 512);
    
    // Add horizontal lines (floors)
    const numFloors = Math.floor(buildingHeight * 2);
    for (let i = 1; i < numFloors; i++) {
      const y = (i / numFloors) * 512;
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    
    // Add vertical panels
    for (let i = 0; i < 8; i++) {
      const x = (i / 8) * 512;
      ctx.strokeStyle = '#1a1510';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
    
    // Add rust/damage
    for (let i = 0; i < 20; i++) {
      const rx = Math.random() * 512;
      const ry = Math.random() * 512;
      const size = Math.random() * 30 + 10;
      ctx.fillStyle = `rgba(${100 + Math.random() * 50}, ${40 + Math.random() * 30}, ${20}, 0.3)`;
      ctx.fillRect(rx, ry, size, size);
    }
    
    texture.update();
    
    buildingMat.diffuseTexture = texture;
    buildingMat.diffuseColor = new Color3(1, 1, 1);
    buildingMat.specularColor = new Color3(0.1, 0.1, 0.1);
    buildingMat.emissiveColor = new Color3(0.02, 0.02, 0.02);
    building.material = buildingMat;
    
    objects.push(building);
    
    // Add multiple windows - only for industrial buildings
    if (!skipDefaultTexture && buildingWidth > 0) {
    const numWindows = Math.floor(Math.random() * 6) + 3;
    for (let i = 0; i < numWindows; i++) {
      const windowSize = 0.15;
      const windowX = (Math.random() - 0.5) * buildingWidth * 0.7;
      const windowY = (Math.random() - 0.5) * buildingHeight * 0.7; // Relative to building center
      const windowZ = buildingDepth / 2 + 0.02;
      
      const window1 = MeshBuilder.CreateBox(
        `window-${hex.q}-${hex.r}-${i}`,
        { width: windowSize, height: windowSize * 1.5, depth: 0.03 },
        scene
      );
      // Position relative to building (parent), not world
      window1.position = new Vector3(windowX, windowY, windowZ);
      window1.parent = building;
      
      const windowMat = new StandardMaterial(`window-mat-${hex.q}-${hex.r}-${i}`, scene);
      // Random window colors (some broken, some lit)
      if (Math.random() < 0.3) {
        windowMat.emissiveColor = new Color3(0.8, 0.6, 0.2); // Warm light
      } else if (Math.random() < 0.5) {
        windowMat.emissiveColor = new Color3(0.2, 0.6, 0.8); // Cold light
      } else {
        windowMat.diffuseColor = new Color3(0.1, 0.1, 0.1); // Broken/dark
      }
      window1.material = windowMat;
      
      // Don't add to objects array - parent handles disposal
    }
    
    // Add antenna/pipes on top - positioned relative to building
    if (Math.random() < 0.6) {
      const antennaHeight = Math.random() * 0.8 + 0.5;
      const antenna = MeshBuilder.CreateCylinder(
        `antenna-${hex.q}-${hex.r}`,
        { height: antennaHeight, diameter: 0.05, tessellation: 8 },
        scene
      );
      // Position relative to building top
      antenna.position = new Vector3(0, buildingHeight / 2 + antennaHeight / 2, 0);
      antenna.parent = building;
      
      const antennaMat = new StandardMaterial(`antenna-mat-${hex.q}-${hex.r}`, scene);
      antennaMat.diffuseColor = new Color3(0.4, 0.35, 0.3);
      antennaMat.emissiveColor = new Color3(0.8, 0.1, 0.1); // Red blinking light
      antenna.material = antennaMat;
    }
    } // End of if (!skipDefaultTexture && buildingWidth > 0)
    } // End of if (!skipDefaultTexture)
  } // End of if (canPlaceStructure)

  // Debris/Scrap: Random junk (10% chance on open terrain)
  if (hex.terrain === 'open' && Math.random() < 0.1) {
    const numDebris = Math.floor(Math.random() * 3) + 1;
    for (let i = 0; i < numDebris; i++) {
      const offsetX = (Math.random() - 0.5) * hexSize * 0.7;
      const offsetZ = (Math.random() - 0.5) * hexSize * 0.7;
      const debrisSize = Math.random() * 0.2 + 0.1;
      const debrisHeight = Math.random() * 0.3 + 0.1;
      
      const debris = MeshBuilder.CreateBox(
        `debris-${hex.q}-${hex.r}-${i}`,
        { width: debrisSize, height: debrisHeight, depth: debrisSize * 1.5 },
        scene
      );
      debris.position = new Vector3(x + offsetX, hexTopY + debrisHeight / 2, z + offsetZ);
      debris.rotation.set(
        (Math.random() - 0.5) * 0.5,
        Math.random() * Math.PI * 2,
        (Math.random() - 0.5) * 0.5
      );
      
      const debrisMat = new StandardMaterial(`debris-mat-${hex.q}-${hex.r}-${i}`, scene);
      debrisMat.diffuseColor = new Color3(0.3, 0.25, 0.2);
      debrisMat.specularColor = new Color3(0.2, 0.2, 0.2); // Slightly metallic
      debris.material = debrisMat;
      
      objects.push(debris);
    }
  }

  // Trees/forest: Minecraft-style cubic trees or dead trees
  if (hex.terrain === 'forest') {
    // Use SAME detection as buildings!
    const isMinecraftWorld = (theme.terrainColors.open.g > 0.6 && theme.ambientIntensity > 0.85 && theme.terrainColors.water.b < 0.8) || 
                             (theme.terrainColors.open.r > 0.65 && theme.terrainColors.water.b > 0.75 && theme.ambientIntensity > 0.8 && theme.ambientIntensity < 0.9);
    // Fewer trees in Minecraft (1-2 instead of 2-4)
    const numTrees = isMinecraftWorld ? Math.floor(Math.random() * 2) + 1 : Math.floor(Math.random() * 3) + 2;
    
    if (isMinecraftWorld) {
      // MINECRAFT TREES - cubic oak trees
      for (let i = 0; i < numTrees; i++) {
        const offsetX = (Math.random() - 0.5) * hexSize * 0.6;
        const offsetZ = (Math.random() - 0.5) * hexSize * 0.6;
        const trunkHeight = Math.random() * 1.5 + 1.5;
        
        // Oak log trunk (cubic)
        const trunk = MeshBuilder.CreateBox(
          `mc-tree-${hex.q}-${hex.r}-${i}`,
          { width: 0.3, height: trunkHeight, depth: 0.3 },
          scene
        );
        trunk.position = new Vector3(x + offsetX, hexTopY + trunkHeight / 2, z + offsetZ);
        
        const trunkMat = new StandardMaterial(`mc-trunk-mat-${hex.q}-${hex.r}-${i}`, scene);
        const trunkTex = new DynamicTexture(`mc-trunk-tex-${hex.q}-${hex.r}-${i}`, 64, scene);
        const tCtx = trunkTex.getContext() as CanvasRenderingContext2D;
        
        // Oak log texture (brown with rings)
        tCtx.fillStyle = '#6F5436';
        tCtx.fillRect(0, 0, 64, 64);
        // Rings
        tCtx.strokeStyle = '#5A4428';
        tCtx.lineWidth = 2;
        for (let r = 10; r < 32; r += 8) {
          tCtx.beginPath();
          tCtx.arc(32, 32, r, 0, Math.PI * 2);
          tCtx.stroke();
        }
        trunkTex.update();
        trunkMat.diffuseTexture = trunkTex;
        trunk.material = trunkMat;
        objects.push(trunk);
        
        // Leaf canopy (cubic, multiple blocks)
        const leafSize = 1.2;
        const canopy = MeshBuilder.CreateBox(
          `mc-leaves-${hex.q}-${hex.r}-${i}`,
          { width: leafSize, height: leafSize, depth: leafSize },
          scene
        );
        canopy.position = new Vector3(x + offsetX, hexTopY + trunkHeight + leafSize / 2, z + offsetZ);
        
        const leafMat = new StandardMaterial(`mc-leaf-mat-${hex.q}-${hex.r}-${i}`, scene);
        const leafTex = new DynamicTexture(`mc-leaf-tex-${hex.q}-${hex.r}-${i}`, 64, scene);
        const lCtx = leafTex.getContext() as CanvasRenderingContext2D;
        
        // Oak leaves texture (green, pixelated)
        lCtx.fillStyle = '#5A9C3E';
        lCtx.fillRect(0, 0, 64, 64);
        for (let p = 0; p < 100; p++) {
          const brightness = Math.random() * 30 - 15;
          lCtx.fillStyle = `rgb(${90 + brightness}, ${156 + brightness}, ${62 + brightness})`;
          lCtx.fillRect(Math.random() * 64, Math.random() * 64, 4, 4);
        }
        leafTex.update();
        leafMat.diffuseTexture = leafTex;
        leafMat.alpha = 0.9; // Slightly transparent
        canopy.material = leafMat;
        objects.push(canopy);
      }
    } else {
      // Dead trees for other worlds
      for (let i = 0; i < numTrees; i++) {
      const offsetX = (Math.random() - 0.5) * hexSize * 0.7;
      const offsetZ = (Math.random() - 0.5) * hexSize * 0.7;
      const treeHeight = Math.random() * 1.2 + 0.8;
      
      const tree = MeshBuilder.CreateCylinder(
        `tree-${hex.q}-${hex.r}-${i}`,
        { height: treeHeight, diameterTop: 0.05, diameterBottom: 0.15, tessellation: 6 },
        scene
      );
      tree.position = new Vector3(x + offsetX, hexTopY + treeHeight / 2, z + offsetZ);
      
      const treeMat = new StandardMaterial(`tree-mat-${hex.q}-${hex.r}-${i}`, scene);
      treeMat.diffuseColor = new Color3(0.15, 0.12, 0.1);
      tree.material = treeMat;
      
      objects.push(tree);
    }
    } // End of else (dead trees)
  }

  return objects;
}
