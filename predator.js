// ==================== 捕食者类 ====================
// 实现食蚁兽和蛇的行为
// Requirements: 2.1, 5.1, 5.2

/**
 * 食蚁兽类 - 捕食蚂蚁
 * Requirement 5.1: WHEN 食蚁兽饥饿时 THEN 食蚁兽 SHALL 寻找并追捕蚂蚁
 */
class Anteater {
  /**
   * 创建食蚁兽
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, gene = null) {
    this.x = x;
    this.y = y;
    this.type = 'anteater';
    
    // 速度向量（随机初始方向）
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
    
    // 基因系统
    this.gene = gene || { ...SPECIES.anteater.baseGene };
    
    // 能量
    this.energy = CONFIG.INITIAL_ENERGY * 1.5; // 捕食者初始能量更高
    
    // 状态
    this.isAlive = true;
    this.generation = 0;
    this.reproductionCooldown = 0; // 繁殖冷却
    this.pregnancyTimer = 0;       // 怀孕计时器
    
    // 外观
    this.size = SPECIES.anteater.size * this.gene.size / 8;
    this.color = SPECIES.anteater.color;
    
    // 行为参数
    this.wanderAngle = 0;
    this.huntCooldown = 0; // 捕猎冷却

    // 体能管理系统
    this.energyHistory = []; // 记录最近几秒的能量值
    this.historyTimer = 0;   // 采样计时器
    this.energyDropRate = 0; // 当前能量消耗速率
    this.fatigueFactor = 1.0; // 疲劳系数 (0.5 - 1.0)，影响移动速度
  }

  /**
   * 更新食蚁兽状态
   * @param {World} world - 世界实例
   * @param {Array} ants - 蚂蚁列表
   */
  update(world, ants = []) {
    if (!this.isAlive) return;
    
    // 更新捕猎冷却
    if (this.huntCooldown > 0) {
      this.huntCooldown--;
    }
    
    // 更新繁殖冷却
    if (this.reproductionCooldown > 0) {
      this.reproductionCooldown--;
    }
    
    // 更新怀孕计时器
    if (this.pregnancyTimer > 0) {
      this.pregnancyTimer--;
    }
    
    // 寻找并追捕蚂蚁（仅在非消化期）
    let target = null;
    this.isHunting = false; // 重置追捕状态
    
    if (this.huntCooldown === 0) {
      target = this.findTarget(ants);
    }
    
    if (target) {
      this.isHunting = true; // 标记为正在追捕
      this.hunt(target);
    } else {
      // 没有目标或消化中时随机漫游
      this.wander();
    }
    
    // 移动
    this.move(world);
    
    // 检查是否捕获猎物
    // 注意：hunt() 方法内部现在也会触发 catchPrey，这里作为双重保险
    // 检查范围捕捉（比如正好撞上不是目标的蚂蚁）
    this.checkCatch(ants);
    
    // 更新体能管理系统
    this.updateStamina();

    // 消耗能量
    this.consumeEnergy();
  }

  /**
   * 更新体能（能量消耗速率监测）
   * 如果能量消耗过快，产生疲劳，降低移动速度
   */
  updateStamina() {
    this.historyTimer++;
    
    // 每 60 帧 (约1秒) 采样一次能量
    if (this.historyTimer >= 60) {
      this.historyTimer = 0;
      
      // 记录当前能量
      this.energyHistory.push(this.energy);
      if (this.energyHistory.length > 5) {
        this.energyHistory.shift(); // 只保留最近5秒的数据
      }
      
      // 如果有足够历史数据，计算消耗率
      if (this.energyHistory.length >= 2) {
        // 计算最近一段时间的平均能量变化
        // 注意：如果是负数说明在消耗，正数说明在进食
        const oldestEnergy = this.energyHistory[0];
        const currentEnergy = this.energy;
        const totalChange = oldestEnergy - currentEnergy;
        
        // 计算每秒平均消耗 (正数表示消耗)
        this.energyDropRate = totalChange / (this.energyHistory.length - 1);
        
        // 设定消耗阈值（根据CONFIG和基因大致估算）
        // 正常移动消耗约为 MOVE_COST (0.03) * speed^2 * 系数
        // 假设高速奔跑时每秒消耗超过 3.0 点能量即为"剧烈运动"
        const highStressThreshold = 3.0;
        
        if (this.energyDropRate > highStressThreshold) {
          // 消耗太快！增加疲劳，降低速度上限
          // 每次检测降低 10%，最低降到 50%
          this.fatigueFactor = Math.max(0.5, this.fatigueFactor - 0.1);
        } else if (this.energyDropRate < 1.0) {
          // 消耗很低（或者在回血），慢慢恢复体力
          this.fatigueFactor = Math.min(1.0, this.fatigueFactor + 0.05);
        }
      }
    }
  }

