// 生物进化模拟器 - 主入口文件
// CONFIG 和 SPECIES 定义在 config.js 中

// ==================== 全局状态 ====================
let canvas, ctx;
let isPaused = false;
let selectedSpecies = 'ant';
let generation = 0;

// 摄像机控制
let camera = {
  x: 0,
  y: 0,
  zoom: 1,
  minZoom: 0.2,
  maxZoom: 3,
  isDragging: false,
  lastX: 0,
  lastY: 0
};

// 生物和蚁巢存储
let creatures = [];
let antNests = [];

// 世界实例
let world = null;

// 信息素网格实例
let pheromoneGrid = null;

// 拖拽状态（仅用于生成时的预览）
let dragState = {
  isDragging: false,
  species: null,
  startX: 0,
  startY: 0,
  currentX: 0,
  currentY: 0,
  count: 1
};

// 悬停状态
let hoveredIcon = null;

// ==================== 初始化 ====================
function init() {
  canvas = document.getElementById('game-canvas');
  ctx = canvas.getContext('2d');
  
  if (!ctx) {
    alert('您的浏览器不支持 Canvas，请使用现代浏览器。');
    return;
  }
  
  resizeCanvas();
  setupEventListeners();
  
    // 初始化世界
  world = new World(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
  world.init();
  
  // 初始化信息素网格
  pheromoneGrid = new PheromoneGrid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT, 10);
  
  // 将摄像机对准中心
  centerCamera();
  
  // 自动放置一些初始蚂蚁用于测试
  spawnInitialCreatures();
  
  gameLoop();
}

// 将摄像机对准世界中心
function centerCamera() {
  camera.x = CONFIG.WORLD_WIDTH / 2 - canvas.width / 2;
  camera.y = CONFIG.WORLD_HEIGHT / 2 - canvas.height / 2;
  // 限制摄像机不要超出太多
  clampCamera();
}

// 屏幕坐标转世界坐标
function screenToWorld(sx, sy) {
  return {
    x: (sx / camera.zoom) + camera.x,
    y: (sy / camera.zoom) + camera.y
  };
}

// 限制摄像机范围
function clampCamera() {
  // 计算屏幕中心在世界坐标系中的位置
  const viewWidth = canvas.width / camera.zoom;
  const viewHeight = canvas.height / camera.zoom;
  
  const centerX = camera.x + viewWidth / 2;
  const centerY = camera.y + viewHeight / 2;
  
  // 允许中心点在世界范围外一定距离
  const margin = 100;
  const minX = -margin;
  const maxX = CONFIG.WORLD_WIDTH + margin;
  const minY = -margin;
  const maxY = CONFIG.WORLD_HEIGHT + margin;
  
  // 限制中心点位置
  const clampedCenterX = Math.max(minX, Math.min(maxX, centerX));
  const clampedCenterY = Math.max(minY, Math.min(maxY, centerY));
  
  // 重新计算 camera.x/y
  camera.x = clampedCenterX - viewWidth / 2;
  camera.y = clampedCenterY - viewHeight / 2;
}

// 生成初始生物用于测试
function spawnInitialCreatures() {
  // 在世界中央放置一些蚂蚁
  const centerX = CONFIG.WORLD_WIDTH / 2;
  const centerY = CONFIG.WORLD_HEIGHT / 2;
  
  // 放置5只蚂蚁
  for (let i = 0; i < 5; i++) {
    spawnAnt(centerX + (Math.random() - 0.5) * 100, centerY + (Math.random() - 0.5) * 100);
  }
  
  console.log('初始蚂蚁已放置:', creatures.length, '只');
  updateStatusBar();
}

// 调整画布大小
function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  
  // 铺满容器，不受限于世界尺寸
  canvas.width = wrapper.clientWidth;
  canvas.height = wrapper.clientHeight;
  
  // 世界尺寸使用 CONFIG 中的大尺寸
  if (world) {
    world.width = CONFIG.WORLD_WIDTH;
    world.height = CONFIG.WORLD_HEIGHT;
  }
}

