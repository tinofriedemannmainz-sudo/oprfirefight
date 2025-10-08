# OPR Firefight - Game Rules & Mechanics

## Overview

**OPR Firefight** is a turn-based tactical wargame for two players, inspired by the One Page Rules tabletop system. Players command teams of units on a hexagonal grid battlefield, using dice-based combat mechanics to eliminate enemy forces.

---

## Game Setup

### 1. Team Selection
- Each player selects a team from available factions
- Teams are loaded from JSON files in `/public/data/teams/`
- Teams contain multiple units with different stats, weapons, and abilities

### 2. Battlefield Generation
- Hexagonal grid with default size of 9 (configurable)
- Terrain is procedurally generated with weighted probabilities:
  - **Open** (50%) - Clear ground
  - **Forest** (18%) - Dense vegetation
  - **Rock** (18%) - Rocky outcrops
  - **Water** (7%) - Rivers and ponds
  - **Ruin** (7%) - Destroyed structures

### 3. Deployment Phase
- Players alternate placing their units on the battlefield
- **Player 1** (Blue) deploys in the **northern half** of the map (r ≤ -size/2)
- **Player 2** (Red) deploys in the **southern half** of the map (r ≥ size/2)
- Units cannot be placed on occupied hexes
- Click a unit from your roster, then click a valid hex to place it

---

## Unit Statistics

Each unit has the following core stats:

| Stat | Description |
|------|-------------|
| **Quality** | Target number for hit rolls (e.g., 4+ means roll 4, 5, or 6 to hit) |
| **Defense** | Target number for save rolls (higher is better) |
| **Speed** | Maximum movement range in hexes per turn |
| **Wounds** | Health points (unit is destroyed at 0) |
| **Weapons** | List of available weapons with their own stats |

### Weapon Statistics

| Stat | Description |
|------|-------------|
| **Name** | Weapon identifier |
| **Type** | `melee` or `ranged` |
| **Range** | Maximum attack distance in hexes (1 = melee only) |
| **Attacks** | Number of dice rolled when attacking |
| **AP** | Armor Penetration - reduces target's defense value |

---

## Turn Structure

Players alternate turns. On your turn, you can:

1. **Move units** (any number of your units)
2. **Attack with units** (any number of your units)
3. **End turn** when finished

There is no strict action order - you can move and attack in any sequence.

---

## Movement Rules

### Basic Movement
1. Click one of your units to select it
2. Click a destination hex within range
3. The unit moves if the destination is valid

### Movement Range
- Units can move up to their **Speed** value in hexes
- Distance is calculated using axial hex distance formula:
  ```
  distance = (|q1 - q2| + |q1 + r1 - q2 - r2| + |r1 - r2|) / 2
  ```

### Terrain Effects
- **Water** and **Rock**: +1 movement cost penalty
- **Forest**, **Ruin**, **Open**: No penalty
- Example: Moving 3 hexes through water costs 4 movement points

### Movement Restrictions
- Cannot move through or onto occupied hexes
- Must have sufficient movement points after terrain penalties

---

## Combat Rules

### Attacking
1. Select one of your units
2. Click an enemy unit to attack with your unit's first weapon
3. Combat is resolved automatically using dice rolls

### Range Requirements
- **Melee weapons**: Target must be exactly 1 hex away (adjacent)
- **Ranged weapons**: Target must be within weapon's range value

### Combat Resolution (Two-Step Process)

#### Step 1: Hit Rolls
- Roll dice equal to weapon's **Attacks** value
- Each die that rolls **≥ Quality** is a hit
- Example: Quality 4+, rolling [3, 4, 5, 2] = 2 hits

#### Step 2: Save Rolls
- Target rolls one die per hit received
- Save target = `Defense + AP` (clamped between 2 and 6)
- Each die that rolls **< save target** is a failed save
- Example: Defense 4, AP -1, save target = 3. Rolling [2, 5] = 1 failed save

#### Damage
- Each failed save deals 1 wound
- Unit is destroyed when wounds reach 0
- Destroyed units are removed from the battlefield

### Armor Penetration (AP)
- Positive AP makes it harder to save (increases save target)
- Negative AP makes it easier to save (decreases save target)
- Save target is always between 2+ and 6+

---

## Dice Log

The dice log at the bottom of the screen shows:
- Last 6 dice rolls
- Roll type (Hit Roll or Save Roll)
- Dice results
- Target number
- Number of successes

---

## Visual Indicators

### Unit Display
- **Blue glow**: Player 1 units
- **Red glow**: Player 2 units
- **Health bar**: Shows current wounds (colored bar) vs max wounds (gray background)
- **Dashed circle**: Selected unit

### Hex Display
- **Terrain colors**:
  - Dark blue-gray: Open
  - Dark green: Forest
  - Gray: Rock
  - Dark blue: Water
  - Dark brown: Ruin
- **Thick blue border**: Selected hex
- **Thin gray border**: Unselected hex

---

## Victory Conditions

Currently, the game continues until one player eliminates all enemy units. The last player with units remaining wins.

---

## Technical Details

### Coordinate System
- Uses axial hex coordinates (q, r)
- Flat-top hexagon orientation
- Grid size determines radius from center

### Data Structure
Teams are defined in JSON format:
```json
{
  "id": "team-identifier",
  "name": "Team Name",
  "faction": "Faction Name",
  "units": [
    {
      "id": "unit-id",
      "name": "Unit Name",
      "image": "/path/to/image.png",
      "quality": 4,
      "defense": 4,
      "speed": 6,
      "wounds": 3,
      "weapons": [
        {
          "name": "Weapon Name",
          "range": 12,
          "attacks": 2,
          "ap": 1,
          "type": "ranged"
        }
      ]
    }
  ]
}
```

---

## Tips & Strategy

1. **Terrain awareness**: Plan movement considering terrain penalties
2. **Range management**: Keep ranged units at optimal distance
3. **Focus fire**: Concentrate attacks to eliminate threats
4. **Positioning**: Use the hex grid to control engagement ranges
5. **Unit preservation**: Protect wounded units from finishing blows

---

## Future Enhancements

Potential features for expansion:
- Line of sight and cover mechanics
- Special abilities and unit traits
- Objective-based scenarios
- Multiple weapon selection per unit
- Overwatch and reaction mechanics
- Campaign mode with persistent units
