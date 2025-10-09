import React, { useEffect, useRef, useState } from 'react';
import { Engine, Scene, ArcRotateCamera, HemisphericLight, Vector3, MeshBuilder, StandardMaterial, Color3, Color4, Mesh, PointerEventTypes, ActionManager, ExecuteCodeAction, Texture, DynamicTexture, Animation, SpotLight, PointLight, ShadowGenerator } from '@babylonjs/core';
import { useGame } from '@/stores/game';
import type { Hex, TerrainType, Unit } from '@/types/battle';
import UnitContextMenu from '@/components/UnitContextMenu';
import DiceDialog from '@/components/DiceDialog';
import CounterAttackDialog from '@/components/CounterAttackDialog';
import { reachableCosts } from '@/utils/path';

// Grim Dark terrain colors - industrial wasteland (brighter for visibility)
const TERRAIN_COLORS: Record<TerrainType, Color3> = {
  open: new Color3(0.35, 0.32, 0.28),    // Ash wasteland
  road: new Color3(0.25, 0.25, 0.25),    // Dark asphalt
  forest: new Color3(0.25, 0.3, 0.22),   // Dead forest
  ruin: new Color3(0.4, 0.35, 0.3),      // Rusted metal/concrete
  swamp: new Color3(0.3, 0.35, 0.25),    // Toxic sludge
  water: new Color3(0.25, 0.3, 0.35),    // Polluted water
  river: new Color3(0.28, 0.32, 0.38),   // Contaminated river
  lake: new Color3(0.22, 0.25, 0.3),     // Dark toxic lake
  rock: new Color3(0.45, 0.42, 0.4),     // Industrial rubble
  mountain: new Color3(0.35, 0.33, 0.32), // Dark mountains
};

// Height offsets for terrain (positive = higher, negative = lower/water)
const TERRAIN_HEIGHTS: Record<TerrainType, number> = {
  open: 0.3,      // Base ground level
  road: 0.3,      // Same as open
  forest: 0.5,    // Slightly elevated
  ruin: 0.4,      // Slightly elevated
  swamp: 0.1,     // Lower than ground
  water: -0.2,    // Below ground (depression)
  river: -0.2,    // Below ground
  lake: -0.3,     // Deeper depression
  rock: 1.0,      // Elevated
  mountain: 2.0,  // Very elevated
};

