// ==================== 捕食者类 ====================
// 实现食蚁兽和蛇的行为
// Requirements: 2.1, 5.1, 5.2

/**
 * 捕食者基类 - 食蚁兽和蛇的共同行为
 */
class Predator extends Creature {
  constructor(x, y, type, gene = null) {
    super(x, y, type, gene);
    
    // 捕食者初始能量更高
    this.energy = CONFIG.INITIAL_ENERGY * 1.5;
    
    // 捕猎冷却
    this.huntCooldown = 0;
    
    // 体能管理系统
    this.energyHistory = [];
    this.historyTimer = 0;
    this.energyDropRate = 0;
    this.fatigueFactor = 1.0;
    this.isHunting = false;
  }

  /**
   * 更新体能（能量消耗速率监测）
   */
  updateStamina() {
    this.historyTimer++;
    
    if (this.historyTimer >= 60) {
      this.historyTimer = 0;
      this.energyHistory.push(this.energy);
      
      if (this.energyHistory.length > 5) {
        this.energyHistory.shift();
      }
      
      if (this.energyHistory.length >= 2) {
        const oldestEnergy = this.energyHistory[0];
        this.energyDropRate = (oldestEnergy - this.energy) / (this.energyHistory.length - 1);
        
        const highStressThreshold = 3.0;
        
        if (this.energyDropRate > highStressThreshold) {
          this.fatigueFactor = Math.max(0.5, this.fatigueFactor - 0.1);
        } else if (this.energyDropRate < 1.0) {
          this.fatigueFactor = Math.min(1.0, this.fatigueFactor + 0.05);
        }
      }
    }
  }

  /**
   * 追捕目标
   * @param {Object} target - 目标猎物
   * @param {number} turnRate - 转向速率
   */
  hunt(target, turnRate = 0.1) {
    this.moveTowards(target.x, target.y, turnRate);
  }

  /**
   * 捕食猎物
   * @param {Object} prey - 猎物
   * @param {number} energyGain - 获得的能量比例
   */
  catchPrey(prey, energyGain = 0.4) {
    if (!prey.isAlive) return false;
    
    prey.die();
    this.energy += CONFIG.FOOD_ENERGY * energyGain;
    
    // 捕食后的冷却
    if (this.energy > CONFIG.INITIAL_ENERGY * 1.5) {
      this.huntCooldown = 120;
    } else {
      this.huntCooldown = 10;
    }
    
    return true;
  }

  /**
   * 检查是否捕获猎物
   * @param {Array} preyList - 猎物列表
   * @param {number} catchRadius - 捕获半径
   * @param {number} energyGain - 能量获取比例
   */
  checkCatch(preyList, catchRadius, energyGain = 0.4) {
    if (this.huntCooldown > 0) return false;
    
    for (const prey of preyList) {
      if (!prey.isAlive) continue;
      
      if (this.distanceTo(prey) < catchRadius) {
        this.catchPrey(prey, energyGain);
        return true;
      }
    }
    return false;
  }

  /**
   * 繁殖（怀孕期结束后调用）
   * @param {Function} ChildClass - 子类构造函数
   * @returns {Predator|null}
   */
  reproduceChild(ChildClass) {
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5;
    this.reproductionCooldown = ReproductionUtils.getReproductionCooldown(this.type);
    
    const childGene = this.mutateGene();
    const offset = ReproductionUtils.getSpawnOffset(this.type);
    
    const child = new ChildClass(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
      childGene
    );
    
    child.generation = this.generation + 1;
    child.energy = ReproductionUtils.getOffspringEnergy(this.type);
    
    return child;
  }
}


/**
 * 食蚁兽类 - 捕食蚂蚁
 */
class Anteater extends Predator {
  constructor(x, y, gene = null) {
    super(x, y, 'anteater', gene);
  }

  getSizeDivisor() {
    return 8;
  }

  update(world, ants = []) {
    if (!this.isAlive) return;
    
    if (this.huntCooldown > 0) this.huntCooldown--;
    this.updateReproductionTimers();
    
    // 寻找并追捕蚂蚁
    this.isHunting = false;
    let target = null;
    
    if (this.huntCooldown === 0) {
      target = this.findNearest(ants, this.gene.perception);
    }
    
    if (target) {
      this.isHunting = true;
      this.hunt(target);
    } else {
      this.wanderSmooth();
    }
    
    // 移动
    const speedMultiplier = this.isHunting ? 1 : this.fatigueFactor;
    this.move(speedMultiplier);
    
    // 检查捕获
    this.checkCatch(ants, this.size + 5, 0.4);
    
    // 更新体能和消耗能量
    this.updateStamina();
    this.consumeEnergy(2, 0.005, 0.02);
  }

