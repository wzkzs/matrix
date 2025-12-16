// ==================== 生物基类 ====================
// 所有生物的共同行为和属性
// 通过继承减少代码重复

/**
 * 生物基类 - 所有生物的父类
 */
class Creature {
  /**
   * 创建生物
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {string} type - 生物类型
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, type, gene = null) {
    this.x = x;
    this.y = y;
    this.type = type;
    
    // 速度向量（随机初始方向）
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
    
    // 基因系统
    const speciesConfig = SPECIES[type];
    this.gene = gene || { ...speciesConfig.baseGene };
    
    // 能量
    this.energy = CONFIG.INITIAL_ENERGY;
    
    // 状态
    this.isAlive = true;
    this.generation = 0;
    this.reproductionCooldown = 0;
    this.pregnancyTimer = 0;
    
    // 外观
    this.size = speciesConfig.size * this.gene.size / this.getSizeDivisor();
    this.color = speciesConfig.color;
    
    // 行为参数
    this.wanderAngle = 0;
  }

  /**
   * 获取尺寸除数（子类可覆盖）
   * @returns {number}
   */
  getSizeDivisor() {
    return 1;
  }

  /**
   * 更新生物状态（子类必须实现）
   */
  update() {
    throw new Error('子类必须实现 update 方法');
  }

  /**
   * 绘制生物（子类必须实现）
   * @param {CanvasRenderingContext2D} ctx
   */
  draw(ctx) {
    throw new Error('子类必须实现 draw 方法');
  }

  /**
   * 基础移动逻辑
   * @param {number} speedMultiplier - 速度倍数
   */
  move(speedMultiplier = 1) {
    const speed = this.gene.speed * speedMultiplier;
    this.x += this.vx * speed;
    this.y += this.vy * speed;
    // 无限世界，不做边界限制
  }

  /**
   * 随机漫游
   * @param {number} turnAmount - 转向幅度
   */
  wander(turnAmount = 0.5) {
    const currentAngle = Math.atan2(this.vy, this.vx);
    const turn = (Math.random() - 0.5) * turnAmount;
    const newAngle = currentAngle + turn;
    
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  /**
   * 朝目标移动
   * @param {number} targetX - 目标x坐标
   * @param {number} targetY - 目标y坐标
   * @param {number} turnRate - 转向速率
   */
  moveTowards(targetX, targetY, turnRate = 0.2) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      this.vx = this.vx * (1 - turnRate) + (dx / dist) * turnRate;
      this.vy = this.vy * (1 - turnRate) + (dy / dist) * turnRate;
      this.normalizeVelocity();
    }
  }

  /**
   * 逃离目标
   * @param {Object} target - 要逃离的目标
   * @param {number} randomness - 随机性
   */
  fleeFrom(target, randomness = 0.3) {
    const dx = this.x - target.x;
    const dy = this.y - target.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      this.vx = dx / dist;
      this.vy = dy / dist;
      
      // 添加随机性
      this.vx += (Math.random() - 0.5) * randomness;
      this.vy += (Math.random() - 0.5) * randomness;
      this.normalizeVelocity();
    }
  }

  /**
   * 归一化速度向量
   */
  normalizeVelocity() {
    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > 0.01) {
      this.vx /= mag;
      this.vy /= mag;
    } else {
      const randomAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randomAngle);
      this.vy = Math.sin(randomAngle);
    }
  }

  /**
   * 消耗能量
   * @param {number} baseMultiplier - 基础消耗倍数
   * @param {number} speedMultiplier - 速度消耗倍数
   * @param {number} sizeMultiplier - 体型消耗倍数
   */
  consumeEnergy(baseMultiplier = 1, speedMultiplier = 0.005, sizeMultiplier = 0.01) {
    const speedCost = (this.gene.speed * this.gene.speed) * speedMultiplier;
    const sizeCost = this.gene.size * sizeMultiplier;
    
    this.energy -= (CONFIG.MOVE_COST * baseMultiplier) + speedCost + sizeCost;
  }

  /**
   * 生物死亡
   */
  die() {
    this.isAlive = false;
  }

  /**
   * 寻找范围内最近的目标
   * @param {Array} targets - 目标列表
   * @param {number} maxDistance - 最大距离
   * @param {Function} filter - 过滤函数（可选）
   * @returns {Object|null}
   */
  findNearest(targets, maxDistance = Infinity, filter = null) {
    let nearest = null;
    let minDist = maxDistance;
    
    for (const target of targets) {
      if (!target.isAlive) continue;
      if (filter && !filter(target)) continue;
      
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = target;
      }
    }
    
    return nearest;
  }

  /**
   * 计算到目标的距离
   * @param {Object} target - 目标对象
   * @returns {number}
   */
  distanceTo(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 更新繁殖相关计时器
   */
  updateReproductionTimers() {
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    if (this.pregnancyTimer > 0) {
      this.pregnancyTimer--;
    }
  }

  /**
   * 检查是否可以繁殖
   * @returns {boolean}
   */
  canReproduce() {
    if (this.pregnancyTimer > 0) return false;
    return ReproductionUtils.canReproduce(this);
  }

  /**
   * 开始怀孕过程
   * @returns {boolean}
   */
  startPregnancy() {
    if (!this.canReproduce()) return false;
    
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5;
    this.pregnancyTimer = ReproductionUtils.getPregnancyDuration(this.type);
    
    return true;
  }

  /**
   * 基因变异
   * @returns {Object}
   */
  mutateGene() {
    return GeneUtils.mutate(this.gene);
  }

  /**
   * 获取生物信息
   * @returns {Object}
   */
  getInfo() {
    return {
      type: SPECIES[this.type]?.name || this.type,
      energy: Math.round(this.energy),
      generation: this.generation,
      gene: GeneUtils.formatGene(this.gene)
    };
  }
}