export default function BabylonHexGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const g = useGame();
  const sceneRef = useRef<Scene | null>(null);
  const hexMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const unitMeshesRef = useRef<Map<string, Mesh>>(new Map());
  const objectiveMeshesRef = useRef<Map<number, Mesh>>(new Map());
  const movementIndicatorsRef = useRef<Mesh[]>([]);
  const terrainObjectsRef = useRef<Mesh[]>([]);
  const [menu, setMenu] = useState<{u:Unit, x:number, y:number}|null>(null);
  const [selectedHex, setSelectedHex] = useState<Hex|undefined>();

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create engine and scene
    const engine = new Engine(canvasRef.current, true);
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.08, 0.08, 0.12, 1); // Dark but visible background
    scene.fogMode = Scene.FOGMODE_EXP2;
    scene.fogDensity = 0.005; // Less fog for better visibility
    scene.fogColor = new Color3(0.15, 0.15, 0.18);
    sceneRef.current = scene;

    // Setup camera - isometric view
    const camera = new ArcRotateCamera(
      'camera',
      Math.PI / 4,      // Alpha (horizontal rotation)
      Math.PI / 3,      // Beta (vertical angle) - 60 degrees for isometric
      50,               // Radius (distance from target)
      Vector3.Zero(),   // Target
      scene
    );
    camera.attachControl(canvasRef.current, true);
    camera.lowerRadiusLimit = 20;
    camera.upperRadiusLimit = 100;
    camera.lowerBetaLimit = Math.PI / 6;  // Don't go too flat
    camera.upperBetaLimit = Math.PI / 2.2; // Don't go too vertical

    // Grim Dark Lighting - balanced for visibility
    const ambientLight = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.5; // Increased for better visibility
    ambientLight.groundColor = new Color3(0.15, 0.15, 0.18);
    ambientLight.diffuse = new Color3(0.5, 0.5, 0.55);

    // Dramatic spotlight from above (like searchlight)
    const spotlight1 = new SpotLight(
      'spotlight1',
      new Vector3(-10, 20, -10),
      new Vector3(0.3, -1, 0.3),
      Math.PI / 3,
      2,
      scene
    );
    spotlight1.intensity = 1.2; // Brighter
    spotlight1.diffuse = new Color3(0.9, 0.95, 1.0); // Cold blue-white light

    // Second spotlight from different angle
    const spotlight2 = new SpotLight(
      'spotlight2',
      new Vector3(15, 18, 15),
      new Vector3(-0.4, -1, -0.4),
      Math.PI / 3,
      2,
      scene
    );
    spotlight2.intensity = 1.0; // Brighter
    spotlight2.diffuse = new Color3(1.0, 0.95, 0.8); // Warm industrial light

    // Point lights for atmosphere (like fires/explosions in distance)
    const pointLight1 = new PointLight('fire1', new Vector3(-20, 5, -20), scene);
    pointLight1.intensity = 0.4; // Slightly brighter
    pointLight1.diffuse = new Color3(1.0, 0.5, 0.2); // Orange fire glow
    pointLight1.range = 35;

    const pointLight2 = new PointLight('fire2', new Vector3(25, 4, 20), scene);
    pointLight2.intensity = 0.35; // Slightly brighter
    pointLight2.diffuse = new Color3(0.3, 0.9, 1.0); // Blue energy glow
    pointLight2.range = 30;

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Handle resize
    const handleResize = () => {
      engine.resize();
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      scene.dispose();
      engine.dispose();
    };
  }, []);

  // Create hex meshes when grid changes
  useEffect(() => {
    if (!sceneRef.current || g.grid.length === 0) return;

    const scene = sceneRef.current;
    const hexSize = 1; // Size of each hex in 3D space

    // Clear existing meshes
    hexMeshesRef.current.forEach(mesh => mesh.dispose());
    hexMeshesRef.current.clear();

    // Create hex meshes with click interaction
    g.grid.forEach((hex) => {
      const hexMesh = createHexMesh(hex, hexSize, scene, (clickedHex) => {
        handleHexClick(clickedHex);
      });
      hexMeshesRef.current.set(`${hex.q},${hex.r}`, hexMesh);
    });

    // Add 3D terrain objects (buildings, debris, mountains)
    terrainObjectsRef.current.forEach(mesh => mesh.dispose());
    terrainObjectsRef.current = [];
    
    // Track building positions to prevent overlap
    const buildingPositions: Set<string> = new Set();
    
    g.grid.forEach((hex) => {
      const objects = createTerrainObjects(hex, hexSize, scene, buildingPositions);
      terrainObjectsRef.current.push(...objects);
    });

  }, [g.grid]);

  // Create/update unit meshes when units change OR phase changes
  useEffect(() => {
    if (!sceneRef.current) return;

    const scene = sceneRef.current;
    const hexSize = 1;

    // Clear existing unit meshes
    unitMeshesRef.current.forEach(mesh => mesh.dispose());
    unitMeshesRef.current.clear();

    // Create unit meshes
    g.units.filter(u => u.position).forEach((unit) => {
      const isSelected = unit.id === g.selectedUnitId;
      const unitMesh = createUnitMesh(unit, hexSize, scene, isSelected, (clickedUnit, event) => {
        handleUnitClick(clickedUnit, event);
      });
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

  }, [g.units, g.selectedUnitId, g.phase]); // Added g.phase to dependencies!

  // Create/update objective markers
  useEffect(() => {
    if (!sceneRef.current || g.phase !== 'playing') return;

    const scene = sceneRef.current;
    const hexSize = 1;

    // Clear existing objective meshes
    objectiveMeshesRef.current.forEach(mesh => mesh.dispose());
    objectiveMeshesRef.current.clear();

    // Create objective markers
    g.objectives.forEach((obj) => {
      const objMesh = createObjectiveMesh(obj, hexSize, scene);
      objectiveMeshesRef.current.set(obj.id, objMesh);
    });

  }, [g.objectives, g.phase]);

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
        
        for (const [hexKey, cost] of allCosts) {
          const [qStr, rStr] = hexKey.split(',');
          const q = parseInt(qStr);
          const r = parseInt(rStr);
          
          if (q === selUnit.position!.q && r === selUnit.position!.r) continue; // Skip current position
          
          // Get the hex to calculate its top position
          const targetHex = g.grid.find(h => h.q === q && h.r === r);
          if (!targetHex) continue;
          
          const terrainHeight = TERRAIN_HEIGHTS[targetHex.terrain];
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
    
  }, [g.phase, g.selectedUnitId, g.currentPlayer, g.units, g.grid]);

  // Handle hex click
  function handleHexClick(hex: Hex) {
    console.log('handleHexClick called:', hex.q, hex.r, 'phase:', g.phase, 'selectedUnitId:', g.selectedUnitId);
    setSelectedHex(hex);
    if (g.phase === 'deploy') {
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
    if (g.phase === 'playing') {
      if (!g.selectedUnitId) {
        console.log('No unit selected for movement');
        return;
      }
      const selUnit = g.units.find(u => u.id === g.selectedUnitId);
      console.log('Playing phase - selected unit:', selUnit?.name, 'ID:', g.selectedUnitId);
      if (selUnit && selUnit.position) {
        // Try to move to this hex
        console.log('Attempting to move unit to:', hex.q, hex.r);
        g.moveUnit(selUnit.id, hex, false); // TODO: detect run vs walk
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
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          touchAction: 'none',
        }}
      />
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
function createHexMesh(hex: Hex, size: number, scene: Scene, onClick: (hex: Hex) => void): Mesh {
  const w = Math.sqrt(3) * size;
  const h = 2 * size;
  const x = w * (hex.q + hex.r / 2);
  const z = h * (3 / 4) * hex.r; // Using Z for the hex grid plane
  const heightOffset = TERRAIN_HEIGHTS[hex.terrain];

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

  // Material
  const material = new StandardMaterial(`mat-${hex.q}-${hex.r}`, scene);
  material.diffuseColor = TERRAIN_COLORS[hex.terrain];
  material.specularColor = new Color3(0.1, 0.1, 0.1);
  
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
  onClick: (unit: Unit, event?: PointerEvent) => void
): Mesh {
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (unit.position!.q + unit.position!.r / 2);
  const z = h * (3 / 4) * unit.position!.r;
  
  // Get the terrain height at this position
  const terrainHeight = TERRAIN_HEIGHTS['open']; // TODO: Get actual terrain from grid
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
  const unitHeight = 1.2;
  const unitWidth = 1.0;
  
  // Create a parent mesh to hold both planes
  const unitMesh = new Mesh(`unit-${unit.id}`, scene);
  // Position unit so its BOTTOM is at hexTopY (standing on top of hex)
  unitMesh.position = new Vector3(x, hexTopY + 0.05, z);

  // Player color for sides
  const playerColor = unit.owner === 0 
    ? new Color3(0.2, 0.4, 0.8)  // Blue for player 0
    : new Color3(0.8, 0.2, 0.2); // Red for player 1

  // Create a dynamic texture for the front and back faces with unit image
  const faceTexture = new DynamicTexture(`unit-texture-${unit.id}`, 512, scene, false);
  const ctx = faceTexture.getContext() as CanvasRenderingContext2D;
  
  // Create material for the card first
  const cardMaterial = new StandardMaterial(`unit-card-${unit.id}`, scene);
  cardMaterial.diffuseTexture = faceTexture;
  cardMaterial.diffuseColor = new Color3(1, 1, 1);
  cardMaterial.specularColor = new Color3(0.3, 0.3, 0.3);
  cardMaterial.backFaceCulling = false; // Show both sides
  if (isSelected) {
    cardMaterial.emissiveColor = playerColor.scale(0.5);
  } else {
    cardMaterial.emissiveColor = playerColor.scale(0.15);
  }
  
  // Fill background with player color immediately
  ctx.fillStyle = unit.owner === 0 ? '#1e3a8a' : '#7f1d1d';
  ctx.fillRect(0, 0, 512, 512);
  
  // Add border/frame
  ctx.strokeStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 504, 504);
  
  // Add health bar at bottom
  const barHeight = 40;
  const barY = 512 - barHeight - 10;
  ctx.fillStyle = '#0a0c12';
  ctx.fillRect(20, barY, 472, barHeight);
  
  const healthPercent = unit.wounds / unit.maxWounds;
  ctx.fillStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
  ctx.fillRect(24, barY + 4, 464 * healthPercent, barHeight - 8);
  
  faceTexture.update();
  
  // Load and draw unit image asynchronously
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    // Clear and redraw everything with image
    ctx.fillStyle = unit.owner === 0 ? '#1e3a8a' : '#7f1d1d';
    ctx.fillRect(0, 0, 512, 512);
    
    // Draw image in center
    const imgSize = 400;
    const offset = (512 - imgSize) / 2;
    ctx.drawImage(img, offset, offset, imgSize, imgSize);
    
    // Add border/frame
    ctx.strokeStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = 8;
    ctx.strokeRect(4, 4, 504, 504);
    
    // Add health bar at bottom
    ctx.fillStyle = '#0a0c12';
    ctx.fillRect(20, barY, 472, barHeight);
    
    ctx.fillStyle = unit.owner === 0 ? '#3b82f6' : '#ef4444';
    ctx.fillRect(24, barY + 4, 464 * healthPercent, barHeight - 8);
    
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
  sideMaterial.diffuseColor = playerColor;
  sideMaterial.emissiveColor = playerColor.scale(0.2);
  cardBox.material = sideMaterial;

  // Create front plane (larger than box to sit on top)
  const frontPlane = MeshBuilder.CreatePlane(
    `unit-front-${unit.id}`,
    { width: unitWidth * 1.01, height: unitHeight * 1.01 },
    scene
  );
  // Position plane at center height, slightly in front
  frontPlane.position = new Vector3(0, unitHeight / 2, cardDepth / 2 + 0.001);
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
  scene: Scene
): Mesh {
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (objective.position.q + objective.position.r / 2);
  const z = h * (3 / 4) * objective.position.r;
  
  // Get hex top position
  const terrainHeight = TERRAIN_HEIGHTS['open']; // TODO: Get actual terrain
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
function createTerrainObjects(hex: Hex, hexSize: number, scene: Scene, buildingPositions: Set<string>): Mesh[] {
  const objects: Mesh[] = [];
  const w = Math.sqrt(3) * hexSize;
  const h = 2 * hexSize;
  const x = w * (hex.q + hex.r / 2);
  const z = h * (3 / 4) * hex.r;
  const terrainHeight = TERRAIN_HEIGHTS[hex.terrain];
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

  // Mountains: Create rocky formations
  if (hex.terrain === 'mountain') {
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

  // Ruins: Industrial buildings - larger structures spanning multiple hexes
  // Only spawn on land (not water) and not too close to other buildings
  const hexKey = `${hex.q},${hex.r}`;
  const canPlaceBuilding = 
    (hex.terrain === 'ruin' || (hex.terrain === 'open' && Math.random() < 0.08)) &&
    terrainHeight >= 0 && // Only on land, not in water
    !buildingPositions.has(hexKey) &&
    !isNearWater(hex.q, hex.r);
  
  if (canPlaceBuilding) {
    // Mark this position and neighbors as occupied
    buildingPositions.add(hexKey);
    buildingPositions.add(`${hex.q + 1},${hex.r}`);
    buildingPositions.add(`${hex.q - 1},${hex.r}`);
    buildingPositions.add(`${hex.q},${hex.r + 1}`);
    buildingPositions.add(`${hex.q},${hex.r - 1}`);
    
    // Larger buildings
    const buildingHeight = Math.random() * 3 + 2.5;
    const buildingWidth = Math.random() * 1.5 + 1.5; // Much wider
    const buildingDepth = Math.random() * 1.5 + 1.5; // Much deeper
    
    const building = MeshBuilder.CreateBox(
      `building-${hex.q}-${hex.r}`,
      { width: buildingWidth, height: buildingHeight, depth: buildingDepth },
      scene
    );
    building.position = new Vector3(x, hexTopY + buildingHeight / 2, z);
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
    
    // Add multiple windows - positioned relative to building center
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
      
      // Don't add to objects array - parent handles disposal
    }
  }

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

  // Dead trees/forest: Spiky dead vegetation
  if (hex.terrain === 'forest') {
    const numTrees = Math.floor(Math.random() * 3) + 2;
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
  }

  return objects;
}
