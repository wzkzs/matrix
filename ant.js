// ==================== 蚂蚁类 ====================
// 实现蚁群算法行为
// Requirements: 2.1, 3.1, 3.2, 3.3, 3.5

/**
 * 蚂蚁类 - 使用蚁群算法进行觅食
 */
class Ant extends Creature {
  /**
   * 创建蚂蚁
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {number} nestX - 蚁巢x坐标
   * @param {number} nestY - 蚁巢y坐标
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, nestX, nestY, gene = null) {
    super(x, y, 'ant', gene);
    
    // 蚁巢位置
    this.nestX = nestX;
    this.nestY = nestY;
    
    // 状态
    this.hasFood = false;
    this.fleeTimer = 0;
    this.isInsideNest = false;
    this.stayInNestTimer = 0;
  }

  getSizeDivisor() {
    return 1;
  }

  /**
   * 更新蚂蚁状态
   */
  update(world, pheromoneGrid, predators = [], neighbors = []) {
    if (!this.isAlive) return;

    // 在蚁巢内休息
    if (this.isInsideNest) {
      if (this.stayInNestTimer > 0) {
        this.stayInNestTimer--;
        return;
      } else {
        this.leaveNest();
        return;
      }
    }
    
    this.updateReproductionTimers();
    
    // 检查天敌
    const nearbyPredator = this.findNearbyPredator(predators);
    if (nearbyPredator) {
      this.fleeFrom(nearbyPredator);
      this.fleeTimer = 30;
    }
    
    // 行为决策
    if (this.fleeTimer > 0) {
      this.fleeTimer--;
    } else if (this.hasFood) {
      this.returnToNest();
    } else if (this.energy < CONFIG.INITIAL_ENERGY * 0.3) {
      // 能量不足 → 返回巢穴补给（真实蚂蚁行为：能量驱动回巢）
      this.returnToNest();
    } else {
      this.searchForFood(world, pheromoneGrid);
    }
    
    // 分离行为
    if (neighbors && neighbors.length > 0) {
      this.separate(neighbors);
    }

    this.moveAnt(world);
    this.depositPheromone(pheromoneGrid);
    this.consumeEnergy(1, 0.005, 0.01);
    
    // 检查到达蚁巢（携带食物回巢 或 低能量返巢休息）
    if (this.hasFood || this.energy < CONFIG.INITIAL_ENERGY * 0.3) {
      this.checkNestArrival();
    }
    
    if (!this.hasFood && this.fleeTimer === 0) {
      this.checkFoodPickup(world);
    }
  }

  /**
   * 离开蚁巢
   */
  leaveNest() {
    this.isInsideNest = false;
    const angle = Math.random() * Math.PI * 2;
    this.x = this.nestX + Math.cos(angle) * 20;
    this.y = this.nestY + Math.sin(angle) * 20;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
  }

  /**
   * 分离行为 - 避免与其他蚂蚁重叠
   */
  separate(neighbors) {
    const separationRadius = this.size * 2.5;
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor === this || !neighbor.isAlive) continue;

      const dist = this.distanceTo(neighbor);

