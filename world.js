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
    this.baseWidth = width;
    this.baseHeight = height;
    this.width = width;
    this.height = height;
    this.plants = [];
    this.maxPlants = CONFIG.MAX_FOOD;
    this.plantSpawnRate = CONFIG.FOOD_SPAWN_RATE;
    
    // 动态世界范围（根据摄像机视野扩展）
    this.viewBounds = {
      minX: 0,
      minY: 0,
      maxX: width,
      maxY: height
    };
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

  // 根据摄像机视野更新世界范围
  updateViewBounds(camera, canvasWidth, canvasHeight) {
    // 使用最小缩放时的视野作为最大边界（缩小到最小时能看到的范围）
    const maxViewWidth = canvasWidth / camera.minZoom;
    const maxViewHeight = canvasHeight / camera.minZoom;
    
    // 当前视野范围（用于计算中心点）
    const currentViewWidth = canvasWidth / camera.zoom;
    const currentViewHeight = canvasHeight / camera.zoom;
    const viewCenterX = camera.x + currentViewWidth / 2;
    const viewCenterY = camera.y + currentViewHeight / 2;
    
    // 边界基于最小缩放时的最大视野 + 边距
    const margin = 100;
    const halfMaxWidth = maxViewWidth / 2 + margin;
    const halfMaxHeight = maxViewHeight / 2 + margin;
    
    this.viewBounds.minX = viewCenterX - halfMaxWidth;
    this.viewBounds.minY = viewCenterY - halfMaxHeight;
    this.viewBounds.maxX = viewCenterX + halfMaxWidth;
    this.viewBounds.maxY = viewCenterY + halfMaxHeight;
    
    // 更新世界尺寸
    this.width = this.viewBounds.maxX - this.viewBounds.minX;
    this.height = this.viewBounds.maxY - this.viewBounds.minY;
    
    // 动态调整最大植物数量（世界越大，植物越多）
    const areaRatio = (this.width * this.height) / (this.baseWidth * this.baseHeight);
    this.maxPlants = Math.floor(CONFIG.MAX_FOOD * Math.sqrt(areaRatio));
  }

  // 生成单个植物
  spawnPlant(x = null, y = null) {
    if (this.plants.length >= this.maxPlants) {
      return null;
    }
    
    // 如果没有指定位置，则在当前世界范围内随机生成
    if (x === null || y === null) {
      const angle = Math.random() * Math.PI * 2;
      
      // 世界中心
      const centerX = (this.viewBounds.minX + this.viewBounds.maxX) / 2;
      const centerY = (this.viewBounds.minY + this.viewBounds.maxY) / 2;
      
      // 最大半径基于当前世界大小
      const maxRadius = Math.sqrt(this.width * this.width + this.height * this.height) / 2 * 0.8;
      
      let dist;
      if (Math.random() < 0.3) {
        // 30% 均匀分布在大范围
        dist = maxRadius * Math.sqrt(Math.random());
      } else {
        // 70% 集中在中心区域
        dist = maxRadius * Math.pow(Math.random(), 1.5);
      }
      
      x = centerX + Math.cos(angle) * dist;
      y = centerY + Math.sin(angle) * dist;
    }
    
    const plant = new Plant(x, y);
    this.plants.push(plant);
    return plant;
  }

  // 更新世界状态（植物再生）
  update(camera = null, canvasWidth = 0, canvasHeight = 0) {
    // 根据摄像机更新世界范围
    if (camera && canvasWidth && canvasHeight) {
      this.updateViewBounds(camera, canvasWidth, canvasHeight);
    }
    
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
