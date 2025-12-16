// ==================== 信息素网格类 ====================
// 用于蚁群算法中的信息素系统
// Requirements: 3.2, 3.3, 3.4

class PheromoneGrid {
  /**
   * 创建信息素网格
   * @param {number} width - 初始世界宽度
   * @param {number} height - 初始世界高度
   * @param {number} cellSize - 每个网格单元的大小（像素）
   */
  constructor(width, height, cellSize = 10) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    
    // 使用 Map 存储稀疏网格
    // Key: "row,col"
    // Value: strength
    this.grid = new Map();
    
    // 蒸发率
    this.evaporationRate = CONFIG.PHEROMONE_EVAPORATION;
    
    // 最大信息素浓度
    this.maxStrength = 255;
    
    // 是否显示信息素可视化
    this.visible = true;
  }

  /**
   * 初始化网格
   */
  initGrid() {
    this.grid.clear();
  }

  /**
   * 将世界坐标转换为网格坐标
   * @param {number} x - 世界x坐标
   * @param {number} y - 世界y坐标
   * @returns {{col: number, row: number}} 网格坐标
   */
  worldToGrid(x, y) {
    // 允许负坐标
    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);
    return { col, row };
  }
  
  /**
   * 检查坐标是否在核心区域内（仅用于可视化或其他逻辑，不限制信息素放置）
   */
  isInBounds(x, y) {
    // 只要是有效数字都可以
    return !isNaN(x) && !isNaN(y);
  }

  /**
   * 在指定位置释放信息素
   * @param {number} x - 世界x坐标
   * @param {number} y - 世界y坐标
   * @param {number} amount - 释放的信息素量
   */
  deposit(x, y, amount = CONFIG.PHEROMONE_DEPOSIT) {
    const { col, row } = this.worldToGrid(x, y);
    const key = `${row},${col}`;
    
    const currentStrength = this.grid.get(key) || 0;
    
    // 增加信息素浓度，但不超过最大值
    this.grid.set(key, Math.min(
      this.maxStrength,
      currentStrength + amount
    ));
  }

  /**
   * 信息素蒸发
   * @param {number} rate - 蒸发率
   */
  evaporate(rate = this.evaporationRate) {
    // 遍历 Map 中所有活跃的信息素
    for (const [key, strength] of this.grid.entries()) {
      const newStrength = strength * rate;
      
      if (newStrength < 0.1) {
        // 如果浓度太低，直接移除该记录，保持 Map 稀疏且高效
        this.grid.delete(key);
      } else {
        this.grid.set(key, newStrength);
      }
    }
  }

  /**
   * 获取指定位置的信息素浓度
   * @param {number} x - 世界x坐标
   * @param {number} y - 世界y坐标
   * @returns {number} 信息素浓度
   */
  getStrength(x, y) {
    const { col, row } = this.worldToGrid(x, y);
    return this.grid.get(`${row},${col}`) || 0;
  }

  /**
   * 获取指定位置周围的信息素浓度
   */
  getSurroundingStrength(x, y, radius = 1) {
    const { col, row } = this.worldToGrid(x, y);
    const surrounding = [];
    
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (dr === 0 && dc === 0) continue; // 跳过自身位置
        
        const newRow = row + dr;
        const newCol = col + dc;
        const key = `${newRow},${newCol}`;
        
        const strength = this.grid.get(key) || 0;
        
        // 即使浓度为0也返回位置信息，以便算法判断
        surrounding.push({
          row: newRow,
          col: newCol,
          strength: strength,
          // 返回该网格中心的世界坐标
          worldX: (newCol + 0.5) * this.cellSize,
          worldY: (newRow + 0.5) * this.cellSize
        });
      }
    }
    
    return surrounding;
  }

  /**
   * 获取信息素浓度最高的方向
   */
  getStrongestDirection(x, y, radius = 1) {
    const surrounding = this.getSurroundingStrength(x, y, radius);
    
    if (surrounding.length === 0) return null;
    
    // 找到浓度最高的位置
    let strongest = surrounding[0];
    for (const cell of surrounding) {
      if (cell.strength > strongest.strength) {
        strongest = cell;
      }
    }
    
    // 如果最强浓度为0，返回null
    if (strongest.strength === 0) return null;
    
    return {
      x: strongest.worldX,
      y: strongest.worldY,
      strength: strongest.strength
    };
  }

  /**
   * 绘制信息素可视化
   */
  draw(ctx) {
    if (!this.visible) return;
    
    // 获取当前视口范围，只绘制可见区域
    // 这需要从外部传入 camera 或者计算，这里简化处理：
    // 遍历所有点会比较慢如果点很多。但由于我们已经删除了低浓度点，通常不会太多。
    // 如果性能成为问题，可以考虑空间索引。
    
    ctx.fillStyle = 'rgba(0, 255, 150, 0.6)'; // 基础颜色，透明度由 globalAlpha 控制
    
    for (const [key, strength] of this.grid.entries()) {
      if (strength <= 0.5) continue; // 忽略太淡的
      
      const [rowStr, colStr] = key.split(',');
      const row = parseInt(rowStr);
      const col = parseInt(colStr);
      
      const alpha = Math.min(0.6, strength / this.maxStrength);
      ctx.fillStyle = `rgba(0, 255, 150, ${alpha})`;
      
      ctx.fillRect(
        col * this.cellSize,
        row * this.cellSize,
        this.cellSize,
        this.cellSize
      );
    }
  }

  /**
   * 切换信息素可视化显示
   */
  toggleVisibility() {
    this.visible = !this.visible;
  }
  
  // ... 其他辅助方法保持不变或者不再需要
  
  getStats() {
    let totalStrength = 0;
    for (const strength of this.grid.values()) {
      totalStrength += strength;
    }
    return { totalStrength, activeCells: this.grid.size };
  }
}
