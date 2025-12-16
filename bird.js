// ==================== 鸟类 ====================
// 实现鸟群算法（Boids）行为
// Requirements: 2.1, 4.1, 4.2, 4.3, 4.4

/**
 * 鸟类 - 使用鸟群算法（Boids）进行群体飞行
 */
class Bird extends Creature {
  constructor(x, y, gene = null) {
    super(x, y, 'bird', gene);

    // 初始速度
    const speed = this.gene.speed;
    this.vx *= speed;
    this.vy *= speed;

    // Boids 参数
    this.maxSpeed = this.gene.speed;
    this.maxForce = 0.1;

    // Boids 权重
    this.separationWeight = 1.5;
    this.alignmentWeight = 1.0;
    this.cohesionWeight = 1.0;

    // 感知范围
    this.perceptionRadius = this.gene.perception;
    this.separationRadius = this.gene.perception * 0.4;
    
    // 状态机
    this.state = 'flying'; // 'flying' | 'perching' | 'taking_off'
    this.stateTimer = 0;
    this.fatigue = 0;
  }

  getSizeDivisor() {
    return 3;
  }

  update(world, birds, ants = [], predators = []) {
    if (!this.isAlive) return;

    this.updateState(predators);
    this.updateReproductionTimers();

    if (this.state === 'perching') {
      this.fatigue = Math.max(0, this.fatigue - 0.5);
      this.energy = Math.min(CONFIG.INITIAL_ENERGY * 1.5, this.energy + 0.1);
      
      const nearbyPredator = this.findNearbyPredator(predators);
      if (nearbyPredator) {
        this.takeOff();
      }
      
      this.checkFoodPickup(world, ants);
    } else {
      this.updateFlight(world, birds, ants, predators);
      this.fatigue = Math.min(100, this.fatigue + 0.1);
      this.consumeEnergy(1, 0.002, 0.01);
      this.moveBird();
      this.checkFoodPickup(world, ants);
    }
  }

  updateState(predators) {
    if (this.stateTimer > 0) this.stateTimer--;

    if (this.state === 'flying') {
      if (this.fatigue > 50 && Math.random() < (this.fatigue / 5000)) {
        const nearbyPredator = this.findNearbyPredator(predators);
        if (!nearbyPredator) {
          this.land();
        }
      }
    } else if (this.state === 'perching') {
      if ((this.fatigue < 10 && Math.random() < 0.01) || 
          (this.energy < 50 && Math.random() < 0.05)) {
        this.takeOff();
      }
      if (this.stateTimer <= 0) {
        this.takeOff();
      }
    } else if (this.state === 'taking_off') {
      if (this.stateTimer <= 0) {
        this.state = 'flying';
      }
    }
  }

  land() {
    this.state = 'perching';
    this.stateTimer = 100 + Math.random() * 200;
    this.vx = 0;
    this.vy = 0;
  }

  takeOff() {
    this.state = 'taking_off';
    this.stateTimer = 20;
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.maxSpeed * 0.5;
    this.vy = Math.sin(angle) * this.maxSpeed * 0.5;
  }

  updateFlight(world, birds, ants, predators) {
    let ax = 0;
    let ay = 0;

    const nearbyPredator = this.findNearbyPredator(predators);
    if (nearbyPredator) {
      const flee = this.flee(nearbyPredator);
      ax += flee.x * 3;
      ay += flee.y * 3;
    } else {
      const flockForce = this.flock(birds);
      ax += flockForce.x;
      ay += flockForce.y;

      const seekForce = this.seekFood(world, ants);
      ax += seekForce.x * 0.8;
      ay += seekForce.y * 0.8;
    }

    this.vx += ax;
    this.vy += ay;
    this.limitSpeed();
  }

  moveBird() {
    if (this.state !== 'perching') {
      this.x += this.vx;
      this.y += this.vy;
      // 无限世界，不做边界限制
    }
  }

