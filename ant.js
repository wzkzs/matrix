// ==================== 蚂蚁类 ====================
// 实现蚁群算法行为
// Requirements: 2.1, 3.1, 3.2, 3.3, 3.5

/**
 * 蚂蚁类 - 使用蚁群算法进行觅食
 */
class Ant {
  /**
   * 创建蚂蚁
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {number} nestX - 蚁巢x坐标
   * @param {number} nestY - 蚁巢y坐标
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, nestX, nestY, gene = null) {
    this.x = x;
    this.y = y;
    this.type = 'ant';
    
    // 蚁巢位置
    this.nestX = nestX;
    this.nestY = nestY;
    
    // 速度向量（随机初始方向）
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
    
    // 基因系统
    this.gene = gene || { ...SPECIES.ant.baseGene };
    
    // 能量
    this.energy = CONFIG.INITIAL_ENERGY;
    
    // 状态
    this.hasFood = false;      // 是否携带食物
    this.isAlive = true;       // 是否存活
    this.generation = 0;       // 代数
    this.reproductionCooldown = 0; // 繁殖冷却
    this.pregnancyTimer = 0;   // 怀孕计时器（0表示未怀孕）
    
    // 外观
    this.size = SPECIES.ant.size * this.gene.size;
    this.color = SPECIES.ant.color;
    
    // 行为参数
    this.wanderAngle = 0;      // 随机漫游角度
    this.fleeTimer = 0;        // 逃跑计时器
    this.isInsideNest = false; // 是否在蚁巢内
    this.stayInNestTimer = 0;  // 在蚁巢内停留时间
  }

  /**
   * 更新蚂蚁状态
   * @param {World} world - 世界实例
   * @param {PheromoneGrid} pheromoneGrid - 信息素网格
   * @param {Array} predators - 捕食者列表
   * @param {Array} neighbors - 邻居列表（如同类）
   */
  update(world, pheromoneGrid, predators = [], neighbors = []) {
    if (!this.isAlive) return;

    // 如果在蚁巢内
    if (this.isInsideNest) {
      if (this.stayInNestTimer > 0) {
        this.stayInNestTimer--;
        return; // 在巢内休息，不更新位置和绘制
      } else {
        // 离开蚁巢
        this.isInsideNest = false;
        // 设置位置到蚁巢边缘
        const angle = Math.random() * Math.PI * 2;
        this.x = this.nestX + Math.cos(angle) * 20;
        this.y = this.nestY + Math.sin(angle) * 20;
        // 给一个向外的速度
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
        return;
      }
    }
    
    // 更新繁殖冷却
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    
    // 更新怀孕计时器
    if (this.pregnancyTimer > 0) {
      this.pregnancyTimer--;
    }
    
    // 检查是否需要逃跑
    const nearbyPredator = this.findNearbyPredator(predators);
    if (nearbyPredator) {
      this.flee(nearbyPredator);
      this.fleeTimer = 30; // 逃跑持续30帧
    }
    
    // 如果在逃跑中
    if (this.fleeTimer > 0) {
      this.fleeTimer--;
    } else if (this.hasFood) {
      // 携带食物，返回蚁巢
      this.returnToNest();
    } else {
      // 寻找植物
      this.searchForFood(world, pheromoneGrid);
    }
    
    // 分离行为（避免重叠）
    if (neighbors && neighbors.length > 0) {
      this.separate(neighbors);
    }

    // 移动
    this.move(world);
    
    // 释放信息素
    this.depositPheromone(pheromoneGrid);
    
    // 消耗能量
    this.consumeEnergy();
    
    // 检查是否到达蚁巢（携带食物时）
    if (this.hasFood) {
      this.checkNestArrival();
    }
    
    // 检查是否找到植物
    if (!this.hasFood && this.fleeTimer === 0) {
      this.checkFoodPickup(world);
    }
  }

  /**
   * 分离行为 - 避免与其他蚂蚁重叠
   * @param {Array} neighbors - 邻居列表
   */
  separate(neighbors) {
    const separationRadius = this.size * 2.5; // 分离半径
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    for (const neighbor of neighbors) {
      if (neighbor === this || !neighbor.isAlive) continue;

      const dx = this.x - neighbor.x;
      const dy = this.y - neighbor.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < separationRadius) {
        if (dist < 1.0) { // 增加判定范围，防止浮点数精度问题
          // 几乎重叠，给予强力随机排斥
          const angle = Math.random() * Math.PI * 2;
          // 给予足够大的推力，确保它们能分开
          sumX += Math.cos(angle) * 10;
          sumY += Math.sin(angle) * 10;
        } else {
          // 计算远离向量，距离越近排斥力越大
          // 使用指数级排斥力，距离越近力量呈指数增长
          const force = Math.pow((separationRadius - dist) / separationRadius, 2);
          sumX += (dx / dist) * force * 5; // 增加基础排斥力度
          sumY += (dy / dist) * force * 5;
        }
        count++;
      }
    }

