// ==================== 植物类 ====================
class Plant {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.energy = CONFIG.FOOD_ENERGY;
    this.size = 4;
    this.color = '#4ecdc4';
  }

  draw(ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    
    // 添加发光效果
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(78, 205, 196, 0.2)';
    ctx.fill();
  }
}

// ==================== 世界类 ====================
class World {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.plants = [];
    this.maxPlants = CONFIG.MAX_FOOD;
    this.plantSpawnRate = CONFIG.FOOD_SPAWN_RATE;
  }

  // 初始化世界，生成初始植物
  init() {
    this.plants = [];
    // 生成初始植物（约一半的最大数量）
    const initialPlantCount = Math.floor(this.maxPlants / 2);
    for (let i = 0; i < initialPlantCount; i++) {
      this.spawnPlant();
    }
  }

  // 生成单个植物
  spawnPlant(x = null, y = null) {
    if (this.plants.length >= this.maxPlants) {
      return null;
    }
    
    // 如果没有指定位置，则随机生成
    if (x === null || y === null) {
      // 使用极坐标生成，实现"一圈圈"向外扩散的渐变效果
      // 随机角度
      const angle = Math.random() * Math.PI * 2;
      
      // 随机距离：使用线性分布或指数分布来控制密度
      // 这里使用 random()^1.5 让分布向中心倾斜，同时保留一定的广度
      // 距离上限设为世界对角线的一半，确保可以覆盖角落，甚至稍微超出
      const maxRadius = Math.sqrt(Math.pow(this.width, 2) + Math.pow(this.height, 2)) / 2 * 0.8;
      
      // 为了让密度随距离 r 明显下降，但又不会在边缘完全消失
      // 我们混合两种分布：一种是集中的高斯分布（主体），一种是广域的均匀分布（背景噪声）
      
      let dist;
      if (Math.random() < 0.3) {
        // 30% 的概率均匀分布在整个大范围内（背景噪声）
        // 增加背景噪声的概率，并扩大分布范围（2倍对角线）
        dist = maxRadius * 10 * Math.sqrt(Math.random());
      } else {
        // 70% 的概率使用指数衰减分布（主体）
        // 减小幂次，让衰减更平缓，使更多植物分布在中间地带
        dist = maxRadius * Math.pow(Math.random(), 1.5);
      }
      
      const centerX = this.width / 2;
      const centerY = this.height / 2;
      
      x = centerX + Math.cos(angle) * dist;
      y = centerY + Math.sin(angle) * dist;
    }
    
    const plant = new Plant(x, y);
    this.plants.push(plant);
    return plant;
  }


  // 更新世界状态（植物再生）
  update() {
    // 根据概率生成新植物
    if (Math.random() < this.plantSpawnRate && this.plants.length < this.maxPlants) {
      this.spawnPlant();
    }
  }

  // 移除植物（被吃掉时调用）
  removePlant(plant) {
    const index = this.plants.indexOf(plant);
    if (index > -1) {
      this.plants.splice(index, 1);
    }
  }

  // 获取指定位置附近的植物
  getPlantNear(x, y, radius) {
    return this.plants.filter(plant => {
      const dx = plant.x - x;
      const dy = plant.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= radius;
    });
  }

  // 获取最近的植物
  getNearestPlant(x, y, maxDistance = Infinity) {
    let nearest = null;
    let minDist = maxDistance;
    
    for (const plant of this.plants) {
      const dx = plant.x - x;
      const dy = plant.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      if (dist < minDist) {
        minDist = dist;
        nearest = plant;
      }
    }
    
    return nearest;
  }

  // 检查位置是否在世界边界内
  isInBounds(x, y, padding = 0) {
    return x >= padding && 
           x <= this.width - padding && 
           y >= padding && 
           y <= this.height - padding;
  }

  // 将位置限制在世界边界内
  clampToBounds(x, y, padding = 0) {
    return {
      x: Math.max(padding, Math.min(this.width - padding, x)),
      y: Math.max(padding, Math.min(this.height - padding, y))
    };
  }

  // 绘制世界和植物
  draw(ctx) {
    // 根据缩放比例动态调整植物绘制大小
    // 摄像机缩放越大，绘制尺寸越小，保持视觉大小一致（可选）
    // 或者保持物理尺寸一致（默认）
    
    // 绘制所有植物
    for (const plant of this.plants) {
      plant.draw(ctx);
    }
  }

  // 获取植物数量
  getPlantCount() {
    return this.plants.length;
  }
}