      if (dist < separationRadius) {
        if (dist < 1.0) {
          const angle = Math.random() * Math.PI * 2;
          sumX += Math.cos(angle) * 10;
          sumY += Math.sin(angle) * 10;
        } else {
          const dx = this.x - neighbor.x;
          const dy = this.y - neighbor.y;
          const force = Math.pow((separationRadius - dist) / separationRadius, 2);
          sumX += (dx / dist) * force * 5;
          sumY += (dy / dist) * force * 5;
        }
        count++;
      }
    }

    if (count > 0) {
      const separationWeight = 3.0;
      this.vx += (sumX / count) * separationWeight;
      this.vy += (sumY / count) * separationWeight;
      
      if (count > 2) {
        const jitterAngle = Math.random() * Math.PI * 2;
        const jitterStrength = Math.min(2.0, count * 0.2);
        this.vx += Math.cos(jitterAngle) * jitterStrength;
        this.vy += Math.sin(jitterAngle) * jitterStrength;
      }

      this.normalizeVelocity();
    }
  }

  /**
   * 蚂蚁移动
   */
  moveAnt() {
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed < 0.1) {
      const randomAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randomAngle);
      this.vy = Math.sin(randomAngle);
    }
    
    this.move(1);
  }

  /**
   * 寻找食物
   * 真实蚂蚁行为：视觉优先发现食物 → 信息素概率引导 → 随机漫游探索
   */
  searchForFood(world, pheromoneGrid) {
    // 1. 视觉优先：感知范围内直接发现食物
    const nearestPlant = world.getNearestPlant(this.x, this.y, this.gene.perception);
    
    if (nearestPlant) {
      this.moveTowards(nearestPlant.x, nearestPlant.y);
    } else {
      // 2. 信息素引导：ACO 概率性跟随
      this.followPheromone(pheromoneGrid);
    }
  }

  /**
   * 跟随信息素（ACO 概率选择）
   * 
   * 真实蚂蚁行为：
   * - 不是总走最浓的路，而是概率性选择（轮盘赌）
   * - 浓度高的路径被选中概率更大，但总有蚂蚁选择其他方向
   * - 这天然避免了所有蚂蚁聚集在同一点
   */
  followPheromone(pheromoneGrid) {
    // ACO 轮盘赌选择方向（传入当前航向用于惯性偏置）
    const selected = pheromoneGrid.selectDirectionProbabilistic(
      this.x, this.y, this.vx, this.vy, 2, 2
    );
    
    if (selected) {
      // 巢穴附近不跟随信息素，促使蚂蚁向外探索
      const toNestDist = Math.sqrt(
        Math.pow(this.nestX - this.x, 2) + Math.pow(this.nestY - this.y, 2)
      );
      if (toNestDist < 80) {
        this.wander();
        return;
      }
      
      const dx = selected.x - this.x;
      const dy = selected.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        // 平滑转向：保持一定的当前惯性，不会急转弯
        const pheromoneWeight = 0.5;
        this.vx = this.vx * (1 - pheromoneWeight) + (dx / dist) * pheromoneWeight;
        this.vy = this.vy * (1 - pheromoneWeight) + (dy / dist) * pheromoneWeight;
        this.normalizeVelocity();
      }
    } else {
      // 无信息素可循：随机漫游探索新区域
      this.wander();
    }
  }

  /**
   * 释放信息素
   * 
   * 真实蚂蚁行为：
   * - 携带食物回巢时沿途均匀释放信息素
   * - 每步释放量相同（短路径强化靠的是时间效应，不是单次释放量）
   *   → 短路径往返更快 → 单位时间更多趟次 → 累积浓度更高
   *   → 长路径往返慢 → 信息素在等待间蒸发 → 浓度低
   * - 巢穴附近不释放，避免入口信息素堆积干扰搜索方向
   * - 探索时不释放信息素（负反馈完全依赖自然蒸发）
   */
  depositPheromone(pheromoneGrid) {
    if (this.hasFood) {
      const dx = this.x - this.nestX;
      const dy = this.y - this.nestY;
      const distToNest = Math.sqrt(dx * dx + dy * dy);

      // 巢穴附近不释放，避免入口区域信息素过密
      if (distToNest > 30) {
        pheromoneGrid.deposit(this.x, this.y, CONFIG.PHEROMONE_DEPOSIT * 2);
      }
    }
  }

  /**
   * 返回蚁巢
   */
  returnToNest() {
    this.moveTowards(this.nestX, this.nestY);
  }

  /**
   * 检查是否到达蚁巢
   * 支持两种回巢场景：
   * 1. 携带食物回巢 → 卸下食物、恢复能量、进巢休息
   * 2. 能量不足回巢 → 进巢休息（停止消耗能量）
   */
  checkNestArrival() {
    const dx = this.nestX - this.x;
    const dy = this.nestY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 15) {
      if (this.hasFood) {
        this.hasFood = false;
        this.energy += CONFIG.FOOD_ENERGY;
      }
      this.isInsideNest = true;
      this.stayInNestTimer = 60;
      return true;
    }
    return false;
  }

  /**
   * 检查是否可以拾取植物
   */
  checkFoodPickup(world) {
    const nearestPlant = world.getNearestPlant(this.x, this.y, this.size + 5);
    
    if (nearestPlant) {
      this.hasFood = true;
      world.removePlant(nearestPlant);
      this.vx = -this.vx;
      this.vy = -this.vy;
    }
  }

  /**
   * 寻找附近的捕食者
   */
  findNearbyPredator(predators) {
    return this.findNearest(predators, this.gene.perception, 
      p => SPECIES.ant.predators.includes(p.type));
  }

  /**
   * 蚂蚁不能独立繁殖
   */
  canReproduce() {
    return false;
  }

  reproduce() {
    return null;
  }

  draw(ctx) {
    if (!this.isAlive || this.isInsideNest) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    
    ctx.fillStyle = this.color;
    
    // 头部
    ctx.beginPath();
    ctx.arc(this.size * 1.2, 0, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // 胸部
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // 腹部
    ctx.beginPath();
    ctx.arc(-this.size * 1.3, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 携带的食物
    if (this.hasFood) {
      ctx.fillStyle = '#4ecdc4';
      ctx.beginPath();
      ctx.arc(this.size * 2, 0, this.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // 触角
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.size * 1.5, -this.size * 0.3);
    ctx.lineTo(this.size * 2, -this.size * 0.7);
    ctx.moveTo(this.size * 1.5, this.size * 0.3);
    ctx.lineTo(this.size * 2, this.size * 0.7);
    ctx.stroke();
    
    // 腿
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.5, 0);
    ctx.lineTo(this.size * 0.8, -this.size);
    ctx.moveTo(this.size * 0.5, 0);
    ctx.lineTo(this.size * 0.8, this.size);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this.size * 1.1);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, this.size * 1.1);
    ctx.moveTo(-this.size * 0.5, 0);
    ctx.lineTo(-this.size * 0.8, -this.size);
    ctx.moveTo(-this.size * 0.5, 0);
    ctx.lineTo(-this.size * 0.8, this.size);
    ctx.stroke();
    
    ctx.restore();
  }
}



