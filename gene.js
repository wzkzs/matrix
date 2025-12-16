// ==================== 基因系统 ====================
// 实现基因结构和变异逻辑
// Requirements: 6.2

/**
 * 基因工具类 - 提供基因相关的工具函数
 */
const GeneUtils = {
  /**
   * 创建默认基因
   * @param {string} speciesType - 物种类型
   * @returns {Object} 基因对象 {speed, perception, size}
   */
  createDefaultGene(speciesType) {
    const species = SPECIES[speciesType];
    if (!species) {
      return { speed: 1, perception: 30, size: 1 };
    }
    return { ...species.baseGene };
  },

  /**
   * 基因变异
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @param {Object} parentGene - 父母基因
   * @param {number} mutationRate - 变异概率 (0-1)
   * @param {number} mutationAmount - 变异幅度 (0-1)
   * @returns {Object} 变异后的基因
   */
  mutate(parentGene, mutationRate = CONFIG.MUTATION_RATE, mutationAmount = CONFIG.MUTATION_AMOUNT) {
    const mutateValue = (value, minValue = 0.3, maxValue = 100) => {
      if (Math.random() < mutationRate) {
        // 变异方向随机（增加或减少）
        const change = (Math.random() - 0.5) * 2 * mutationAmount;
        // 应用变异，确保在范围内
        let newValue = value * (1 + change);
        return Math.max(minValue, Math.min(maxValue, newValue));
      }
      return value;
    };

    return {
      speed: mutateValue(parentGene.speed, 0.5, 15),       // 速度上限 15
      perception: mutateValue(parentGene.perception, 10, 200), // 感知上限 200
      size: mutateValue(parentGene.size, 0.3, 10)          // 体型上限 10
    };
  },

  /**
   * 混合两个基因（用于有性繁殖，可选功能）
   * @param {Object} gene1 - 父方基因
   * @param {Object} gene2 - 母方基因
   * @returns {Object} 混合后的基因
   */
  crossover(gene1, gene2) {
    return {
      speed: Math.random() < 0.5 ? gene1.speed : gene2.speed,
      perception: Math.random() < 0.5 ? gene1.perception : gene2.perception,
      size: Math.random() < 0.5 ? gene1.size : gene2.size
    };
  },

  /**
   * 计算基因适应度分数（用于观察进化趋势）
   * @param {Object} gene - 基因对象
   * @param {string} speciesType - 物种类型
   * @returns {number} 适应度分数
   */
  calculateFitness(gene, speciesType) {
    // 不同物种有不同的适应度权重
    const weights = {
      ant: { speed: 0.3, perception: 0.4, size: 0.3 },
      bird: { speed: 0.4, perception: 0.3, size: 0.3 },
      anteater: { speed: 0.2, perception: 0.5, size: 0.3 },
      snake: { speed: 0.3, perception: 0.4, size: 0.3 }
    };

    const w = weights[speciesType] || { speed: 0.33, perception: 0.33, size: 0.34 };
    
    // 归一化基因值并计算加权分数
    const baseGene = SPECIES[speciesType]?.baseGene || { speed: 1, perception: 30, size: 1 };
    
    const normalizedSpeed = gene.speed / baseGene.speed;
    const normalizedPerception = gene.perception / baseGene.perception;
    const normalizedSize = gene.size / baseGene.size;
    
    return (normalizedSpeed * w.speed + 
            normalizedPerception * w.perception + 
            normalizedSize * w.size);
  },

  /**
   * 格式化基因信息用于显示
   * @param {Object} gene - 基因对象
   * @returns {Object} 格式化后的基因信息
   */
  formatGene(gene) {
    return {
      speed: gene.speed.toFixed(2),
      perception: gene.perception.toFixed(2),
      size: gene.size.toFixed(2)
    };
  }
};


/**
 * 繁殖系统工具类
 * Requirements: 6.1, 6.2, 6.3
 */