// ==================== 事件监听 ====================
function setupEventListeners() {
  // 窗口大小调整
  window.addEventListener('resize', resizeCanvas);
  
  // 物种选择按钮
  document.querySelectorAll('.species-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.species-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedSpecies = btn.dataset.species;
    });
  });
  
  // 暂停/继续按钮
  document.getElementById('btn-pause').addEventListener('click', togglePause);
  
  // 重置按钮
  document.getElementById('btn-reset').addEventListener('click', resetGame);
  
  // 画布点击 - 放置生物
  canvas.addEventListener('click', onCanvasClick);
  
  // 画布鼠标移动 - 悬停检测和拖拽
  canvas.addEventListener('mousemove', onCanvasMouseMove);
  
  // 画布鼠标按下 - 开始拖拽
  canvas.addEventListener('mousedown', onCanvasMouseDown);
  
  // 画布鼠标释放 - 结束拖拽
  canvas.addEventListener('mouseup', onCanvasMouseUp);
  
  // 鼠标离开画布 - 取消拖拽
  canvas.addEventListener('mouseleave', onCanvasMouseLeave);
  
  // 键盘控制
  document.addEventListener('keydown', onKeyDown);
  
  // 滚轮缩放
  canvas.addEventListener('wheel', onWheel, { passive: false });
  
  // 添加触摸事件监听
  setupTouchListeners();
}

// 触摸状态
let touchState = {
  lastX: 0,
  lastY: 0,
  lastDist: 0,
  isDragging: false,
  isPinching: false,
  touchStartTime: 0,
  startWorldX: 0,
  startWorldY: 0
};

// 设置触摸监听
function setupTouchListeners() {
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
}

// 触摸开始
function handleTouchStart(e) {
  e.preventDefault();
  
  if (e.touches.length === 1) {
    // 单指操作：可能是点击或拖拽移动
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    
    touchState.lastX = touch.clientX - rect.left;
    touchState.lastY = touch.clientY - rect.top;
    touchState.touchStartTime = Date.now();
    touchState.isDragging = false;
    touchState.isPinching = false;
    
  } else if (e.touches.length === 2) {
    // 双指操作：缩放
    touchState.isPinching = true;
    touchState.isDragging = false;
    
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    touchState.lastDist = Math.sqrt(dx * dx + dy * dy);
  }
}

// 触摸移动
function handleTouchMove(e) {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();

  if (e.touches.length === 1 && !touchState.isPinching) {
    // 单指拖拽移动地图
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const dx = x - touchState.lastX;
    const dy = y - touchState.lastY;
    
    // 如果移动距离超过阈值，视为拖拽
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
      touchState.isDragging = true;
      camera.x -= dx / camera.zoom;
      camera.y -= dy / camera.zoom;
      clampCamera();
    }
    
    touchState.lastX = x;
    touchState.lastY = y;
    
  } else if (e.touches.length === 2) {
    // 双指缩放
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (touchState.lastDist > 0) {
      const zoomSpeed = 0.005;
      const delta = (dist - touchState.lastDist) * zoomSpeed;
      
      // 计算缩放中心（两指中点）
      const centerX = (e.touches[0].clientX + e.touches[1].clientX) / 2 - rect.left;
      const centerY = (e.touches[0].clientY + e.touches[1].clientY) / 2 - rect.top;
      
      const worldX = (centerX / camera.zoom) + camera.x;
      const worldY = (centerY / camera.zoom) + camera.y;
      
      camera.zoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom + delta));
      
      // 保持缩放中心不变
      camera.x = worldX - (centerX / camera.zoom);
      camera.y = worldY - (centerY / camera.zoom);
      
      clampCamera();
    }
    
    touchState.lastDist = dist;
  }
}

// 触摸结束
function handleTouchEnd(e) {
  e.preventDefault();
  
  // 如果是单指且没有发生明显拖拽（且时间较短），视为点击
  if (!touchState.isDragging && !touchState.isPinching && e.changedTouches.length === 1) {
    const duration = Date.now() - touchState.touchStartTime;
    if (duration < 300) { // 300ms 内视为点击
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      
      // 构造一个伪造的 click 事件对象传给 onCanvasClick
      const fakeEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      };
      onCanvasClick(fakeEvent);
    }
  }
  
  if (e.touches.length === 0) {
    touchState.isDragging = false;
    touchState.isPinching = false;
  }
}

