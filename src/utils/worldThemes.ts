import { Color3 } from '@babylonjs/core';
import type { TerrainType } from '@/types/battle';

export type WorldTheme = 'grimdark' | 'lava' | 'grassland' | 'ice' | 'jungle' | 'minecraft_village' | 'minecraft_island';

export interface ThemeConfig {
  terrainColors: Record<TerrainType, Color3>;
  terrainHeights: Record<TerrainType, number>;
  fogColor: Color3;
  fogDensity: number;
  backgroundColor: Color3;
  ambientIntensity: number;
  ambientColor: Color3;
}

export const WORLD_THEMES: Record<WorldTheme, ThemeConfig> = {
  grimdark: {
    terrainColors: {
      open: new Color3(0.35, 0.32, 0.28),
      road: new Color3(0.25, 0.25, 0.25),
      forest: new Color3(0.25, 0.3, 0.22),
      ruin: new Color3(0.4, 0.35, 0.3),
      swamp: new Color3(0.3, 0.35, 0.25),
      water: new Color3(0.25, 0.3, 0.35),
      river: new Color3(0.28, 0.32, 0.38),
      lake: new Color3(0.22, 0.25, 0.3),
      rock: new Color3(0.45, 0.42, 0.4),
      mountain: new Color3(0.35, 0.33, 0.32),
    },
    terrainHeights: {
      open: 0.3,
      road: 0.3,
      forest: 0.5,
      ruin: 0.4,
      swamp: 0.1,
      water: -0.2,
      river: -0.2,
      lake: -0.3,
      rock: 1.0,
      mountain: 2.0,
    },
    fogColor: new Color3(0.15, 0.15, 0.18),
    fogDensity: 0.005,
    backgroundColor: new Color3(0.08, 0.08, 0.12),
    ambientIntensity: 0.5,
    ambientColor: new Color3(0.5, 0.5, 0.55),
  },

  lava: {
    terrainColors: {
      open: new Color3(0.2, 0.15, 0.15),    // Dark volcanic rock
      road: new Color3(0.15, 0.12, 0.12),   // Darker path
      forest: new Color3(0.25, 0.15, 0.1),  // Burnt trees
      ruin: new Color3(0.3, 0.2, 0.15),     // Scorched ruins
      swamp: new Color3(0.4, 0.2, 0.1),     // Bubbling lava pools
      water: new Color3(0.8, 0.3, 0.1),     // Lava
      river: new Color3(0.9, 0.4, 0.15),    // Lava river
      lake: new Color3(1.0, 0.35, 0.1),     // Lava lake
      rock: new Color3(0.25, 0.2, 0.18),    // Black rock
      mountain: new Color3(0.2, 0.18, 0.16), // Dark mountains
    },
    terrainHeights: {
      open: 0.3,
      road: 0.3,
      forest: 0.4,
      ruin: 0.4,
      swamp: 0.1,
      water: -0.3,  // Lava flows lower
      river: -0.3,
      lake: -0.4,
      rock: 1.2,
      mountain: 2.5,
    },
    fogColor: new Color3(0.3, 0.15, 0.1),
    fogDensity: 0.008,
    backgroundColor: new Color3(0.15, 0.08, 0.05),
    ambientIntensity: 0.4,
    ambientColor: new Color3(0.6, 0.3, 0.2),
  },

  grassland: {
    terrainColors: {
      open: new Color3(0.4, 0.6, 0.3),      // Green grass
      road: new Color3(0.5, 0.45, 0.35),    // Dirt road
      forest: new Color3(0.2, 0.5, 0.2),    // Green forest
      ruin: new Color3(0.5, 0.5, 0.45),     // Stone ruins
      swamp: new Color3(0.3, 0.45, 0.3),    // Marsh
      water: new Color3(0.2, 0.4, 0.6),     // Blue water
      river: new Color3(0.3, 0.5, 0.7),     // Clear river
      lake: new Color3(0.2, 0.35, 0.55),    // Deep lake
      rock: new Color3(0.6, 0.6, 0.55),     // Light rocks
      mountain: new Color3(0.5, 0.5, 0.48), // Gray mountains
    },
    terrainHeights: {
      open: 0.2,
      road: 0.2,
      forest: 0.3,
      ruin: 0.3,
      swamp: 0.05,
      water: -0.15,
      river: -0.15,
      lake: -0.25,
      rock: 0.8,
      mountain: 1.5,
    },
    fogColor: new Color3(0.7, 0.8, 0.9),
    fogDensity: 0.002,
    backgroundColor: new Color3(0.6, 0.7, 0.9),
    ambientIntensity: 0.8,
    ambientColor: new Color3(0.9, 0.9, 1.0),
  },

  ice: {
    terrainColors: {
      open: new Color3(0.7, 0.8, 0.9),      // Snow
      road: new Color3(0.6, 0.7, 0.8),      // Icy path
      forest: new Color3(0.5, 0.6, 0.65),   // Frozen trees
      ruin: new Color3(0.6, 0.65, 0.7),     // Frozen ruins
      swamp: new Color3(0.5, 0.6, 0.7),     // Frozen marsh
      water: new Color3(0.6, 0.75, 0.85),   // Ice
      river: new Color3(0.65, 0.8, 0.9),    // Frozen river
      lake: new Color3(0.55, 0.7, 0.8),     // Frozen lake
      rock: new Color3(0.7, 0.75, 0.8),     // Ice rocks
      mountain: new Color3(0.8, 0.85, 0.9), // Snow mountains
    },
    terrainHeights: {
      open: 0.3,
      road: 0.3,
      forest: 0.4,
      ruin: 0.4,
      swamp: 0.15,
      water: -0.1,  // Frozen, so not as deep
      river: -0.1,
      lake: -0.2,
      rock: 1.0,
      mountain: 2.2,
    },
    fogColor: new Color3(0.8, 0.85, 0.95),
    fogDensity: 0.004,
    backgroundColor: new Color3(0.7, 0.8, 0.95),
    ambientIntensity: 0.7,
    ambientColor: new Color3(0.85, 0.9, 1.0),
  },

  jungle: {
    terrainColors: {
      open: new Color3(0.3, 0.5, 0.25),     // Jungle floor
      road: new Color3(0.35, 0.4, 0.3),     // Muddy path
      forest: new Color3(0.2, 0.45, 0.2),   // Dense jungle
      ruin: new Color3(0.4, 0.45, 0.35),    // Overgrown ruins
      swamp: new Color3(0.25, 0.4, 0.3),    // Jungle swamp
      water: new Color3(0.2, 0.35, 0.3),    // Murky water
      river: new Color3(0.25, 0.4, 0.35),   // Jungle river
      lake: new Color3(0.18, 0.3, 0.28),    // Dark lake
      rock: new Color3(0.4, 0.45, 0.4),     // Mossy rocks
      mountain: new Color3(0.35, 0.4, 0.35), // Jungle mountains
    },
    terrainHeights: {
      open: 0.25,
      road: 0.25,
      forest: 0.6,   // Tall trees
      ruin: 0.4,
      swamp: 0.05,
      water: -0.15,
      river: -0.15,
      lake: -0.25,
      rock: 0.9,
      mountain: 1.8,
    },
    fogColor: new Color3(0.3, 0.4, 0.35),
    fogDensity: 0.006,
    backgroundColor: new Color3(0.2, 0.3, 0.25),
    ambientIntensity: 0.6,
    ambientColor: new Color3(0.5, 0.6, 0.5),
  },

  minecraft_village: {
    terrainColors: {
      open: new Color3(0.45, 0.65, 0.3),    // Bright grass blocks
      road: new Color3(0.55, 0.5, 0.4),     // Dirt/gravel path
      forest: new Color3(0.3, 0.55, 0.25),  // Oak forest
      ruin: new Color3(0.5, 0.5, 0.5),      // Stone brick ruins
      swamp: new Color3(0.35, 0.45, 0.35),  // Swamp biome
      water: new Color3(0.25, 0.45, 0.7),   // Minecraft water blue
      river: new Color3(0.3, 0.5, 0.75),    // Flowing water
      lake: new Color3(0.2, 0.4, 0.65),     // Deep water
      rock: new Color3(0.5, 0.5, 0.5),      // Stone/cobblestone
      mountain: new Color3(0.45, 0.45, 0.45), // Stone mountains
    },
    terrainHeights: {
      open: 0.2,
      road: 0.2,
      forest: 0.3,
      ruin: 0.3,
      swamp: 0.1,
      water: -0.2,
      river: -0.2,
      lake: -0.3,
      rock: 0.8,
      mountain: 1.5,
    },
    fogColor: new Color3(0.7, 0.8, 1.0),
    fogDensity: 0.001,
    backgroundColor: new Color3(0.5, 0.7, 1.0),
    ambientIntensity: 0.9,
    ambientColor: new Color3(1.0, 1.0, 1.0),
  },

  minecraft_island: {
    terrainColors: {
      open: new Color3(0.7, 0.65, 0.5),     // Sandy beach
      road: new Color3(0.6, 0.55, 0.45),    // Worn path
      forest: new Color3(0.3, 0.6, 0.3),    // Palm trees/jungle
      ruin: new Color3(0.4, 0.35, 0.3),     // Shipwreck wood
      swamp: new Color3(0.4, 0.5, 0.4),     // Coastal marsh
      water: new Color3(0.2, 0.5, 0.8),     // Ocean blue
      river: new Color3(0.25, 0.55, 0.85),  // Clear water
      lake: new Color3(0.15, 0.45, 0.75),   // Deep ocean
      rock: new Color3(0.5, 0.5, 0.5),      // Stone/coral
      mountain: new Color3(0.6, 0.6, 0.55), // Rocky cliffs
    },
    terrainHeights: {
      open: 0.15,  // Beach level
      road: 0.15,
      forest: 0.25,
      ruin: 0.1,   // Shipwrecks low
      swamp: 0.05,
      water: -0.3,  // Deep ocean
      river: -0.25,
      lake: -0.4,
      rock: 0.6,
      mountain: 1.2,
    },
    fogColor: new Color3(0.6, 0.75, 0.95),
    fogDensity: 0.002,
    backgroundColor: new Color3(0.5, 0.7, 0.95),
    ambientIntensity: 0.85,
    ambientColor: new Color3(0.95, 0.95, 1.0),
  },
};