  /**
   * 寻找目标蚂蚁
   * @param {Array} ants - 蚂蚁列表
   * @returns {Object|null} 最近的蚂蚁
   */
  findTarget(ants) {
    let nearest = null;
    let minDist = this.gene.perception;
    
    for (const ant of ants) {
      if (!ant.isAlive) continue;
      
      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = ant;
      }
    }
    
    return nearest;
  }

  /**
   * 追捕目标
   * Requirement 5.1: 食蚁兽追捕蚂蚁
   * @param {Object} target - 目标猎物
   */
  hunt(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 0) {
      // 平滑转向追捕
      const turnRate = 0.1;
      this.vx = this.vx * (1 - turnRate) + (dx / dist) * turnRate;
      this.vy = this.vy * (1 - turnRate) + (dy / dist) * turnRate;
      this.normalizeVelocity();
    }
  }

  /**
   * 随机漫游
   */
  wander() {
    // 降低随机扰动幅度，使移动更平滑
    this.wanderAngle += (Math.random() - 0.5) * 0.2;
    
    // 严格限制最大转向角，防止过度转向导致原地打转
    // 将最大累积角度限制在较小范围内
    if (this.wanderAngle > 1.0) this.wanderAngle = 1.0;
    if (this.wanderAngle < -1.0) this.wanderAngle = -1.0;
    
    // 给 wanderAngle 一个"回归中心"的趋势
    // 这会让它倾向于走直线，而不是一直偏向一边
    this.wanderAngle *= 0.98;

    const currentAngle = Math.atan2(this.vy, this.vx);
    // 降低每帧实际应用的角度变化量
    const newAngle = currentAngle + this.wanderAngle * 0.05;
    
    // 如果长时间没有捕猎（huntCooldown == 0 说明处于搜索状态），
    // 且走得太久（用简单的随机概率模拟时间感），强制大转向
    if (Math.random() < 0.005) {
      // 0.5% 的概率向左或向右大幅度转弯 (约90度)
      // 模拟"这里没吃的，换个方向找找"
      this.wanderAngle += (Math.random() > 0.5 ? 1 : -1) * 2.0;
    }
    
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  /**
   * 移动食蚁兽
   * @param {World} world - 世界实例
   */
  move(world) {
    // 速度计算：
    // 如果正在追猎 (isHunting)，肾上腺素爆发，忽略疲劳，保持全速
    // 如果在闲逛，才受疲劳系数 (fatigueFactor) 影响而减速
    let currentSpeed = this.gene.speed;
    
    if (!this.isHunting) {
      currentSpeed *= this.fatigueFactor;
    }
    
    this.x += this.vx * currentSpeed;
    this.y += this.vy * currentSpeed;
    
    // 移除边界反弹，允许食蚁兽自由移动
  }

  /**
   * 检查是否捕获猎物
   * @param {Array} ants - 蚂蚁列表
   */
  checkCatch(ants) {
    if (this.huntCooldown > 0) return;
    
    const catchRadius = this.size + 5;
    
    for (const ant of ants) {
      if (!ant.isAlive) continue;
      
      const dx = ant.x - this.x;
      const dy = ant.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < catchRadius) {
        // 使用通用的捕食逻辑
        this.catchPrey(ant);
        return;
      }
    }
  }

  /**
   * 消耗能量
   */
  consumeEnergy() {
    // 基础消耗 + 速度加成 + 体型加成（大型动物消耗更高）
    const speedCost = (this.gene.speed * this.gene.speed) * 0.005;
    const sizeCost = this.gene.size * 0.02;
    
    this.energy -= (CONFIG.MOVE_COST * 2) + speedCost + sizeCost;
    
    // 能量耗尽死亡逻辑移交 main.js
  }

  /**
   * 食蚁兽死亡
   * Requirement 6.3: WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
   */
  die() {
    this.isAlive = false;
  }

  /**
   * 归一化速度向量
   */
  normalizeVelocity() {
    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > 0) {
      this.vx /= mag;
      this.vy /= mag;
    }
  }

  /**
   * 绘制食蚁兽
   * Requirement 2.1: 显示食蚁兽
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    // 计算朝向角度
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    
    // 绘制食蚁兽身体
    ctx.fillStyle = this.color;
    
    // 身体（椭圆形）
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头部（较小的椭圆）
    ctx.beginPath();
    ctx.ellipse(this.size * 1.3, 0, this.size * 0.5, this.size * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 长鼻子
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.moveTo(this.size * 1.6, -this.size * 0.1);
    ctx.lineTo(this.size * 2.5, 0);
    ctx.lineTo(this.size * 1.6, this.size * 0.1);
    ctx.closePath();
    ctx.fill();
    
    // 尾巴
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(-this.size * 1.5, 0, this.size * 0.8, this.size * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 眼睛
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(this.size * 1.4, -this.size * 0.15, this.size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // 腿（简化为4条线）
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size * 0.15;
    ctx.beginPath();
    // 前腿
    ctx.moveTo(this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(this.size * 0.5, -this.size * 1);
    ctx.moveTo(this.size * 0.5, this.size * 0.5);
    ctx.lineTo(this.size * 0.5, this.size * 1);
    // 后腿
    ctx.moveTo(-this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.5, -this.size * 1);
    ctx.moveTo(-this.size * 0.5, this.size * 0.5);
    ctx.lineTo(-this.size * 0.5, this.size * 1);
    ctx.stroke();
    
    ctx.restore();
  }

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
   * 繁殖（怀孕期结束后调用）
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @returns {Anteater|null} 新生的食蚁兽
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
    
    const child = new Anteater(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
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
   * 获取食蚁兽信息
   * @returns {Object}
   */
  getInfo() {
    return {
      type: '食蚁兽',
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



/**
 * 蛇类 - 捕食鸟类和蚂蚁
 * Requirement 5.2: WHEN 蛇饥饿时 THEN 蛇 SHALL 寻找并追捕鸟类或蚂蚁
 */
class Snake {
  /**
   * 创建蛇
   * @param {number} x - 初始x坐标
   * @param {number} y - 初始y坐标
   * @param {Object} gene - 基因（可选）
   */
  constructor(x, y, gene = null) {
    this.x = x;
    this.y = y;
    this.type = 'snake';
    
    // 速度向量（随机初始方向）
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle);
    this.vy = Math.sin(angle);
    
    // 基因系统
    this.gene = gene || { ...SPECIES.snake.baseGene };
    
    // 能量
    this.energy = CONFIG.INITIAL_ENERGY * 1.5;
    
    // 状态
    this.isAlive = true;
    this.generation = 0;
    this.reproductionCooldown = 0; // 繁殖冷却
    this.pregnancyTimer = 0;       // 怀孕计时器
    
    // 外观
    this.size = SPECIES.snake.size * this.gene.size / 5;
    this.color = SPECIES.snake.color;
    
    // 行为参数
    this.wanderAngle = 0;
    this.huntCooldown = 0;
    
    // 蛇身体段（用于绘制蛇形）
    this.bodySegments = [];
    this.maxSegments = 24; // 增加段数，更平滑
    this.segmentSpacing = this.size * 0.4; // 段间距
    
    // 初始化身体位置
    for (let i = 0; i < this.maxSegments; i++) {
      // 初始时呈直线排列
      this.bodySegments.push({ 
        x: this.x - i * this.segmentSpacing * this.vx, 
        y: this.y - i * this.segmentSpacing * this.vy 
      });
    }

    // 体能管理系统
    this.energyHistory = []; 
    this.historyTimer = 0;
    this.energyDropRate = 0;
    
    // 伏击系统状态机
    this.state = 'wander'; // 初始状态: 游荡
    // 可用状态: 
    // 'wander'  - 正常移动寻找伏击点
    // 'ambush'  - 静止不动，伪装，等待猎物
    // 'strike'  - 爆发突袭，极高速度
    // 'recover' - 攻击后的疲劳期，极慢速度
    
    this.stateTimer = 0;   // 状态计时器
    this.strikeTarget = null; // 突袭锁定的目标
  }

  /**
   * 更新蛇状态
   * @param {World} world - 世界实例
   * @param {Array} birds - 鸟类列表
   * @param {Array} ants - 蚂蚁列表
   */
  update(world, birds = [], ants = []) {
    if (!this.isAlive) return;
    
    // 更新繁殖冷却
    if (this.reproductionCooldown > 0) this.reproductionCooldown--;
    if (this.pregnancyTimer > 0) this.pregnancyTimer--;
    
    // 状态机逻辑
    this.updateState(birds);
    
    // 移动 (基于当前状态的速度)
    this.move(world);
    
    // 更新身体段位置
    this.updateBodySegments();
    
    // 检查是否捕获猎物
    this.checkCatch(birds, ants);
    
    // 消耗能量
    this.consumeEnergy();
  }

  /**
   * 状态机更新逻辑
   * @param {Array} birds - 猎物列表
   */
  updateState(birds) {
    this.stateTimer--;

    // 1. 游荡状态 (Wander)
    if (this.state === 'wander') {
      // 随机漫游
      this.wander();
      
      // 游荡一段时间后，找个地方伏击
      if (this.stateTimer <= 0) {
        // 切换到停止状态，缓慢减速
        this.state = 'stopping';
        this.stateTimer = 60; // 1秒内停下
      }
    }
    
    // 1.5 停止状态 (Stopping) - 缓慢减速过渡到伏击
    else if (this.state === 'stopping') {
      // 不调用 wander()，保持直线滑行
      // 减速逻辑在 move() 中处理
      
      if (this.stateTimer <= 0) {
        // 完全停下，进入伏击
        this.state = 'ambush';
        this.stateTimer = 200 + Math.random() * 300; // 伏击 3-8 秒
        this.vx = 0;
        this.vy = 0;
      }
    }
    
    // 2. 伏击状态 (Ambush)
    else if (this.state === 'ambush') {
      // 静止不动，观察周围
      // 检测是否有鸟进入"致死打击范围"
      const strikeRange = 150; // 突袭发动距离
      const target = this.findTargetInRange(birds, strikeRange);
      
      if (target) {
        // 发现猎物，发动突袭！
        this.state = 'strike';
        this.stateTimer = 90; // 爆发持续 1.5 秒
        this.strikeTarget = target;
        // 播放突袭音效或视觉效果可以在这里触发
      } else if (this.stateTimer <= 0) {
        // 等太久没猎物，换个地方
        this.state = 'wander';
        this.stateTimer = 100 + Math.random() * 200;
        // 重新给个速度
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle);
        this.vy = Math.sin(angle);
      }
    }
    
    // 3. 突袭状态 (Strike)
    else if (this.state === 'strike') {
      if (this.strikeTarget && this.strikeTarget.isAlive) {
        this.hunt(this.strikeTarget);
      } else {
        // 目标丢失或死亡，提前结束
        this.state = 'recover';
        this.stateTimer = 60;
      }
      
      if (this.stateTimer <= 0) {
        // 爆发结束，进入疲劳期
        this.state = 'recover';
        this.stateTimer = 120; // 休息 2 秒
      }
    }
    
    // 4. 恢复状态 (Recover)
    else if (this.state === 'recover') {
      // 缓慢移动或喘息
      if (this.stateTimer <= 0) {
        this.state = 'wander';
        this.stateTimer = 100;
      }
    }
  }

  /**
   * 在指定范围内寻找最近的目标
   */
  findTargetInRange(birds, range) {
    let nearest = null;
    let minDist = range;
    
    for (const bird of birds) {
      if (!bird.isAlive) continue;
      
      const dx = bird.x - this.x;
      const dy = bird.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = bird;
      }
    }
    return nearest;
  }

  // 旧的 findTarget 不再被 update 直接调用，保留兼容性或移除
  findTarget(birds, ants) { return this.findTargetInRange(birds, this.gene.perception); }
  
  // 旧的 updateStamina 移除，因为使用了新的状态机疲劳机制
  updateStamina() {}

  /**
   * 寻找目标（只寻找鸟类）
   * @param {Array} birds - 鸟类列表
   * @param {Array} ants - 蚂蚁列表（不使用）
   * @returns {Object|null} 最近的猎物
   */
  findTarget(birds, ants) {
    let nearest = null;
    let minDist = this.gene.perception;
    
    // 只寻找鸟类
    for (const bird of birds) {
      if (!bird.isAlive) continue;
      
      const dx = bird.x - this.x;
      const dy = bird.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = bird;
      }
    }
    
    return nearest;
  }

  /**
   * 追捕目标
   * Requirement 5.2: 蛇追捕鸟类或蚂蚁
   * @param {Object} target - 目标猎物
   */
  hunt(target) {
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // 如果非常近（小于一帧的移动距离），直接判定为移动到位，防止过冲打转
    const currentSpeed = this.state === 'strike' ? this.gene.speed * 3.5 : this.gene.speed;
    
    if (dist < currentSpeed) {
      this.x = target.x;
      this.y = target.y;
      // 距离足够近，直接触发捕食检查，无需等待 checkCatch
      // 这里的距离肯定小于 catchRadius
      this.catchPrey(target);
      return;
    }
    
    if (dist > 0) {
      // 突袭时转向极快
      const turnRate = this.state === 'strike' ? 0.3 : 0.08;
      this.vx = this.vx * (1 - turnRate) + (dx / dist) * turnRate;
      this.vy = this.vy * (1 - turnRate) + (dy / dist) * turnRate;
      this.normalizeVelocity();
    }
  }

  /**
   * 捕食猎物逻辑（提取出来复用）
   */
  catchPrey(prey) {
    if (!prey.isAlive) return;
    
    prey.die();
    
    // 根据猎物类型增加能量
    if (prey.type === 'ant') {
      this.energy += CONFIG.FOOD_ENERGY * 0.3;
    } else if (prey.type === 'bird') {
      this.energy += CONFIG.FOOD_ENERGY * 0.5;
    }
    
    // 捕食后的冷却逻辑
    if (this.energy > CONFIG.INITIAL_ENERGY * 1.5) {
      this.huntCooldown = 120; // 吃饱了
    } else {
      this.huntCooldown = 0;
    }
    
    // 捕食成功后，如果是蛇，退出突袭状态
    if (this.type === 'snake') {
       this.state = 'recover';
       this.stateTimer = 120;
    }
  }

  /**
   * 随机漫游
   */
  wander() {
    // 伏击状态不漫游
    if (this.state === 'ambush') return;
    
    // S型移动：叠加正弦波
    const time = Date.now() * 0.005;
    const wave = Math.sin(time) * 0.2;
    
    // 增加随机性
    this.wanderAngle += (Math.random() - 0.5) * 0.2;
    
    // 限制 wanderAngle
    if (this.wanderAngle > 1.0) this.wanderAngle = 1.0;
    if (this.wanderAngle < -1.0) this.wanderAngle = -1.0;
    
    // 基础方向 + 波动
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + this.wanderAngle * 0.05 + wave * 0.1;
    
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  /**
   * 移动蛇
   * @param {World} world - 世界实例
   */
  move(world) {
    // 速度计算基于状态
    let currentSpeed = 0;
    
    switch (this.state) {
      case 'ambush':
        currentSpeed = 0; // 伏击静止
        break;
      
      case 'stopping':
        // 缓慢减速：利用 stateTimer (60 -> 0) 进行插值
        // 速度从 "游荡速度" 降到 0
        const normalSpeed = this.gene.speed * 0.4;
        const progress = this.stateTimer / 60;
        // 使用缓动函数 easeOut 让减速更自然
        currentSpeed = normalSpeed * (progress * progress);
        break;
        
      case 'strike':
        // 爆发速度：基础速度 x 3.5 (比鸟快很多)
        currentSpeed = this.gene.speed * 3.5;
        break;
        
      case 'recover':
        // 恢复期：龟速
        currentSpeed = this.gene.speed * 0.3;
        break;
        
      case 'wander':
      default:
        // 正常巡逻速度 - 降低速度以显得更自然
        currentSpeed = this.gene.speed * 0.4;
        break;
    }

    this.x += this.vx * currentSpeed;
    this.y += this.vy * currentSpeed;
    
    // 移除边界反弹，允许蛇自由移动
  }

  /**
   * 更新身体段位置（蛇形移动效果 - 距离约束）
   */
  updateBodySegments() {
    // 1. 头部位置直接更新为当前坐标
    this.bodySegments[0].x = this.x;
    this.bodySegments[0].y = this.y;
    
    // 2. 后续段跟随前一段，保持固定距离 (Inverse Kinematics 简化版)
    for (let i = 1; i < this.bodySegments.length; i++) {
      const prev = this.bodySegments[i - 1];
      const curr = this.bodySegments[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // 如果距离不等于设定间距，拉动当前段
      if (dist > 0) {
        // 计算目标位置：前一段位置 + 指向当前段的向量 * 间距
        // 这样 curr 就会被"拖"向 prev，保持 segmentSpacing 的距离
        const scale = this.segmentSpacing / dist;
        curr.x = prev.x + dx * scale;
        curr.y = prev.y + dy * scale;
      } else {
        // 如果重叠了（极少情况），强行推开一点
        curr.x = prev.x - this.vx * this.segmentSpacing;
        curr.y = prev.y - this.vy * this.segmentSpacing;
      }
    }
  }

  /**
   * 检查是否捕获猎物（只捕获鸟类）
   * @param {Array} birds - 鸟类列表
   * @param {Array} ants - 蚂蚁列表（不使用）
   */
  checkCatch(birds, ants) {
    if (this.huntCooldown > 0) return;
    
    const catchRadius = this.size + 8;
    
    // 只检查是否捕获鸟类
    for (const bird of birds) {
      if (!bird.isAlive) continue;
      
      const dx = bird.x - this.x;
      const dy = bird.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < catchRadius) {
        this.catchPrey(bird);
        return;
      }
    }
  }

  /**
   * 消耗能量
   */
  consumeEnergy() {
    // 基础消耗 + 速度加成 + 体型加成
    const speedCost = (this.gene.speed * this.gene.speed) * 0.004;
    const sizeCost = this.gene.size * 0.015;
    
    this.energy -= (CONFIG.MOVE_COST * 1.5) + speedCost + sizeCost;
    
    // 能量耗尽死亡逻辑移交 main.js
  }

  /**
   * 蛇死亡
   * Requirement 6.3: WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
   */
  die() {
    this.isAlive = false;
  }

  /**
   * 归一化速度向量
   */
  normalizeVelocity() {
    const mag = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (mag > 0) {
      this.vx /= mag;
      this.vy /= mag;
    }
  }

  /**
   * 绘制蛇
   * Requirement 2.1: 显示蛇
   * @param {CanvasRenderingContext2D} ctx - Canvas上下文
   */
  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    // 伏击时不再半透明
    // if (this.state === 'ambush') {
    //   ctx.globalAlpha = 0.4;
    // }
    
    // 绘制蛇身体（多个圆形段）
    const segmentSize = this.size * 0.7; // 稍微调大一点
    
    // 从尾部到头部绘制，使头部在最上层
    for (let i = this.bodySegments.length - 1; i >= 0; i--) {
      const segment = this.bodySegments[i];
      
      // 形状计算：中间粗，尾巴尖
      // 使用正弦函数让身体中间部分饱满，尾部收细
      // i=0 (头) -> factor=1
      // i=max (尾) -> factor=0.2
      let sizeFactor;
      if (i < 4) {
        sizeFactor = 1; // 头部和颈部保持大小
      } else {
        // 尾部逐渐变细
        const tailProgress = (i - 4) / (this.bodySegments.length - 4);
        sizeFactor = 1 - tailProgress * 0.8; 
      }
      
      const currentSize = segmentSize * sizeFactor;
      
      // 身体颜色渐变
      let colorIntensity;
      
      // 突袭时身体变红/亮
      if (this.state === 'strike') {
        colorIntensity = Math.floor(100 + (i / this.bodySegments.length) * 50);
        ctx.fillStyle = `rgb(${colorIntensity + 50}, ${50}, ${50})`; 
      } else {
        // 正常的绿色渐变，模拟腹部和背部
        const baseG = 139; // ForestGreen
        const variation = Math.sin(i * 0.5) * 20; // 稍微的色调波动
        ctx.fillStyle = `rgb(${34 + variation}, ${baseG - i * 3}, ${34 + variation})`;
      }
      
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
      
      // 脊椎线/花纹
      if (i % 3 === 0 && i > 0 && i < this.bodySegments.length - 2) {
        ctx.fillStyle = `rgba(0, 50, 0, 0.4)`;
        ctx.beginPath();
        ctx.ellipse(segment.x, segment.y, currentSize * 0.8, currentSize * 0.4, Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 绘制蛇头细节
    const head = this.bodySegments[0];
    const neck = this.bodySegments[1] || {x: head.x - this.vx, y: head.y - this.vy};
    // 计算头部的朝向：基于头和颈部的相对位置，比直接用速度更稳定（特别是在静止时）
    const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
    
    ctx.translate(head.x, head.y);
    ctx.rotate(headAngle);
    
    // 头部形状 (稍尖一点的椭圆)
    ctx.fillStyle = this.state === 'strike' ? '#a33' : '#2e8b57'; // 头部颜色略不同
    ctx.beginPath();
    ctx.ellipse(segmentSize * 0.2, 0, segmentSize * 1.1, segmentSize * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = this.state === 'strike' ? '#f00' : '#ff0'; 
    ctx.beginPath();
    ctx.arc(segmentSize * 0.4, -segmentSize * 0.4, segmentSize * 0.25, 0, Math.PI * 2);
    ctx.arc(segmentSize * 0.4, segmentSize * 0.4, segmentSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // 瞳孔 (细长的蛇眼)
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(segmentSize * 0.45, -segmentSize * 0.4, segmentSize * 0.08, segmentSize * 0.2, 0, 0, Math.PI * 2);
    ctx.ellipse(segmentSize * 0.45, segmentSize * 0.4, segmentSize * 0.08, segmentSize * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 舌头
    if (this.state === 'strike' || (this.state === 'wander' && Math.random() < 0.1)) {
      ctx.strokeStyle = '#f00';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(segmentSize * 0.8, 0);
      ctx.lineTo(segmentSize * 1.5, 0);
      ctx.lineTo(segmentSize * 1.8, -segmentSize * 0.3);
      ctx.moveTo(segmentSize * 1.5, 0);
      ctx.lineTo(segmentSize * 1.8, segmentSize * 0.3);
      ctx.stroke();
    }
    
    ctx.restore();
  }

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
   * 繁殖（怀孕期结束后调用）
   * Requirement 6.2: WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
   * @returns {Snake|null} 新生的蛇
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
    
    const child = new Snake(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
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
   * 获取蛇的信息
   * @returns {Object}
   */
  getInfo() {
    return {
      type: '蛇',
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