// 滚轮缩放事件
function onWheel(e) {
  e.preventDefault();
  
  const zoomSpeed = 0.1;
  const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
  const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, camera.zoom + delta));
  
  if (newZoom !== camera.zoom) {
    // 以鼠标位置为中心缩放
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 计算鼠标当前指向的世界坐标（基于旧的 camera.x/y 和 zoom）
    const worldX = (mouseX / camera.zoom) + camera.x;
    const worldY = (mouseY / camera.zoom) + camera.y;
    
    // 更新缩放
    camera.zoom = newZoom;
    
    // 计算新的 camera.x/y，使得 worldX, worldY 仍然对应屏幕上的 mouseX, mouseY
    // 公式: mouseX = (worldX - newCameraX) * newZoom
    // => worldX - newCameraX = mouseX / newZoom
    // => newCameraX = worldX - (mouseX / newZoom)
    camera.x = worldX - (mouseX / camera.zoom);
    camera.y = worldY - (mouseY / camera.zoom);
    
    clampCamera();
  }
}

// 鼠标移动事件
function onCanvasMouseMove(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  // 1. 处理摄像机拖拽（右键或中键，或者按住空格时左键）
  if (camera.isDragging) {
    const dx = screenX - camera.lastX;
    const dy = screenY - camera.lastY;
    
    camera.x -= dx / camera.zoom;
    camera.y -= dy / camera.zoom;
    
    camera.lastX = screenX;
    camera.lastY = screenY;
    
    clampCamera();
    canvas.style.cursor = 'grabbing';
    return;
  }

  // 2. 更新光标样式
  if (dragState.isDragging) {
    canvas.style.cursor = 'grabbing';
  } else {
    canvas.style.cursor = 'crosshair';
  }
  
  // 3. 如果正在拖拽生成生物，更新位置（使用屏幕坐标绘制预览）
  if (dragState.isDragging) {
    dragState.currentX = screenX;
    dragState.currentY = screenY;
    
    // 计算拖拽距离和生成数量
    const dx = dragState.currentX - dragState.startX;
    const dy = dragState.currentY - dragState.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    dragState.count = Math.min(10, Math.max(1, Math.floor(distance / 50)));
  }
}

// 鼠标按下事件
function onCanvasMouseDown(e) {
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  // 检查是否是拖拽地图操作（右键、中键或按住空格）
  // 0:左键, 1:中键, 2:右键
  if (e.button === 1 || e.button === 2 || (e.button === 0 && e.shiftKey)) {
    camera.isDragging = true;
    camera.lastX = screenX;
    camera.lastY = screenY;
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  }
}

// 鼠标释放事件
function onCanvasMouseUp(e) {
  if (camera.isDragging) {
    camera.isDragging = false;
    canvas.style.cursor = 'crosshair';
  }

  if (dragState.isDragging) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    
    // 转换到世界坐标生成物种
    const worldPos = screenToWorld(screenX, screenY);
    spawnCreature(worldPos.x, worldPos.y, dragState.species, dragState.count);
    updateStatusBar();
    
    // 重置拖拽状态
    resetDragState();
  }
}

// 鼠标离开画布
function onCanvasMouseLeave() {
  camera.isDragging = false;
  if (dragState.isDragging) {
    resetDragState();
  }
}

// 重置拖拽状态
function resetDragState() {
  dragState.isDragging = false;
  dragState.species = null;
  dragState.startX = 0;
  dragState.startY = 0;
  dragState.currentX = 0;
  dragState.currentY = 0;
  dragState.count = 1;
  canvas.style.cursor = 'crosshair';
}