    if (count > 0) {
      // 平均化并应用排斥力
      // 提高排斥力权重，确保优先级高于寻路
      const separationWeight = 3.0;
      this.vx += (sumX / count) * separationWeight;
      this.vy += (sumY / count) * separationWeight;
      
      // 如果周围非常拥挤（邻居数量多），引入强随机扰动
      // 这可以防止蚂蚁在无信息素区域挤成一团"颤动"（打破死锁）
      if (count > 2) {
        const jitterAngle = Math.random() * Math.PI * 2;
        // 拥挤度越高，扰动越大
        const jitterStrength = Math.min(2.0, count * 0.2); 
        this.vx += Math.cos(jitterAngle) * jitterStrength;
        this.vy += Math.sin(jitterAngle) * jitterStrength;
      }

      // 归一化速度
      this.normalizeVelocity();
    }
  }

  /**
   * 移动蚂蚁
   * @param {World} world - 世界实例
   */
  move(world) {
    // 确保速度向量有效
    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed < 0.1) {
      // 速度太小，重新初始化
      const randomAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randomAngle);
      this.vy = Math.sin(randomAngle);
    }
    
    // 根据基因速度移动
    const speed = this.gene.speed;
    this.x += this.vx * speed;
    this.y += this.vy * speed;
    
    // 移除边界反弹，允许蚂蚁跑出地图范围
    // 探索未知领域是进化的动力
  }

  /**
   * 消耗能量
   */
  consumeEnergy() {
    // 基础消耗 + 速度加成（速度越快消耗越大）+ 体型加成
    const speedCost = (this.gene.speed * this.gene.speed) * 0.005;
    const sizeCost = this.gene.size * 0.01;
    
    this.energy -= CONFIG.MOVE_COST + speedCost + sizeCost;
    
    // 能量耗尽则死亡逻辑移交到 main.js 统一处理，以便生成植物
  }

  /**
   * 蚂蚁死亡
   * Requirement 6.3: WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
   */
  die() {
    this.isAlive = false;
  }

  /**
   * 绘制蚂蚁
   * Requirement 2.1: 显示蚂蚁
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  draw(ctx) {
    if (!this.isAlive || this.isInsideNest) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 计算朝向角度
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    
    // 绘制蚂蚁身体
    ctx.fillStyle = this.color;
    
    // 使用圆形代替椭圆（更好的兼容性）
    // 头部
    ctx.beginPath();
    ctx.arc(this.size * 1.2, 0, this.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
    
    // 胸部
    ctx.beginPath();
    ctx.arc(0, 0, this.size * 0.8, 0, Math.PI * 2);
    ctx.fill();
    
    // 腹部（稍大）
    ctx.beginPath();
    ctx.arc(-this.size * 1.3, 0, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 如果携带食物，显示食物（绿色小球）
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
    
    // 腿（6条）
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    // 前腿
    ctx.beginPath();
    ctx.moveTo(this.size * 0.5, 0);
    ctx.lineTo(this.size * 0.8, -this.size);
    ctx.moveTo(this.size * 0.5, 0);
    ctx.lineTo(this.size * 0.8, this.size);
    // 中腿
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -this.size * 1.1);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, this.size * 1.1);
    // 后腿
    ctx.moveTo(-this.size * 0.5, 0);
    ctx.lineTo(-this.size * 0.8, -this.size);
    ctx.moveTo(-this.size * 0.5, 0);
    ctx.lineTo(-this.size * 0.8, this.size);
    ctx.stroke();
    
    ctx.restore();
  }

  /**
   * 寻找植物
   * @param {World} world - 世界实例
   * @param {PheromoneGrid} pheromoneGrid - 信息素网格
   */
  searchForFood(world, pheromoneGrid) {
    // 首先检查是否能直接看到植物
    const nearestPlant = world.getNearestPlant(this.x, this.y, this.gene.perception);
    
    if (nearestPlant) {
      // 直接朝植物移动
      this.moveTowards(nearestPlant.x, nearestPlant.y);
    } else {
      // 跟随信息素或随机漫游
      this.followPheromone(pheromoneGrid);
    }
  }


  /**
   * 跟随信息素
   * Requirement 3.1: WHEN 蚂蚁寻找食物时 THEN 蚂蚁 SHALL 倾向于跟随信息素浓度高的路径
   * @param {PheromoneGrid} pheromoneGrid - 信息素网格
   */
  followPheromone(pheromoneGrid) {
    // 获取周围信息素最强的方向
    const strongestDir = pheromoneGrid.getStrongestDirection(this.x, this.y, 2);
    
    if (strongestDir && strongestDir.strength > 1) {
      // 有信息素，计算方向
      const targetX = strongestDir.x;
      const targetY = strongestDir.y;
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 计算到蚁巢的距离
      const toNestX = this.nestX - this.x;
      const toNestY = this.nestY - this.y;
      const toNestDist = Math.sqrt(toNestX * toNestX + toNestY * toNestY);
      
      // 如果在蚁巢附近，强制忽略信息素，使用随机漫游离开巢穴区域
      // 这是为了避免"信息素陷阱"，即蚂蚁一出门就跟随返回的路径走回巢穴
      if (toNestDist < 80) {
        this.wander();
        return;
      }

      // 如果能量低于50%且在稍远处，也倾向于随机探索而不是跟随可能回巢的路径
      const energyRatio = this.energy / CONFIG.INITIAL_ENERGY;
      if (energyRatio < 0.5 && toNestDist < 150) {
        this.wander();
        return;
      }
      
      if (dist > 0) {
        // 混合当前方向和信息素方向（70%信息素，30%当前方向）
        const pheromoneWeight = 0.7;
        this.vx = this.vx * (1 - pheromoneWeight) + (dx / dist) * pheromoneWeight;
        this.vy = this.vy * (1 - pheromoneWeight) + (dy / dist) * pheromoneWeight;
        
        // 归一化
        this.normalizeVelocity();
      }
    } else {
      // 没有信息素，随机漫游
      this.wander();
    }
  }

  /**
   * 随机漫游
   */
  wander() {
    // 计算当前角度
    const currentAngle = Math.atan2(this.vy, this.vx);
    
    // 添加随机角度变化（每帧小幅度随机转向）
    const turnAmount = (Math.random() - 0.5) * 0.5;
    const newAngle = currentAngle + turnAmount;
    
    // 设置新的速度方向
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  /**
   * 释放信息素
   * Requirement 3.3: WHEN 蚂蚁移动时 THEN 蚂蚁 SHALL 在路径上释放信息素
   * @param {PheromoneGrid} pheromoneGrid - 信息素网格
   */
  depositPheromone(pheromoneGrid) {
    // 只有携带食物时才释放信息素（标记成功路径）
    // 没有食物时不释放，避免在蚁巢附近形成信息素陷阱
    if (this.hasFood) {
      // 检查离蚁巢的距离
      const dx = this.x - this.nestX;
      const dy = this.y - this.nestY;
      const distToNest = Math.sqrt(dx * dx + dy * dy);

      // 在蚁巢附近不释放信息素，形成一个"缓冲区"
      // 防止蚂蚁一出巢就被高浓度信息素吸引回来
      if (distToNest > 60) {
        pheromoneGrid.deposit(this.x, this.y, CONFIG.PHEROMONE_DEPOSIT * 2);
      }
    }
  }

  /**
   * 返回蚁巢
   * Requirement 3.2: WHEN 蚂蚁找到食物时 THEN 蚂蚁 SHALL 携带食物返回蚁巢
   */
  returnToNest() {
    this.moveTowards(this.nestX, this.nestY);
  }

  /**
   * 检查是否到达蚁巢
   */
  checkNestArrival() {
    const dx = this.nestX - this.x;
    const dy = this.nestY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < 15) {
      // 到达蚁巢，卸下食物
      this.hasFood = false;
      this.energy += CONFIG.FOOD_ENERGY; // 获得能量奖励
      
      // 进入蚁巢休息
      this.isInsideNest = true;
      this.stayInNestTimer = 60; // 在巢内停留60帧（约1秒）
      
      return true;
    }
    return false;
  }

  /**
   * 检查是否可以拾取植物
   * @param {World} world - 世界实例
   */
  checkFoodPickup(world) {
    const nearestPlant = world.getNearestPlant(this.x, this.y, this.size + 5);
    
    if (nearestPlant) {
      // 拾取植物
      this.hasFood = true;
      world.removePlant(nearestPlant);
      
      // 转向回巢
      this.vx = -this.vx;
      this.vy = -this.vy;
    }
  }

  /**
   * 朝目标移动
   * @param {number} targetX - 目标x坐标
   * @param {number} targetY - 目标y坐标
   */
  moveTowards(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 1) {
      // 平滑转向
      const turnRate = 0.2;
      this.vx = this.vx * (1 - turnRate) + (dx / dist) * turnRate;
      this.vy = this.vy * (1 - turnRate) + (dy / dist) * turnRate;
      this.normalizeVelocity();
    } else {
      // 距离很近时，给一个随机方向避免卡住
      const randomAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randomAngle);
      this.vy = Math.sin(randomAngle);
    }
  }


  /**
   * 寻找附近的捕食者
   * @param {Array} predators - 捕食者列表
   * @returns {Object|null} 最近的捕食者
   */
  findNearbyPredator(predators) {
    let nearest = null;
    let minDist = this.gene.perception;
    
    for (const predator of predators) {
      if (!predator.isAlive) continue;
      
      // 检查是否是蚂蚁的天敌
      if (SPECIES.ant.predators.includes(predator.type)) {
        const dx = predator.x - this.x;
        const dy = predator.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < minDist) {
          minDist = dist;
          nearest = predator;
        }
      }
    }
    
    return nearest;
  }

  /**
   * 逃跑行为
   * Requirement 3.5: WHEN 蚂蚁发现天敌 THEN 蚂蚁 SHALL 尝试逃跑
   * @param {Object} predator - 捕食者
   */
  flee(predator) {
    // 计算逃跑方向（远离捕食者）
    const dx = this.x - predator.x;
    const dy = this.y - predator.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // 快速转向逃跑方向
      this.vx = dx / dist;
      this.vy = dy / dist;
      
      // 添加一些随机性，避免直线逃跑
      this.vx += (Math.random() - 0.5) * 0.3;
      this.vy += (Math.random() - 0.5) * 0.3;
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
      // 如果速度太小，给一个随机方向
      const randomAngle = Math.random() * Math.PI * 2;
      this.vx = Math.cos(randomAngle);
      this.vy = Math.sin(randomAngle);
    }
  }

  /**
   * 检查是否可以繁殖
   * Requirement: 蚂蚁作为工蚁，不具备独立繁殖能力，只能由蚁巢生成
   * @returns {boolean}
   */
  canReproduce() {
    return false;
  }
  
  /**
   * 开始怀孕过程
   * @returns {boolean} 是否成功开始怀孕
   */
  startPregnancy() {
    if (!this.canReproduce()) return false;
    
    // 消耗部分能量开始怀孕
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5; // 先消耗一半能量
    
    // 设置怀孕计时器
    this.pregnancyTimer = ReproductionUtils.getPregnancyDuration(this.type);
    
    return true;
  }

  /**
   * 繁殖（怀孕期结束后调用）
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @returns {Ant|null} 新生的蚂蚁
   */
  reproduce() {
    // 消耗剩余能量
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5;
    
    // 设置繁殖冷却
    this.reproductionCooldown = ReproductionUtils.getReproductionCooldown(this.type);
    
    // 基因变异
    const childGene = this.mutateGene();
    
    // 在附近位置生成后代
    const offset = ReproductionUtils.getSpawnOffset(this.type);
    
    const child = new Ant(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
      this.nestX,
      this.nestY,
      childGene
    );
    
    child.generation = this.generation + 1;
    child.energy = ReproductionUtils.getOffspringEnergy(this.type);
    
    return child;
  }

  /**
   * 基因变异
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @returns {Object} 变异后的基因
   */
  mutateGene() {
    return GeneUtils.mutate(this.gene);
  }

  /**
   * 获取蚂蚁信息（用于显示）
   * @returns {Object}
   */
  getInfo() {
    return {
      type: '蚂蚁',
      energy: Math.round(this.energy),
      hasFood: this.hasFood,
      generation: this.generation,
      gene: {
        speed: this.gene.speed.toFixed(2),
        perception: this.gene.perception.toFixed(2),
        size: this.gene.size.toFixed(2)
      }
    };
  }
}