const ReproductionUtils = {
  /**
   * 检查生物是否可以繁殖
   * Requirement 6.1: WHEN 生物能量充足 THEN 生物 SHALL 可以繁殖
   * @param {Object} creature - 生物实例
   * @param {number} threshold - 能量阈值（可选，默认使用CONFIG）
   * @returns {boolean}
   */
  canReproduce(creature, threshold = null) {
    if (!creature.isAlive) return false;
    
    // 检查繁殖冷却
    if (creature.reproductionCooldown && creature.reproductionCooldown > 0) {
      return false;
    }
    
    // 不同物种可能有不同的繁殖阈值
    // 捕食者需要更高的能量才能繁殖，模拟现实中顶级捕食者繁殖率低
    const speciesThresholds = {
      ant: CONFIG.REPRODUCTION_THRESHOLD,
      bird: CONFIG.REPRODUCTION_THRESHOLD * 1.2,
      anteater: CONFIG.REPRODUCTION_THRESHOLD * 1.8, // 降低门槛，从 2.5 降至 1.8
      snake: CONFIG.REPRODUCTION_THRESHOLD * 1.8     // 降低门槛，从 2.5 降至 1.8
    };
    
    const requiredEnergy = threshold || speciesThresholds[creature.type] || CONFIG.REPRODUCTION_THRESHOLD;
    return creature.energy >= requiredEnergy;
  },
  
  /**
   * 获取繁殖冷却时间（帧数）
   * @param {string} speciesType - 物种类型
   * @returns {number} 冷却帧数
   */
  getReproductionCooldown(speciesType) {
    // 60帧约等于1秒
    const cooldowns = {
      ant: 300,       // 5秒
      bird: 600,      // 10秒
      anteater: 1200, // 20秒
      snake: 1200     // 20秒
    };
    return cooldowns[speciesType] || 600;
  },
  
  /**
   * 获取怀孕/孵化时间（帧数）
   * @param {string} speciesType - 物种类型
   * @returns {number} 怀孕帧数
   */
  getPregnancyDuration(speciesType) {
    // 60帧约等于1秒
    const durations = {
      ant: 180,       // 3秒
      bird: 360,      // 6秒
      anteater: 600,  // 10秒
      snake: 480      // 8秒
    };
    return durations[speciesType] || 300;
  },

  /**
   * 计算繁殖消耗的能量
   * @param {string} speciesType - 物种类型
   * @returns {number} 消耗的能量
   */
  getReproductionCost(speciesType) {
    const costs = {
      ant: CONFIG.REPRODUCTION_COST,
      bird: CONFIG.REPRODUCTION_COST * 1.2,
      anteater: CONFIG.REPRODUCTION_COST * 2,  // 捕食者繁殖消耗更多
      snake: CONFIG.REPRODUCTION_COST * 2
    };
    return costs[speciesType] || CONFIG.REPRODUCTION_COST;
  },

  /**
   * 计算后代初始能量
   * @param {string} speciesType - 物种类型
   * @returns {number} 后代初始能量
   */
  getOffspringEnergy(speciesType) {
    const cost = this.getReproductionCost(speciesType);
    return cost * 0.8; // 后代获得繁殖消耗的80%能量
  },

  /**
   * 生成后代位置偏移
   * @param {string} speciesType - 物种类型
   * @returns {Object} {offsetX, offsetY}
   */
  getSpawnOffset(speciesType) {
    const offsets = {
      ant: 20,
      bird: 30,
      anteater: 40,
      snake: 50
    };
    const range = offsets[speciesType] || 25;
    return {
      offsetX: (Math.random() - 0.5) * range,
      offsetY: (Math.random() - 0.5) * range
    };
  }
};


/**
 * 死亡系统工具类
 * Requirement 6.3: WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
 */
const DeathUtils = {
  /**
   * 检查生物是否应该死亡
   * @param {Object} creature - 生物实例
   * @returns {boolean}
   */
  shouldDie(creature) {
    return creature.energy <= 0;
  },

  /**
   * 处理生物死亡
   * @param {Object} creature - 生物实例
   * @param {World} world - 世界实例（可选，用于生成植物）
   */
  handleDeath(creature, world = null) {
    if (this.shouldDie(creature)) {
      creature.isAlive = false;
      
      // 生物死亡后，尸体分解滋养大地，长出植物
      if (world && Math.random() < 0.8) { // 80% 概率生成植物
        // 尸体分解需要时间，我们简单模拟为立即生成或延迟生成
        // 这里生成 1-3 株植物，模拟"茂盛"
        const plantCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < plantCount; i++) {
          // 在尸体附近随机位置生成
          const offsetX = (Math.random() - 0.5) * 20;
          const offsetY = (Math.random() - 0.5) * 20;
          world.spawnPlant(creature.x + offsetX, creature.y + offsetY);
        }
      }
    }
  }
};