  limitSpeed() {
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (speed > this.maxSpeed) {
      this.vx = (this.vx / speed) * this.maxSpeed;
      this.vy = (this.vy / speed) * this.maxSpeed;
    }
    const minSpeed = this.maxSpeed * 0.3;
    if (speed < minSpeed && speed > 0) {
      this.vx = (this.vx / speed) * minSpeed;
      this.vy = (this.vy / speed) * minSpeed;
    }
  }

  // ==================== Boids 三规则 ====================

  separation(neighbors) {
    let steerX = 0;
    let steerY = 0;
    let count = 0;

    for (const other of neighbors) {
      const dist = this.distanceTo(other);

      if (dist > 0 && dist < this.separationRadius) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        steerX += dx / (dist * dist);
        steerY += dy / (dist * dist);
        count++;
      }
    }

    if (count > 0) {
      steerX /= count;
      steerY /= count;

      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > 0) {
        steerX = (steerX / mag) * this.maxForce;
        steerY = (steerY / mag) * this.maxForce;
      }
    }

    return { x: steerX, y: steerY };
  }

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

      let steerX = avgVx - this.vx;
      let steerY = avgVy - this.vy;

      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > this.maxForce) {
        steerX = (steerX / mag) * this.maxForce;
        steerY = (steerY / mag) * this.maxForce;
      }

      return { x: steerX, y: steerY };
    }

    return { x: 0, y: 0 };
  }

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

      const dx = centerX - this.x;
      const dy = centerY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        let desiredVx = (dx / dist) * this.maxSpeed;
        let desiredVy = (dy / dist) * this.maxSpeed;

        let steerX = desiredVx - this.vx;
        let steerY = desiredVy - this.vy;

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

  flock(birds) {
    const neighbors = this.getNeighbors(birds);

    if (neighbors.length === 0) {
      return { x: 0, y: 0 };
    }

    const sep = this.separation(neighbors);
    const ali = this.alignment(neighbors);
    const coh = this.cohesion(neighbors);

    return {
      x: sep.x * this.separationWeight + ali.x * this.alignmentWeight + coh.x * this.cohesionWeight,
      y: sep.y * this.separationWeight + ali.y * this.alignmentWeight + coh.y * this.cohesionWeight
    };
  }

  getNeighbors(birds) {
    const neighbors = [];

    for (const other of birds) {
      if (other === this || !other.isAlive) continue;

      if (this.distanceTo(other) < this.perceptionRadius) {
        neighbors.push(other);
      }
    }

    return neighbors;
  }

  // ==================== 觅食和逃跑 ====================

  seekFood(world, ants) {
    const hungerFactor = this.energy < 50 ? 2 : 1;

    let targetX = null;
    let targetY = null;
    let minDist = this.perceptionRadius;

    const nearestPlant = world.getNearestPlant(this.x, this.y, this.perceptionRadius);
    if (nearestPlant) {
      const dist = this.distanceTo(nearestPlant);
      if (dist < minDist) {
        minDist = dist;
        targetX = nearestPlant.x;
        targetY = nearestPlant.y;
      }
    }

    // 极度饥饿时才吃蚂蚁
    if (this.energy < CONFIG.INITIAL_ENERGY * 0.3) {
      for (const ant of ants) {
        if (!ant.isAlive) continue;

        const dist = this.distanceTo(ant);
        if (dist < minDist) {
          minDist = dist;
          targetX = ant.x;
          targetY = ant.y;
        }
      }
    }

    if (targetX !== null) {
      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        let desiredVx = (dx / dist) * this.maxSpeed;
        let desiredVy = (dy / dist) * this.maxSpeed;

        let steerX = (desiredVx - this.vx) * hungerFactor;
        let steerY = (desiredVy - this.vy) * hungerFactor;

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

  checkFoodPickup(world, ants) {
    const eatRadius = this.size + 3;

    const nearestPlant = world.getNearestPlant(this.x, this.y, eatRadius);
    if (nearestPlant) {
      world.removePlant(nearestPlant);
      this.energy += CONFIG.FOOD_ENERGY;
      return;
    }

    for (const ant of ants) {
      if (!ant.isAlive) continue;

      if (this.distanceTo(ant) < eatRadius) {
        ant.die();
        this.energy += CONFIG.FOOD_ENERGY * 0.02;
        return;
      }
    }
  }

  findNearbyPredator(predators) {
    let nearest = null;
    let minDist = this.perceptionRadius;

    for (const predator of predators) {
      if (!predator.isAlive) continue;
      if (!SPECIES.bird.predators.includes(predator.type)) continue;

      // 蛇伏击时难以发现
      if (predator.type === 'snake' && predator.state === 'ambush') {
        if (this.distanceTo(predator) > this.perceptionRadius * 0.3) {
          continue;
        }
      }

      const dist = this.distanceTo(predator);
      if (dist < minDist) {
        minDist = dist;
        nearest = predator;
      }
    }

    return nearest;
  }

  flee(predator) {
    const dx = this.x - predator.x;
    const dy = this.y - predator.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 0) {
      let fleeX = (dx / dist) * this.maxSpeed;
      let fleeY = (dy / dist) * this.maxSpeed;

      let steerX = fleeX - this.vx;
      let steerY = fleeY - this.vy;

      const mag = Math.sqrt(steerX * steerX + steerY * steerY);
      if (mag > this.maxForce * 3) {
        steerX = (steerX / mag) * this.maxForce * 3;
        steerY = (steerY / mag) * this.maxForce * 3;
      }

      return { x: steerX, y: steerY };
    }

    return { x: 0, y: 0 };
  }

  // ==================== 繁殖 ====================

  reproduce() {
    const cost = ReproductionUtils.getReproductionCost(this.type);
    this.energy -= cost * 0.5;
    this.reproductionCooldown = ReproductionUtils.getReproductionCooldown(this.type);

    const childGene = this.mutateGene();
    const offset = ReproductionUtils.getSpawnOffset(this.type);

    const child = new Bird(
      this.x + offset.offsetX,
      this.y + offset.offsetY,
      childGene
    );

    child.generation = this.generation + 1;
    child.energy = ReproductionUtils.getOffspringEnergy(this.type);
    child.vx = this.vx + (Math.random() - 0.5) * 2;
    child.vy = this.vy + (Math.random() - 0.5) * 2;
    child.limitSpeed();

    return child;
  }

  draw(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    let angle = 0;
    if (Math.abs(this.vx) > 0.1 || Math.abs(this.vy) > 0.1) {
      angle = Math.atan2(this.vy, this.vx);
    }
    ctx.rotate(angle);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    
    if (this.state === 'perching') {
      ctx.ellipse(0, 0, this.size * 1.0, this.size * 0.6, 0, 0, Math.PI * 2);
    } else {
      ctx.moveTo(this.size * 1.5, 0);
      ctx.lineTo(-this.size, -this.size * 0.8);
      ctx.lineTo(-this.size * 0.3, 0);
      ctx.lineTo(-this.size, this.size * 0.8);
    }
    
    ctx.closePath();
    ctx.fill();

    // 翅膀纹路
    ctx.strokeStyle = '#2a4a9e';
    ctx.lineWidth = 1;
    ctx.beginPath();
    
    if (this.state === 'perching') {
      ctx.moveTo(-this.size * 0.5, -this.size * 0.3);
      ctx.lineTo(this.size * 0.5, -this.size * 0.3);
      ctx.moveTo(-this.size * 0.5, this.size * 0.3);
      ctx.lineTo(this.size * 0.5, this.size * 0.3);
    } else {
      ctx.moveTo(0, 0);
      ctx.lineTo(-this.size * 0.8, -this.size * 0.6);
      ctx.moveTo(0, 0);
      ctx.lineTo(-this.size * 0.8, this.size * 0.6);
    }
    ctx.stroke();

    ctx.restore();
  }
}
