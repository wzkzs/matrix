# 🦎 Biological Evolution Simulator

[简体中文](./README.md) | **English**

A Canvas-based ecosystem simulator demonstrating Ant Colony Optimization, Boids algorithms, and Predator-Prey dynamics.

## ✨ Features

- **Four Creature Types**
  - 🐜 **Ant** - Ant Colony Optimization using pheromones for foraging and communication
  - 🐦 **Bird** - Flocking behavior based on Boids algorithm
  - 🦡 **Anteater** - Predator that hunts ants
  - 🐍 **Snake** - Ambush predator that specializes in hunting birds

- **Ecosystem Simulation**
  - Food Chain: Plants → Ants/Birds → Anteaters/Snakes
  - Energy System: Creatures need to eat to maintain energy; running out of energy leads to death
  - Reproduction System: Can reproduce when energy is sufficient
  - Genetics & Mutation: Offspring inherit parent genes with random mutations

- **Ant Colony Optimization**
  - Pheromone release and evaporation
  - Ants find food paths via pheromones
  - Nest System: Stores food, spawns new ants

- **Boids Algorithm**
  - Separation: Avoid colliding with nearby flockmates
  - Alignment: Steer in the same average direction as nearby flockmates
  - Cohesion: Steer toward the average position of nearby flockmates

- **Infinite World**
  - Dynamically expanding world boundaries
  - Camera zoom and drag
  - Touch screen support

## 🎮 Controls

### Desktop
| Action | Description |
|--------|-------------|
| Click Map | Spawn currently selected species |
| Scroll Wheel | Zoom view |
| Right Drag / Shift+Click | Pan map |
| Space | Pause/Resume |
| R | Reset game |
| P | Toggle pheromone visualization |

### Mobile
| Action | Description |
|--------|-------------|
| Tap | Spawn species |
| One-finger Drag | Pan map |
| Pinch | Zoom view |

## 🚀 Quick Start

1. Clone or download the project
2. Open `index.html` in your browser to run

```bash
# Or use a local server
npx serve .
# Then visit http://localhost:3000
```

## 📁 Project Structure

```
├── index.html      # Main page
├── styles.css      # Stylesheet
├── config.js       # Game configuration (species params, energy settings, etc.)
├── main.js         # Main entry (game loop, event handling, camera)
├── world.js        # World class (plant spawning, boundary management)
├── creature.js     # Creature base class (common behavior and stats)
├── gene.js         # Gene system (mutation, reproduction, death utils)
├── pheromone.js    # Pheromone grid (Ant colony core)
├── ant.js          # Ant and Nest classes
├── bird.js         # Bird class (Boids implementation)
└── predator.js     # Predator classes (Anteater, Snake)
```

## ⚙️ Configuration

You can adjust various parameters in `config.js`:

```javascript
const CONFIG = {
  WORLD_WIDTH: 2000,          // World width
  WORLD_HEIGHT: 1500,         // World height
  FOOD_SPAWN_RATE: 0.5,       // Food spawn rate
  MAX_FOOD: 120,              // Max food count
  FOOD_ENERGY: 100,           // Food energy value
  INITIAL_ENERGY: 200,        // Initial creature energy
  MOVE_COST: 0.03,            // Movement energy cost
  MUTATION_RATE: 0.2,         // Mutation probability
  MUTATION_AMOUNT: 0.3,       // Mutation magnitude
  // ...
};
```

## 🧬 Genetic System

Every creature has three genetic traits:
- **speed** - Movement speed
- **perception** - Sensing range
- **size** - Body size

During reproduction, offspring inherit genes from parents with random mutations, enabling natural selection and evolution.

## 🔧 Tech Stack

- Pure Vanilla JavaScript (No framework dependencies)
- HTML5 Canvas 2D Rendering
- Responsive Design, Mobile Support

## 📜 License

MIT License

## 🤝 Contribution

Issues and Pull Requests are welcome!

