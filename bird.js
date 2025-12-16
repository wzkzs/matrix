// ==================== 鸟类 ====================
// 实现鸟群算法（Boids）行为
// Requirements: 2.1, 4.1, 4.2, 4.3, 4.4

/**
 * 鸟类 - 使用鸟群算法（Boids）进行群体飞行
 */
class Bird {
  /**
   * 创建鸟
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, gene = null) {
    this.x = x;
    this.y = y;
    this.type = 'bird';

    // 速度向量（随机初始方向）
    const angle = Math.random() * Math.PI * 2;
    const speed = SPECIES.bird.baseGene.speed;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;

    // 基因系统
    this.gene = gene || { ...SPECIES.bird.baseGene };

    // 能量
    this.energy = CONFIG.INITIAL_ENERGY;

    // 状态
    this.isAlive = true;
    this.generation = 0;
    this.reproductionCooldown = 0; // 繁殖冷却
    this.pregnancyTimer = 0;       // 怀孕计时器

    // 外观
    this.size = SPECIES.bird.size * this.gene.size / 3;
    this.color = SPECIES.bird.color;

    // Boids 参数
    this.maxSpeed = this.gene.speed;
    this.maxForce = 0.1;  // 最大转向力

    // Boids 权重
    this.separationWeight = 1.5;
    this.alignmentWeight = 1.0;
    this.cohesionWeight = 1.0;

    // 感知范围
    this.perceptionRadius = this.gene.perception;
    this.separationRadius = this.gene.perception * 0.4;
    
    // 状态机
    this.state = 'flying'; // 'flying' | 'perching' | 'taking_off'
    this.stateTimer = 0;   // 用于控制状态持续时间
    this.fatigue = 0;      // 疲劳值 0-100
  }


  /**
   * 更新鸟的状态
   * @param {World} world - 世界实例
   * @param {Array} birds - 所有鸟的列表
   * @param {Array} ants - 所有蚂蚁的列表
   * @param {Array} predators - 捕食者列表
   */
  update(world, birds, ants = [], predators = []) {
    if (!this.isAlive) return;

    // 更新状态机
    this.updateState(world, predators);

    // 更新繁殖冷却
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    
    // 更新怀孕计时器
    if (this.pregnancyTimer > 0) {
      this.pregnancyTimer--;
    }

    // 根据状态执行行为
    if (this.state === 'perching') {
      // 栖息状态：回血，降疲劳，几乎不消耗能量
      this.fatigue = Math.max(0, this.fatigue - 0.5);
      this.energy = Math.min(CONFIG.INITIAL_ENERGY * 1.5, this.energy + 0.1);
      
      // 栖息时依然检查天敌，如果有威胁立即起飞
      const nearbyPredator = this.findNearbyPredator(predators);
      if (nearbyPredator) {
        this.takeOff();
      }
      
      // 只有在极度饥饿时才会在栖息时吃身边的东西（比如正好落在蚂蚁堆里）
      this.checkFoodPickup(world, ants);
      
    } else {
      // 飞行状态 (flying 或 taking_off)
      this.updateFlight(world, birds, ants, predators);
      this.fatigue = Math.min(100, this.fatigue + 0.1); // 飞行增加疲劳
      this.consumeEnergy();
      this.move();
      this.checkFoodPickup(world, ants);
    }
  }

  /**
   * 状态机逻辑
   */
  updateState(world, predators) {
    if (this.stateTimer > 0) this.stateTimer--;

    // 1. 飞行中 -> 想要栖息
    if (this.state === 'flying') {
      // 疲劳越高，越想栖息
      // 如果没有天敌在附近，尝试栖息
      if (this.fatigue > 50 && Math.random() < (this.fatigue / 5000)) {
        const nearbyPredator = this.findNearbyPredator(predators);
        if (!nearbyPredator) {
           this.land();
        }
      }
    }
    // 2. 栖息中 -> 准备起飞
    else if (this.state === 'perching') {
      // 疲劳恢复得差不多了，或者饿了
      if ((this.fatigue < 10 && Math.random() < 0.01) || (this.energy < 50 && Math.random() < 0.05)) {
        this.takeOff();
      }
      // 强制起飞时间限制 (防止一直不动)
      if (this.stateTimer <= 0) {
        this.takeOff();
      }
    }
    // 3. 起飞中 -> 进入正常飞行
    else if (this.state === 'taking_off') {
       if (this.stateTimer <= 0) {
         this.state = 'flying';
       }
    }
  }

