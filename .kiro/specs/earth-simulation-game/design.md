# Design Document

## Overview

生物进化模拟器，包含四种物种和两条食物链：
- **蚂蚁** → **食蚁兽**
- **鸟** → **猫**

蚂蚁使用蚁群算法（信息素），鸟使用鸟群算法（Boids）。所有物种都可以繁殖和进化。

### 技术选型

- HTML5 + Canvas + JavaScript（无框架）
- 直接在浏览器运行

## Architecture

```
index.html + style.css
         │
         ▼
      main.js (游戏主循环、事件处理)
         │
    ┌────┼────┬────────┐
    ▼    ▼    ▼        ▼
world.js  ant.js  bird.js  predator.js
(世界/食物) (蚂蚁)  (鸟)    (食蚁兽/猫)
    │
    ▼
pheromone.js (信息素网格)
```

## Components and Interfaces

### 1. Creature 基类

```javascript
class Creature {
  constructor(x, y, type)
  
  x, y: number          // 位置
  vx, vy: number        // 速度
  energy: number        // 能量
  gene: {               // 基因
    speed: number,
    perception: number,
    size: number
  }
  generation: number    // 代数
  
  update(world)         // 更新
  draw(ctx)             // 绘制
  reproduce()           // 繁殖
  die()                 // 死亡
}
```

### 2. Ant（蚂蚁）

```javascript
class Ant extends Creature {
  hasFood: boolean      // 是否携带食物
  nestX, nestY: number  // 蚁巢位置
  
  update(world, pheromoneGrid)
  followPheromone(grid) // 跟随信息素
  depositPheromone(grid)// 释放信息素
  returnToNest()        // 返回蚁巢
}

class AntNest {
  x, y: number
  foodStored: number    // 储存的食物
  
  spawnAnt()            // 生成新蚂蚁
}
```

### 3. Bird（鸟）

```javascript
class Bird extends Creature {
  update(world, birds)
  
  // Boids 三规则
  separation(neighbors) // 分离：避免碰撞
  alignment(neighbors)  // 对齐：方向一致
  cohesion(neighbors)   // 聚合：靠近中心
  
  flock(birds)          // 组合三规则
  seekFood(world)       // 寻找食物
  flee(predators)       // 逃跑
}
```

### 4. Predator（捕食者）

```javascript
class Anteater extends Creature {  // 食蚁兽
  hunt(ants)            // 捕猎蚂蚁
}

class Snake extends Creature {     // 蛇
  hunt(prey)            // 捕猎鸟或蚂蚁
}
```

### 5. PheromoneGrid（信息素网格）

```javascript
class PheromoneGrid {
  constructor(width, height, cellSize)
  
  grid: number[][]      // 信息素浓度
  
  deposit(x, y, amount) // 释放
  evaporate(rate)       // 蒸发
  getStrength(x, y)     // 获取浓度
  draw(ctx)             // 可视化
}
```

### 6. World（世界）

```javascript
class World {
  width, height: number
  foods: Food[]
  pheromoneGrid: PheromoneGrid
  
  spawnFood()
  update()
  draw(ctx)
}
```

### 7. Game（主控）

```javascript
class Game {
  world: World
  creatures: Creature[]
  antNests: AntNest[]
  selectedType: string  // 当前选择的物种
  isPaused: boolean
  
  init()
  update()
  draw()
  spawnCreature(x, y, type)
  handleClick(x, y)
  handleKeyPress(key)
}
```

## Data Models

### 物种配置

```javascript
const SPECIES = {
  ant: {
    name: '蚂蚁',
    color: '#8B4513',
    size: 3,
    baseGene: { speed: 2, perception: 30, size: 1 },
    prey: [],
    predators: ['anteater', 'bird']
  },
  bird: {
    name: '鸟',
    color: '#4169E1',
    size: 8,
    baseGene: { speed: 5, perception: 60, size: 3 },
    prey: ['ant', 'food'],
    predators: ['snake']
  },
  anteater: {
    name: '食蚁兽',
    color: '#696969',
    size: 20,
    baseGene: { speed: 3, perception: 80, size: 8 },
    prey: ['ant'],
    predators: []
  },
  snake: {
    name: '蛇',
    color: '#228B22',
    size: 18,
    baseGene: { speed: 4, perception: 80, size: 5 },
    prey: ['bird', 'ant'],
    predators: []
  }
}
```

### 游戏常量

```javascript
const CONFIG = {
  WORLD_WIDTH: 900,
  WORLD_HEIGHT: 600,
  
  // 食物
  FOOD_SPAWN_RATE: 0.3,
  MAX_FOOD: 80,
  FOOD_ENERGY: 20,
  
  // 能量
  INITIAL_ENERGY: 100,
  MOVE_COST: 0.1,
  REPRODUCTION_THRESHOLD: 150,
  REPRODUCTION_COST: 60,
  
  // 进化
  MUTATION_RATE: 0.2,
  MUTATION_AMOUNT: 0.3,
  
  // 信息素
  PHEROMONE_DEPOSIT: 10,
  PHEROMONE_EVAPORATION: 0.98
}
```

## UI 布局

```
┌─────────────────────────────────────────────────────┐
│ 🐜 │                                           │ 🐦 │
│蚂蚁│                                           │ 鸟 │
├────┤                                           ├────┤
│    │                                           │    │
│    │          Canvas 游戏区域                   │    │
│    │                                           │    │
│    │     (从边缘拖拽物种图标到地图放置)          │    │
│    │     (拖拽距离越长，生成数量越多)           │    │
│    │                                           │    │
├────┤                                           ├────┤
│ 🦡 │                                           │ 🐍 │
│食蚁│                                           │ 蛇 │
│ 兽 │                                           │    │
└────┴───────────────────────────────────────────┴────┘
      蚂蚁: 23  鸟: 15  食蚁兽: 3  蛇: 2  代数: 5
      
      空格=暂停  R=重置
```

### 拖拽交互设计

```javascript
// 拖拽状态
dragState: {
  isDragging: boolean,
  species: string,        // 拖拽的物种类型
  startX, startY: number, // 起始位置
  currentX, currentY: number, // 当前位置
  count: number           // 将生成的数量 (1-10)
}

// 拖拽逻辑
- 鼠标在边缘物种图标上按下 -> 开始拖拽
- 拖拽过程中显示虚线和预览
- 拖拽距离 / 50 = 生成数量 (最小1，最大10)
- 释放鼠标 -> 在释放位置生成对应数量的物种
```

## Testing Strategy

### 功能测试

1. 蚂蚁能找到食物并返回蚁巢
2. 信息素路径逐渐形成
3. 鸟群保持队形飞行
4. 捕食者能追捕猎物
5. 繁殖和变异正常工作

### 平衡测试

1. 没有捕食者时，猎物数量稳定增长
2. 有捕食者时，形成动态平衡
3. 多代后能观察到进化趋势
