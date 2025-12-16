// ==================== 游戏配置 ====================
// 全局配置常量

const CONFIG = {
  WORLD_WIDTH: 2000,   // 大地图宽度
  WORLD_HEIGHT: 1500,  // 大地图高度

  // 食物
  FOOD_SPAWN_RATE: 0.5,    // 提高食物生成率
  MAX_FOOD: 120,           // 增加最大食物数量
  FOOD_ENERGY: 100,         // 增加食物能量

  // 能量
  INITIAL_ENERGY: 200,     // 增加初始能量
  MOVE_COST: 0.03,         // 降低移动消耗
  REPRODUCTION_THRESHOLD: 180,
  REPRODUCTION_COST: 50,

  // 进化
  MUTATION_RATE: 0.2,
  MUTATION_AMOUNT: 0.3,

  // 信息素
  PHEROMONE_DEPOSIT: 10,
  PHEROMONE_EVAPORATION: 0.995  // 提高保留率，信息素保存更久
};

// 物种配置
const SPECIES = {
  ant: {
    name: '蚂蚁',
    color: '#D2691E',  // 更亮的棕色，更容易看到
    size: 3,           // 增大基础尺寸
    baseGene: { speed: 1.8, perception: 60, size: 1 },  // 降低速度
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
    prey: ['bird'],  // 蛇只吃鸟
    predators: []
  }
};