// 键盘事件处理
function onKeyDown(e) {
  switch (e.code) {
    case 'Space':
      e.preventDefault();
      togglePause();
      break;
    case 'KeyR':
      resetGame();
      break;
    case 'KeyP':
      // 切换信息素可视化显示
      if (pheromoneGrid) {
        pheromoneGrid.toggleVisibility();
      }
      break;
  }
}

// 暂停/继续
function togglePause() {
  isPaused = !isPaused;
  const btn = document.getElementById('btn-pause');
  btn.textContent = isPaused ? '继续 (空格)' : '暂停 (空格)';
}

// 重置游戏
function resetGame() {
  creatures = [];
  antNests = [];
  generation = 0;
  isPaused = false;
  
  // 重新初始化世界
  world = new World(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
  world.init();
  
  // 重新初始化信息素网格
  pheromoneGrid = new PheromoneGrid(CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT, 10);
  
  document.getElementById('btn-pause').textContent = '暂停 (空格)';
  updateStatusBar();
}

// 画布点击 - 放置生物
function onCanvasClick(e) {
  // 如果是拖拽地图结束的点击，或者是 UI 交互，则忽略
  if (camera.isDragging || dragState.isDragging) return;
  
  const rect = canvas.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;
  
  // 转换到世界坐标
  const worldPos = screenToWorld(screenX, screenY);
  spawnCreature(worldPos.x, worldPos.y, selectedSpecies);
  updateStatusBar();
}

// 生成生物
function spawnCreature(x, y, type, count = 1) {
  for (let i = 0; i < count; i++) {
    // 在点击位置附近随机偏移
    const offsetX = (Math.random() - 0.5) * 30;
    const offsetY = (Math.random() - 0.5) * 30;
    const spawnX = x + offsetX;
    const spawnY = y + offsetY;
    
    switch (type) {
      case 'ant':
        spawnAnt(spawnX, spawnY);
        break;
      case 'bird':
        const bird = new Bird(spawnX, spawnY);
        creatures.push(bird);
        break;
      case 'anteater':
        const anteater = new Anteater(spawnX, spawnY);
        creatures.push(anteater);
        break;
      case 'snake':
        const snake = new Snake(spawnX, spawnY);
        creatures.push(snake);
        break;
    }
  }
}

// 生成蚂蚁（会自动创建蚁巢）
function spawnAnt(x, y) {
  // 检查附近是否已有蚁巢
  let nearestNest = findNearestNest(x, y, 100);
  
  if (!nearestNest) {
    // 创建新蚁巢
    nearestNest = new AntNest(x, y);
    antNests.push(nearestNest);
  }
  
  // 创建蚂蚁
  const ant = new Ant(x, y, nearestNest.x, nearestNest.y);
  creatures.push(ant);
}

// 查找最近的蚁巢
function findNearestNest(x, y, maxDistance = Infinity) {
  let nearest = null;
  let minDist = maxDistance;
  
  for (const nest of antNests) {
    const dx = nest.x - x;
    const dy = nest.y - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist < minDist) {
      minDist = dist;
      nearest = nest;
    }
  }
  
  return nearest;
}

// ==================== 状态栏更新 ====================
function updateStatusBar() {
  // 统计各物种数量（只统计存活的）
  const counts = { ant: 0, bird: 0, anteater: 0, snake: 0 };
  creatures.forEach(c => {
    if (c.isAlive && counts.hasOwnProperty(c.type)) {
      counts[c.type]++;
    }
  });
  
  // 更新显示
  document.getElementById('count-ant').textContent = counts.ant;
  document.getElementById('count-bird').textContent = counts.bird;
  document.getElementById('count-anteater').textContent = counts.anteater;
  document.getElementById('count-snake').textContent = counts.snake;
  document.getElementById('generation').textContent = generation;
}