  /**
   * 平滑漫游（食蚁兽特有）
   */
  wanderSmooth() {
    this.wanderAngle += (Math.random() - 0.5) * 0.2;
    
    if (this.wanderAngle > 1.0) this.wanderAngle = 1.0;
    if (this.wanderAngle < -1.0) this.wanderAngle = -1.0;
    
    this.wanderAngle *= 0.98;

    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + this.wanderAngle * 0.05;
    
    if (Math.random() < 0.005) {
      this.wanderAngle += (Math.random() > 0.5 ? 1 : -1) * 2.0;
    }
    
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  reproduce() {
    return this.reproduceChild(Anteater);
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const angle = Math.atan2(this.vy, this.vx);
    ctx.rotate(angle);
    
    ctx.fillStyle = this.color;
    
    // 身体
    ctx.beginPath();
    ctx.ellipse(0, 0, this.size * 1.2, this.size * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // 头部
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
    
    // 腿
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.size * 0.15;
    ctx.beginPath();
    ctx.moveTo(this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(this.size * 0.5, -this.size * 1);
    ctx.moveTo(this.size * 0.5, this.size * 0.5);
    ctx.lineTo(this.size * 0.5, this.size * 1);
    ctx.moveTo(-this.size * 0.5, -this.size * 0.5);
    ctx.lineTo(-this.size * 0.5, -this.size * 1);
    ctx.moveTo(-this.size * 0.5, this.size * 0.5);
    ctx.lineTo(-this.size * 0.5, this.size * 1);
    ctx.stroke();
    
    ctx.restore();
  }
}



/**
 * 蛇类 - 捕食鸟类（伏击型捕食者）
 */
class Snake extends Predator {
  constructor(x, y, gene = null) {
    super(x, y, 'snake', gene);
    
    // 伏击系统状态机
    this.state = 'wander'; // 'wander' | 'stopping' | 'ambush' | 'strike' | 'recover'
    this.stateTimer = 0;
    this.strikeTarget = null;
    
    // 蛇身体段
    this.bodySegments = [];
    this.maxSegments = 24;
    this.segmentSpacing = this.size * 0.4;
    
    // 初始化身体
    for (let i = 0; i < this.maxSegments; i++) {
      this.bodySegments.push({ 
        x: this.x - i * this.segmentSpacing * this.vx, 
        y: this.y - i * this.segmentSpacing * this.vy 
      });
    }
  }

  getSizeDivisor() {
    return 5;
  }

  update(world, birds = []) {
    if (!this.isAlive) return;
    
    this.updateReproductionTimers();
    this.updateState(birds);
    this.move();
    this.updateBodySegments();
    this.checkCatch(birds, this.size + 8, 0.5);
    this.consumeEnergy(1.5, 0.004, 0.015);
  }

  /**
   * 状态机更新
   */
  updateState(birds) {
    this.stateTimer--;

    switch (this.state) {
      case 'wander':
        this.wanderSnake();
        if (this.stateTimer <= 0) {
          this.state = 'stopping';
          this.stateTimer = 60;
        }
        break;
        
      case 'stopping':
        const normalSpeed = this.gene.speed * 0.4;
        const progress = this.stateTimer / 60;
        // 减速在 move() 中处理
        if (this.stateTimer <= 0) {
          this.state = 'ambush';
          this.stateTimer = 200 + Math.random() * 300;
          this.vx = 0;
          this.vy = 0;
        }
        break;
        
      case 'ambush':
        const strikeRange = 150;
        const target = this.findNearest(birds, strikeRange);
        
        if (target) {
          this.state = 'strike';
          this.stateTimer = 90;
          this.strikeTarget = target;
        } else if (this.stateTimer <= 0) {
          this.state = 'wander';
          this.stateTimer = 100 + Math.random() * 200;
          const angle = Math.random() * Math.PI * 2;
          this.vx = Math.cos(angle);
          this.vy = Math.sin(angle);
        }
        break;
        
      case 'strike':
        if (this.strikeTarget && this.strikeTarget.isAlive) {
          this.huntStrike(this.strikeTarget);
        } else {
          this.state = 'recover';
          this.stateTimer = 60;
        }
        
        if (this.stateTimer <= 0) {
          this.state = 'recover';
          this.stateTimer = 120;
        }
        break;
        
      case 'recover':
        if (this.stateTimer <= 0) {
          this.state = 'wander';
          this.stateTimer = 100;
        }
        break;
    }
  }

  /**
   * 蛇形漫游
   */
  wanderSnake() {
    if (this.state === 'ambush') return;
    
    const time = Date.now() * 0.005;
    const wave = Math.sin(time) * 0.2;
    
    this.wanderAngle += (Math.random() - 0.5) * 0.2;
    if (this.wanderAngle > 1.0) this.wanderAngle = 1.0;
    if (this.wanderAngle < -1.0) this.wanderAngle = -1.0;
    
    const currentAngle = Math.atan2(this.vy, this.vx);
    const newAngle = currentAngle + this.wanderAngle * 0.05 + wave * 0.1;
    
    this.vx = Math.cos(newAngle);
    this.vy = Math.sin(newAngle);
  }

  /**
   * 突袭追捕
   */
  huntStrike(target) {
    const dist = this.distanceTo(target);
    const currentSpeed = this.gene.speed * 3.5;
    
    if (dist < currentSpeed) {
      this.x = target.x;
      this.y = target.y;
      if (this.catchPrey(target, 0.5)) {
        this.state = 'recover';
        this.stateTimer = 120;
      }
      return;
    }
    
    this.moveTowards(target.x, target.y, 0.3);
  }

  move() {
    let currentSpeed = 0;
    
    switch (this.state) {
      case 'ambush':
        currentSpeed = 0;
        break;
      case 'stopping':
        const progress = Math.max(0, this.stateTimer) / 60;
        currentSpeed = this.gene.speed * 0.4 * (progress * progress);
        break;
      case 'strike':
        currentSpeed = this.gene.speed * 3.5;
        break;
      case 'recover':
        currentSpeed = this.gene.speed * 0.3;
        break;
      default:
        currentSpeed = this.gene.speed * 0.4;
    }

    this.x += this.vx * currentSpeed;
    this.y += this.vy * currentSpeed;
    // 无限世界，不做边界限制
  }

  updateBodySegments() {
    this.bodySegments[0].x = this.x;
    this.bodySegments[0].y = this.y;
    
    for (let i = 1; i < this.bodySegments.length; i++) {
      const prev = this.bodySegments[i - 1];
      const curr = this.bodySegments[i];
      
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist > 0) {
        const scale = this.segmentSpacing / dist;
        curr.x = prev.x + dx * scale;
        curr.y = prev.y + dy * scale;
      } else {
        curr.x = prev.x - this.vx * this.segmentSpacing;
        curr.y = prev.y - this.vy * this.segmentSpacing;
      }
    }
  }

  reproduce() {
    return this.reproduceChild(Snake);
  }

  draw(ctx) {
    if (!this.isAlive) return;
    
    ctx.save();
    
    const segmentSize = this.size * 0.7;
    
    // 从尾到头绘制
    for (let i = this.bodySegments.length - 1; i >= 0; i--) {
      const segment = this.bodySegments[i];
      
      let sizeFactor;
      if (i < 4) {
        sizeFactor = 1;
      } else {
        const tailProgress = (i - 4) / (this.bodySegments.length - 4);
        sizeFactor = 1 - tailProgress * 0.8;
      }
      
      const currentSize = segmentSize * sizeFactor;
      
      if (this.state === 'strike') {
        const colorIntensity = Math.floor(100 + (i / this.bodySegments.length) * 50);
        ctx.fillStyle = `rgb(${colorIntensity + 50}, ${50}, ${50})`;
      } else {
        const baseG = 139;
        const variation = Math.sin(i * 0.5) * 20;
        ctx.fillStyle = `rgb(${34 + variation}, ${baseG - i * 3}, ${34 + variation})`;
      }
      
      ctx.beginPath();
      ctx.arc(segment.x, segment.y, currentSize, 0, Math.PI * 2);
      ctx.fill();
      
      // 花纹
      if (i % 3 === 0 && i > 0 && i < this.bodySegments.length - 2) {
        ctx.fillStyle = `rgba(0, 50, 0, 0.4)`;
        ctx.beginPath();
        ctx.ellipse(segment.x, segment.y, currentSize * 0.8, currentSize * 0.4, 
                    Math.atan2(this.vy, this.vx), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    
    // 绘制头部
    const head = this.bodySegments[0];
    const neck = this.bodySegments[1] || {x: head.x - this.vx, y: head.y - this.vy};
    const headAngle = Math.atan2(head.y - neck.y, head.x - neck.x);
    
    ctx.translate(head.x, head.y);
    ctx.rotate(headAngle);
    
    ctx.fillStyle = this.state === 'strike' ? '#a33' : '#2e8b57';
    ctx.beginPath();
    ctx.ellipse(segmentSize * 0.2, 0, segmentSize * 1.1, segmentSize * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();

    // 眼睛
    ctx.fillStyle = this.state === 'strike' ? '#f00' : '#ff0';
    ctx.beginPath();
    ctx.arc(segmentSize * 0.4, -segmentSize * 0.4, segmentSize * 0.25, 0, Math.PI * 2);
    ctx.arc(segmentSize * 0.4, segmentSize * 0.4, segmentSize * 0.25, 0, Math.PI * 2);
    ctx.fill();
    
    // 瞳孔
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
}