  /**
   * 降落栖息
   */
  land() {
    this.state = 'perching';
    this.stateTimer = 100 + Math.random() * 200; // 栖息 2-5 秒
    this.vx = 0;
    this.vy = 0;
  }

  /**
   * 起飞
   */
  takeOff() {
    this.state = 'taking_off';
    this.stateTimer = 20; // 起飞加速过程
    // 随机起飞方向
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.maxSpeed * 0.5;
    this.vy = Math.sin(angle) * this.maxSpeed * 0.5;
  }

  /**
   * 飞行物理计算 (原 update 逻辑)
   */
  updateFlight(world, birds, ants, predators) {
    // 计算加速度
    let ax = 0;
    let ay = 0;

    // 检查是否需要逃跑
    const nearbyPredator = this.findNearbyPredator(predators);
    if (nearbyPredator) {
      // 逃跑优先级最高
      const flee = this.flee(nearbyPredator);
      ax += flee.x * 3;
      ay += flee.y * 3;
    } else {
      // Boids 三规则
      const flockForce = this.flock(birds);
      ax += flockForce.x;
      ay += flockForce.y;

      // 寻找植物
      const seekForce = this.seekFood(world, ants);
      ax += seekForce.x * 0.8;
      ay += seekForce.y * 0.8;
    }

    // 应用加速度
    this.vx += ax;
    this.vy += ay;

    // 限制速度
    this.limitSpeed();
  }

  /**
   * 移动鸟
   */
  move() {
    // 只有飞行时才更新位置
    if (this.state !== 'perching') {
      this.x += this.vx;
      this.y += this.vy;
    }
  }