// ==================== 游戏主循环 ====================
function gameLoop() {
  if (!isPaused) {
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// 更新逻辑
function update() {
  // 更新世界（植物再生）
  if (world) {
    world.update();
  }
  
  // 更新信息素（蒸发）
  if (pheromoneGrid) {
    pheromoneGrid.evaporate();
  }
  
  // 获取各类生物列表
  const ants = creatures.filter(c => c.isAlive && c.type === 'ant');
  const birds = creatures.filter(c => c.isAlive && c.type === 'bird');
  const predators = creatures.filter(c => 
    c.isAlive && (c.type === 'anteater' || c.type === 'snake')
  );
  
  // 更新所有生物
  for (const creature of creatures) {
    if (!creature.isAlive) continue;
    
    if (creature.type === 'ant') {
      // 记录蚂蚁之前是否有食物
      const hadFoodBefore = creature.hasFood;
      
      // 蚂蚁的捕食者包括鸟
      const antPredators = [...predators, ...birds];
      creature.update(world, pheromoneGrid, antPredators, ants);
      
      // 检查蚂蚁是否刚刚卸下食物（之前有食物，现在没有了）
      if (hadFoodBefore && !creature.hasFood) {
        // 找到蚂蚁所属的蚁巢
        const nest = findNearestNest(creature.nestX, creature.nestY, 20);
        if (nest) {
          nest.storeFood(1);
        }
      }
    } else if (creature.type === 'bird') {
      // 鸟使用 Boids 算法，需要传入所有鸟、蚂蚁和捕食者
      creature.update(world, birds, ants, predators);
    } else if (creature.type === 'anteater') {
      // 食蚁兽追捕蚂蚁
      creature.update(world, ants);
    } else if (creature.type === 'snake') {
      // 蛇只追捕鸟类
      creature.update(world, birds);
    }
  }
  
  // 更新蚁巢（可能生成新蚂蚁，同时释放信息素）
  for (const nest of antNests) {
    const nestAnts = creatures.filter(c => c.type === 'ant');
    const newAnt = nest.update(nestAnts, pheromoneGrid);
    if (newAnt) {
      creatures.push(newAnt);
    }
  }
  
  // 处理繁殖
  handleReproduction();
  
  // 移除死亡的生物
  creatures = creatures.filter(c => c.isAlive && !isNaN(c.x) && !isNaN(c.y));
  
  // 更新代数（取最大代数）
  updateGeneration();
  
  // 更新状态栏
  updateStatusBar();
}

// 处理繁殖
function handleReproduction() {
  const newCreatures = [];
  
  for (const creature of creatures) {
    // 检查是否怀孕期结束，生出后代
    if (creature.pregnancyTimer === 0 && creature.reproduce) {
      // 检查是否刚刚完成怀孕（通过检查是否有 _wasPregnant 标记）
      if (creature._wasPregnant) {
        const child = creature.reproduce();
        if (child) {
          newCreatures.push(child);
        }
        creature._wasPregnant = false;
      }
    }
    
    // 检查是否可以开始怀孕
    if (creature.canReproduce && creature.canReproduce() && creature.startPregnancy) {
      if (creature.startPregnancy()) {
        creature._wasPregnant = true; // 标记正在怀孕
      }
    }
    
    // 更新怀孕状态标记
    if (creature.pregnancyTimer > 0) {
      creature._wasPregnant = true;
    }
  }
  
  creatures.push(...newCreatures);
}

// 更新代数
function updateGeneration() {
  let maxGen = 0;
  for (const creature of creatures) {
    if (creature.generation > maxGen) {
      maxGen = creature.generation;
    }
  }
  generation = maxGen;
}

// ==================== 绘制 ====================
function draw() {
  // 清空画布
  ctx.fillStyle = '#0f0f23';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // ----- 1. 绘制游戏世界（应用摄像机变换） -----
  ctx.save();
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(-camera.x, -camera.y);
  
  // 绘制世界边界 - 移除背景色，使整个世界无边界
  /*
  ctx.fillStyle = '#16162a'; // 稍微亮一点的背景
  ctx.fillRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
  */
  
  // 原有的线框边界移除，或者改为非常淡的虚线（可选）
  /*
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 5 / camera.zoom;
  ctx.strokeRect(0, 0, CONFIG.WORLD_WIDTH, CONFIG.WORLD_HEIGHT);
  */
  
  // 绘制网格背景（可选）
  drawGrid();
  
  // 绘制信息素（在食物下层）
  if (pheromoneGrid) {
    pheromoneGrid.draw(ctx);
  }
  
  // 绘制世界和植物
  // 注意：不再检查 world.isInBounds，因为植物可能在任何地方
  if (world) {
    world.draw(ctx);
  }
  
  // 绘制蚁巢
  for (const nest of antNests) {
    nest.draw(ctx);
  }
  
  // 绘制所有生物
  for (const creature of creatures) {
    if (creature.isAlive) {
      creature.draw(ctx);
    }
  }
  
  ctx.restore();
  
  // ----- 2. 绘制 UI（屏幕坐标，不应用摄像机变换） -----
  
  // 如果没有生物，显示提示
  if (creatures.length === 0 && antNests.length === 0 && !dragState.isDragging) {
    ctx.fillStyle = '#444';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('点击地图放置物种 | 滚轮缩放 | 右键拖动地图', canvas.width / 2, canvas.height / 2);
  }
  
  // 绘制拖拽预览
  if (dragState.isDragging) {
    drawDragPreview();
  }
}

// 绘制拖拽预览
function drawDragPreview() {
  ctx.save();
  
  // 绘制虚线从起点到当前位置
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.moveTo(dragState.startX, dragState.startY);
  ctx.lineTo(dragState.currentX, dragState.currentY);
  ctx.stroke();
  ctx.setLineDash([]);
  
  // 在目标位置绘制预览
  ctx.globalAlpha = 0.6;
  
  // 绘制预览圆圈表示放置区域
  ctx.fillStyle = 'rgba(233, 69, 96, 0.2)';
  ctx.strokeStyle = '#e94560';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(dragState.currentX, dragState.currentY, 30 + dragState.count * 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  
  // 显示将要生成的数量
  ctx.globalAlpha = 1;
  ctx.font = 'bold 16px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 3;
  const countText = `×${dragState.count}`;
  ctx.strokeText(countText, dragState.currentX + 25, dragState.currentY - 20);
  ctx.fillText(countText, dragState.currentX + 25, dragState.currentY - 20);
  
  ctx.restore();
}

// 绘制网格背景
function drawGrid() {
  ctx.strokeStyle = '#1a1a3a';
  // 同样根据缩放调整网格线宽
  ctx.lineWidth = 1 / camera.zoom;
  
  const gridSize = 50;
  
  // 计算当前屏幕可见的世界坐标范围
  const viewLeft = camera.x;
  const viewTop = camera.y;
  const viewRight = camera.x + canvas.width / camera.zoom;
  const viewBottom = camera.y + canvas.height / camera.zoom;
  
  // 对齐网格
  const startX = Math.floor(viewLeft / gridSize) * gridSize;
  const startY = Math.floor(viewTop / gridSize) * gridSize;
  
  // 垂直线
  for (let x = startX; x <= viewRight; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, viewTop);
    ctx.lineTo(x, viewBottom);
    ctx.stroke();
  }
  
  // 水平线
  for (let y = startY; y <= viewBottom; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(viewLeft, y);
    ctx.lineTo(viewRight, y);
    ctx.stroke();
  }
  
  // 可选：绘制原点或中心十字线，作为参考
  const centerX = CONFIG.WORLD_WIDTH / 2;
  const centerY = CONFIG.WORLD_HEIGHT / 2;
  
  if (centerX >= viewLeft && centerX <= viewRight) {
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.beginPath();
    ctx.moveTo(centerX, viewTop);
    ctx.lineTo(centerX, viewBottom);
    ctx.stroke();
  }
  
  if (centerY >= viewTop && centerY <= viewBottom) {
    ctx.strokeStyle = '#2a2a4a';
    ctx.lineWidth = 2 / camera.zoom;
    ctx.beginPath();
    ctx.moveTo(viewLeft, centerY);
    ctx.lineTo(viewRight, centerY);
    ctx.stroke();
  }
}

// 阻止右键菜单
window.addEventListener('contextmenu', e => e.preventDefault());

// ==================== 启动游戏 ====================
window.addEventListener('DOMContentLoaded', init);