// ==================== 蚁巢类 ====================

/**
 * 蚁巢类 - 蚂蚁的基地
 */
class AntNest {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.foodStored = 0;
    this.size = 15;
    this.color = '#654321';
    this.maxAnts = 50;
    this.spawnCooldown = 0;
    this.spawnInterval = 60;
    this.antCount = 0;
  }

  /**
   * 更新蚁巢状态
   */
  update(ants, pheromoneGrid = null) {
    this.antCount = ants.filter(ant => 
      ant.isAlive && ant.isInsideNest && ant.nestX === this.x && ant.nestY === this.y
    ).length;
    
    if (this.spawnCooldown > 0) {
      this.spawnCooldown--;
    }
    
    if (this.canSpawnAnt(ants)) {
      return this.spawnAnt();
    }
    
    return null;
  }

  canSpawnAnt(ants) {
    const nestAnts = ants.filter(ant => 
      ant.nestX === this.x && ant.nestY === this.y && ant.isAlive
    );
    
    return this.foodStored >= 2 && 
           nestAnts.length < this.maxAnts && 
           this.spawnCooldown === 0;
  }

  spawnAnt() {
    this.foodStored -= 2;
    this.spawnCooldown = this.spawnInterval;
    
    const angle = Math.random() * Math.PI * 2;
    const distance = this.size + 5;
    const spawnX = this.x + Math.cos(angle) * distance;
    const spawnY = this.y + Math.sin(angle) * distance;
    
    return new Ant(spawnX, spawnY, this.x, this.y);
  }

  storeFood(amount = 1) {
    this.foodStored += amount;
  }

  draw(ctx) {
    ctx.save();
    
    ctx.fillStyle = this.color;
    
    // 底部
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 5, this.size * 1.2, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 中间
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 顶部
    ctx.beginPath();
    ctx.arc(this.x, this.y - this.size * 0.5, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // 入口
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, this.size * 0.4, this.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 信息显示
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🍖${this.foodStored}`, this.x, this.y - this.size - 15);
    ctx.fillText(`🐜${this.antCount}`, this.x, this.y - this.size - 5);
    
    ctx.restore();
  }

  getInfo() {
    return {
      type: '蚁巢',
      foodStored: this.foodStored,
      position: { x: Math.round(this.x), y: Math.round(this.y) }
    };
  }
}