  /**
   * 限制速度
   */
  limitSpeed() {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }
    // 保持最小速度
    const minSpeed = this.maxSpeed * 0.3;
    if (speed < minSpeed && speed > 0) {
      this.vx = (this.vx / speed) * minSpeed;
      this.vy = (this.vy / speed) * minSpeed;
    }
  }

  /**
   * 消耗能量
   */
  consumeEnergy() {
    // 基础消耗 + 速度加成（飞行消耗较高）+ 体型加成
    const speedCost = (this.gene.speed * this.gene.speed) * 0.002;
    const sizeCost = this.gene.size * 0.01;

    this.energy -= CONFIG.MOVE_COST + speedCost + sizeCost;
    // 能量耗尽死亡逻辑移交 main.js
  }

  /**
   * 鸟死亡
   * Requirement 6.3: WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
   */
  die() {
    this.isAlive = false;
  }

  /**
   * 绘制鸟（三角形表示方向）
   * Requirement 2.1: 显示鸟
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  draw(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // 计算朝向角度 (如果静止，保持之前的角度或设为0)
    let angle = 0;
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
       angle = Math.atan2(this.vy, this.vx);
    }
    ctx.rotate(angle);

    // 绘制鸟身体（三角形）
    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    if (this.state === 'perching') {
      // 栖息姿态：更圆润，翅膀收起
      ctx.ellipse(0, 0, this.size * 1.0, this.size * 0.6, 0, 0, Math.PI * 2);
    } else {
      // 飞行姿态：展开的三角形
      ctx.moveTo(this.size * 1.5, 0);           // 头部（尖端）
      ctx.lineTo(-this.size, -this.size * 0.8); // 左翼
      ctx.lineTo(-this.size * 0.3, 0);          // 尾部凹陷
      ctx.lineTo(-this.size, this.size * 0.8);  // 右翼
    }
    
    ctx.closePath();
    ctx.fill();

    // 绘制翅膀细节
    ctx.strokeStyle = '#2a4a9e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    if (this.state === 'perching') {
       // 栖息翅膀纹路
       ctx.moveTo(-this.size * 0.5, -this.size * 0.3);
       ctx.lineTo(this.size * 0.5, -this.size * 0.3);
       ctx.moveTo(-this.size * 0.5, this.size * 0.3);
       ctx.lineTo(this.size * 0.5, this.size * 0.3);
    } else {
       // 飞行翅膀纹路
       ctx.moveTo(0, 0);
       ctx.lineTo(-this.size * 0.8, -this.size * 0.6);
       ctx.moveTo(0, 0);
       ctx.lineTo(-this.size * 0.8, this.size * 0.6);
    }
    ctx.stroke();

    ctx.restore();
  }


  // ==================== Boids 三规则 ====================
  // Requirement 4.1: WHEN 鸟类移动时 THEN 鸟类 SHALL 遵循三条规则：分离、对齐、聚合

  /**
   * 分离规则 - 避免与邻近鸟碰撞
   * @param {Array} neighbors - 邻近的鸟
   * @returns {Object} 分离力向量 {x, y}
   */
  separation(neighbors) {
    let steerX = 0;
    let steerY = 0;
    let count = 0;

    for (const other of neighbors) {
      const dx = this.x - other.x;
      const dy = this.y - other.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < this.separationRadius) {
        // 距离越近，排斥力越大
        steerX += dx / (dist * dist);
        steerY += dy / (dist * dist);
        count++;
      }
    }

    if (count > 0) {
      steerX /= count;
      steerY /= count;

      // 归一化并缩放到最大力
      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > 0) {
        steerX = (steerX / mag) * this.maxForce;
        steerY = (steerY / mag) * this.maxForce;
      }
    }

    return { x: steerX, y: steerY };
  }

  /**
   * 对齐规则 - 与邻近鸟保持相同方向
   * @param {Array} neighbors - 邻近的鸟
   * @returns {Object} 对齐力向量 {x, y}
   */
  alignment(neighbors) {
    let avgVx = 0;
    let avgVy = 0;
    let count = 0;

    for (const other of neighbors) {
      avgVx += other.vx;
      avgVy += other.vy;
      count++;
    }

    if (count > 0) {
      avgVx /= count;
      avgVy /= count;

      // 计算转向力（期望速度 - 当前速度）
      let steerX = avgVx - this.vx;
      let steerY = avgVy - this.vy;

      // 限制力的大小
      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > this.maxForce) {
        steerX = (steerX / mag) * this.maxForce;
        steerY = (steerY / mag) * this.maxForce;
      }

      return { x: steerX, y: steerY };
    }

    return { x: 0, y: 0 };
  }

  /**
   * 聚合规则 - 朝向邻近鸟群的中心移动
   * @param {Array} neighbors - 邻近的鸟
   * @returns {Object} 聚合力向量 {x, y}
   */
  cohesion(neighbors) {
    let centerX = 0;
    let centerY = 0;
    let count = 0;

    for (const other of neighbors) {
      centerX += other.x;
      centerY += other.y;
      count++;
    }

    if (count > 0) {
      centerX /= count;
      centerY /= count;

      // 计算朝向中心的方向
      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // 期望速度
        let desiredVx = (dx / dist) * this.maxSpeed;
        let desiredVy = (dy / dist) * this.maxSpeed;

        // 转向力
        let steerX = desiredVx - this.vx;
        let steerY = desiredVy - this.vy;

        // 限制力的大小
        const mag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (mag > this.maxForce) {
          steerX = (steerX / mag) * this.maxForce;
          steerY = (steerY / mag) * this.maxForce;
        }

        return { x: steerX, y: steerY };
      }
    }

    return { x: 0, y: 0 };
  }

  /**
   * 组合三规则 - 计算总的群体行为力
   * @param {Array} birds - 所有鸟的列表
   * @returns {Object} 总力向量 {x, y}
   */
  flock(birds) {
    // 获取感知范围内的邻居
    const neighbors = this.getNeighbors(birds);

    if (neighbors.length === 0) {
      return { x: 0, y: 0 };
    }

    // 计算三个规则的力
    const sep = this.separation(neighbors);
    const ali = this.alignment(neighbors);
    const coh = this.cohesion(neighbors);

    // 加权组合
    return {
      x: sep.x * this.separationWeight + ali.x * this.alignmentWeight + coh.x * this.cohesionWeight,
      y: sep.y * this.separationWeight + ali.y * this.alignmentWeight + coh.y * this.cohesionWeight
    };
  }

  /**
   * 获取感知范围内的邻居
   * @param {Array} birds - 所有鸟的列表
   * @returns {Array} 邻近的鸟
   */
  getNeighbors(birds) {
    const neighbors = [];

    for (const other of birds) {
      if (other === this || !other.isAlive) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.perceptionRadius) {
        neighbors.push(other);
      }
    }

    return neighbors;
  }


  // ==================== 觅食和逃跑 ====================

  /**
   * 寻找食物（种子和蚂蚁）
   * Requirement 4.2: WHEN 鸟类饥饿时 THEN 鸟类 SHALL 寻找食物（种子或蚂蚁）
   * @param {World} world - 世界实例
   * @param {Array} ants - 蚂蚁列表
   * @returns {Object} 觅食力向量 {x, y}
   */
  seekFood(world, ants) {
    // 能量较低时更积极寻找食物
    const hungerFactor = this.energy < 50 ? 2 : 1;

    let targetX = null;
    let targetY = null;
    let minDist = this.perceptionRadius;

    // 寻找最近的植物（种子）
    const nearestPlant = world.getNearestPlant(this.x, this.y, this.perceptionRadius);
    if (nearestPlant) {
      const dx = nearestPlant.x - this.x;
      const dy = nearestPlant.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < minDist) {
        minDist = dist;
        targetX = nearestPlant.x;
        targetY = nearestPlant.y;
      }
    }

    // 寻找最近的蚂蚁（仅在极度饥饿时才把蚂蚁当食物，现实中蚂蚁酸涩且能量低）
    if (this.energy < CONFIG.INITIAL_ENERGY * 0.3) {
      for (const ant of ants) {
        if (!ant.isAlive) continue;

        const dx = ant.x - this.x;
        const dy = ant.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          targetX = ant.x;
          targetY = ant.y;
        }
      }
    }

    // 如果找到目标，朝目标移动
    if (targetX !== null) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        // 期望速度
        let desiredVx = (dx / dist) * this.maxSpeed;
        let desiredVy = (dy / dist) * this.maxSpeed;

        // 转向力
        let steerX = (desiredVx - this.vx) * hungerFactor;
        let steerY = (desiredVy - this.vy) * hungerFactor;

        // 限制力的大小
        const mag = Math.sqrt(steerX * steerX + steerY * steerY);
        if (mag > this.maxForce * 2) {
          steerX = (steerX / mag) * this.maxForce * 2;
          steerY = (steerY / mag) * this.maxForce * 2;
        }

        return { x: steerX, y: steerY };
      }
    }

    return { x: 0, y: 0 };
  }

  /**
   * 检查是否吃到食物
   * @param {World} world - 世界实例
   * @param {Array} ants - 蚂蚁列表
   */
  checkFoodPickup(world, ants) {
    const eatRadius = this.size + 3;

    // 检查是否吃到植物
    const nearestPlant = world.getNearestPlant(this.x, this.y, eatRadius);
    if (nearestPlant) {
      world.removePlant(nearestPlant);
      this.energy += CONFIG.FOOD_ENERGY;
      return;
    }

    // 检查是否吃到蚂蚁
    for (const ant of ants) {
      if (!ant.isAlive) continue;

      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < eatRadius) {
        ant.die();
        this.energy += CONFIG.FOOD_ENERGY * 0.02; // 蚂蚁能量很低（2%），且口感不好，仅作为保命补充
        return;
      }
    }
  }

  /**
   * 寻找附近的捕食者
   * @param {Array} predators - 捕食者列表
   * @returns {Object|null} 最近的捕食者
   */
  findNearbyPredator(predators) {
    let nearest = null;
    let minDist = this.perceptionRadius;

    for (const predator of predators) {
      if (!predator.isAlive) continue;

      // 检查是否是鸟的天敌
      if (SPECIES.bird.predators.includes(predator.type)) {
        const dx = predator.x - this.x;
        const dy = predator.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        // 特殊处理蛇的伏击：
        // 如果是蛇且处于伏击状态，鸟很难发现它
        // 只有距离非常近（例如 perceptionRadius * 0.3）才能发现
        if (predator.type === 'snake' && predator.state === 'ambush') {
          if (dist > this.perceptionRadius * 0.3) {
            continue; // 没看见，继续找下一个
          }
        }

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
   * Requirement 4.3: WHEN 鸟类发现天敌 THEN 鸟群 SHALL 一起逃跑
   * @param {Object} predator - 捕食者
   * @returns {Object} 逃跑力向量 {x, y}
   */
  flee(predator) {
    const dx = this.x - predator.x;
    const dy = this.y - predator.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      // 逃跑方向（远离捕食者）
      let fleeX = (dx / dist) * this.maxSpeed;
      let fleeY = (dy / dist) * this.maxSpeed;

      // 转向力
      let steerX = fleeX - this.vx;
      let steerY = fleeY - this.vy;

      // 限制力的大小（逃跑时允许更大的转向力）
      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > this.maxForce * 3) {
        steerX = (steerX / mag) * this.maxForce * 3;
        steerY = (steerY / mag) * this.maxForce * 3;
      }

      return { x: steerX, y: steerY };
    }

    return { x: 0, y: 0 };
  }

  /**
   * 边界转向
   * Requirement 4.4: WHEN 鸟类接近边界 THEN 鸟类 SHALL 转向
   * @param {World} world - 世界实例
   * @returns {Object} 边界回避力向量 {x, y}
   */
  avoidBoundary(world) {
    const margin = 50;
    let steerX = 0;
    let steerY = 0;

    // 左边界
    if (this.x < margin) {
      steerX = (margin - this.x) / margin * this.maxForce;
    }
    // 右边界
    else if (this.x > world.width - margin) {
      steerX = (world.width - margin - this.x) / margin * this.maxForce;
    }

    // 上边界
    if (this.y < margin) {
      steerY = (margin - this.y) / margin * this.maxForce;
    }
    // 下边界
    else if (this.y > world.height - margin) {
      steerY = (world.height - margin - this.y) / margin * this.maxForce;
    }

    return { x: steerX, y: steerY };
  }


  // ==================== 繁殖系统 ====================

  /**
   * 检查是否可以繁殖
   * Requirement 6.1: WHEN 生物能量充足 THEN 生物 SHALL 可以繁殖
   * @returns {boolean}
   */
  canReproduce() {
    if (this.pregnancyTimer > 0) return false;
    return ReproductionUtils.canReproduce(this);
  }
  
  /**
   * 开始怀孕过程
   * @returns {boolean} 是否成功开始怀孕
   */
  startPregnancy() {
    if (!this.canReproduce()) return false;
    
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5;
    this.pregnancyTimer = ReproductionUtils.getPregnancyDuration(this.type);
    
    return true;
  }

  /**
   * 繁殖
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @returns {Bird|null} 新生的鸟
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

    const child = new Bird(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
      childGene
    );

    child.generation = this.generation + 1;
    child.energy = ReproductionUtils.getOffspringEnergy(this.type);

    // 继承父母的速度方向
    child.vx = this.vx + (Math.random() - 0.5) * 2;
    child.vy = this.vy + (Math.random() - 0.5) * 2;
    child.limitSpeed();

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
   * 获取鸟的信息（用于显示）
   * @returns {Object}
   */
  getInfo() {
    return {
      type: '鸟',
      energy: Math.round(this.energy),
      generation: this.generation,
      gene: {
        speed: this.gene.speed.toFixed(2),
        perception: this.gene.perception.toFixed(2),
        size: this.gene.size.toFixed(2)
      }
    };
  }
}