// ==================== 蚁巢类 ====================
// Requirement 2.3: WHEN 放置蚂蚁时 THEN 系统 SHALL 创建蚁巢作为蚂蚁的基地

/**
 * 蚁巢类 - 蚂蚁的基地
 */
class AntNest {
  /**
   * 创建蚁巢
   * @param {number} x - x坐标
   * @param {number} y - y坐标
   */
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.foodStored = 0;      // 储存的食物
    this.size = 15;           // 蚁巢大小
    this.color = '#654321';   // 蚁巢颜色
    this.maxAnts = 50;        // 最大蚂蚁数量
    this.spawnCooldown = 0;   // 生成冷却
    this.spawnInterval = 60;  // 生成间隔（帧）
    this.antCount = 0;        // 当前蚁巢内的蚂蚁数量
  }

  /**
   * 更新蚁巢状态
   * @param {Array} ants - 属于此蚁巢的蚂蚁列表
   * @param {PheromoneGrid} pheromoneGrid - 信息素网格（可选）
   * @returns {Ant|null} 新生成的蚂蚁
   */
  update(ants, pheromoneGrid = null) {
    // 更新蚁巢内蚂蚁数量（只统计在蚁巢内部"隐藏"的蚂蚁）
    this.antCount = ants.filter(ant => ant.isInsideNest && ant.nestX === this.x && ant.nestY === this.y).length;
    
    // 更新冷却
    if (this.spawnCooldown > 0) {
      this.spawnCooldown--;
    }
    
    // 蚁巢不释放信息素，避免干扰蚂蚁寻找食物的路径
    // if (pheromoneGrid) {
    //   pheromoneGrid.deposit(this.x, this.y, CONFIG.PHEROMONE_DEPOSIT * 0.5);
    // }
    
    // 如果有足够食物且蚂蚁数量未满，生成新蚂蚁
    if (this.canSpawnAnt(ants)) {
      return this.spawnAnt();
    }
    
    return null;
  }

  /**
   * 检查是否可以生成新蚂蚁
   * @param {Array} ants - 属于此蚁巢的蚂蚁列表
   * @returns {boolean}
   */
  canSpawnAnt(ants) {
    const nestAnts = ants.filter(ant => 
      ant.nestX === this.x && ant.nestY === this.y && ant.isAlive
    );
    
    return this.foodStored >= 2 && 
           nestAnts.length < this.maxAnts && 
           this.spawnCooldown === 0;
  }

  /**
   * 从蚁巢生成新蚂蚁
   * @returns {Ant} 新生成的蚂蚁
   */
  spawnAnt() {
    // 消耗食物
    this.foodStored -= 2;
    
    // 重置冷却
    this.spawnCooldown = this.spawnInterval;
    
    // 在蚁巢周围随机位置生成
    const angle = Math.random() * Math.PI * 2;
    const distance = this.size + 5;
    const spawnX = this.x + Math.cos(angle) * distance;
    const spawnY = this.y + Math.sin(angle) * distance;
    
    return new Ant(spawnX, spawnY, this.x, this.y);
  }

  /**
   * 存储食物（蚂蚁带回食物时调用）
   * @param {number} amount - 食物数量
   */
  storeFood(amount = 1) {
    this.foodStored += amount;
  }

  /**
   * 绘制蚁巢
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  draw(ctx) {
    ctx.save();
    
    // 绘制蚁巢主体（土堆形状）
    ctx.fillStyle = this.color;
    
    // 底部椭圆
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 5, this.size * 1.2, this.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 中间圆形
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    
    // 顶部小圆
    ctx.beginPath();
    ctx.arc(this.x, this.y - this.size * 0.5, this.size * 0.6, 0, Math.PI * 2);
    ctx.fill();
    
    // 入口（黑色小洞）
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + 2, this.size * 0.4, this.size * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 显示食物存储量和蚂蚁数量
    ctx.fillStyle = '#fff';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`🍖${this.foodStored}`, this.x, this.y - this.size - 15);
    ctx.fillText(`🐜${this.antCount}`, this.x, this.y - this.size - 5);
    
    ctx.restore();
  }

  /**
   * 获取蚁巢信息
   * @returns {Object}
   */
  getInfo() {
    return {
      type: '蚁巢',
      foodStored: this.foodStored,
      position: { x: Math.round(this.x), y: Math.round(this.y) }
    };
  }
}
