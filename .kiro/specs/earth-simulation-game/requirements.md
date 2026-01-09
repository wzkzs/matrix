# Requirements Document

## Introduction

这是一个生物进化模拟游戏，包含四种物种形成两条食物链。蚂蚁使用蚁群算法协作觅食，鸟类使用鸟群算法（Boids）成群飞行。玩家可以在无限世界中放置不同物种，通过摄像机系统自由探索，观察它们的生存、繁殖和进化。

## Requirements

### Requirement 1: 游戏世界

**User Story:** 作为玩家，我想要一个动态扩展的无限世界，以便物种可以自由生存和迁徙。

#### Acceptance Criteria

1. WHEN 游戏启动 THEN 系统 SHALL 生成一个2D无限世界（初始2000x1500）
2. WHEN 世界生成时 THEN 系统 SHALL 随机分布植物作为食物源
3. WHEN 时间流逝 THEN 植物 SHALL 逐渐再生（生成率0.5，最大120株）
4. WHEN 摄像机移动 THEN 世界边界 SHALL 动态扩展以适应视野
5. WHEN 生物死亡 THEN 系统 SHALL 在尸体位置生成1-3株植物（80%概率）

### Requirement 2: 物种系统

**User Story:** 作为玩家，我想要通过点击方式放置物种，以便获得直观的交互体验。

#### Acceptance Criteria

1. WHEN 游戏运行时 THEN 系统 SHALL 在顶部工具栏显示四种物种按钮：蚂蚁、鸟、食蚁兽、蛇
2. WHEN 玩家选择物种并点击地图 THEN 系统 SHALL 在点击位置生成该物种
3. WHEN 放置蚂蚁时 IF 附近100像素内无蚁巢 THEN 系统 SHALL 创建新蚁巢
4. WHEN 放置蚂蚁时 IF 附近有蚁巢 THEN 蚂蚁 SHALL 归属于该蚁巢
5. WHEN 生物生成时 THEN 系统 SHALL 为其分配基因（速度、感知、体型）

### Requirement 3: 蚂蚁行为（蚁群算法）

**User Story:** 作为玩家，我想要看到蚂蚁通过信息素协作觅食，以便理解蚁群算法。

#### Acceptance Criteria

1. WHEN 蚂蚁寻找食物时 THEN 蚂蚁 SHALL 倾向于跟随信息素浓度高的路径
2. WHEN 蚂蚁找到植物时 THEN 蚂蚁 SHALL 携带食物返回蚁巢
3. WHEN 蚂蚁携带食物移动时 THEN 蚂蚁 SHALL 在路径上释放双倍信息素
4. WHEN 时间流逝 THEN 信息素 SHALL 以0.995的保留率逐渐蒸发
5. WHEN 蚂蚁发现天敌（食蚁兽或鸟） THEN 蚂蚁 SHALL 逃跑30帧
6. WHEN 蚂蚁返回蚁巢 THEN 蚂蚁 SHALL 在巢内休息60帧后离开
7. WHEN 蚂蚁靠近其他蚂蚁 THEN 蚂蚁 SHALL 执行分离行为避免重叠
8. WHEN 蚂蚁在蚁巢附近或能量低时 THEN 蚂蚁 SHALL 倾向于漫游而非跟随信息素

### Requirement 4: 鸟类行为（鸟群算法）

**User Story:** 作为玩家，我想要看到鸟类成群飞行并有栖息行为，以便理解鸟群算法。

#### Acceptance Criteria

1. WHEN 鸟类飞行时 THEN 鸟类 SHALL 遵循Boids三规则：分离、对齐、聚合
2. WHEN 鸟类饥饿时 THEN 鸟类 SHALL 寻找植物作为食物
3. WHEN 鸟类极度饥饿（能量<30%）时 THEN 鸟类 SHALL 也会捕食蚂蚁
4. WHEN 鸟类发现天敌（蛇） THEN 鸟类 SHALL 以3倍力度逃跑
5. WHEN 蛇处于伏击状态 THEN 鸟类 SHALL 仅在30%感知范围内才能发现
6. WHEN 鸟类疲劳度>50 THEN 鸟类 SHALL 有概率降落栖息
7. WHEN 鸟类栖息时 THEN 鸟类 SHALL 恢复疲劳和能量
8. WHEN 鸟类栖息时发现天敌 THEN 鸟类 SHALL 立即起飞

### Requirement 5: 捕食者行为

**User Story:** 作为玩家，我想要看到不同类型的捕食者使用不同策略捕猎，以便观察食物链。

#### Acceptance Criteria

1. WHEN 食蚁兽饥饿时 THEN 食蚁兽 SHALL 寻找并追捕蚂蚁
2. WHEN 食蚁兽未发现猎物时 THEN 食蚁兽 SHALL 平滑漫游
3. WHEN 食蚁兽捕获蚂蚁 THEN 食蚁兽 SHALL 获得40%食物能量
4. WHEN 食蚁兽能量消耗过快 THEN 食蚁兽 SHALL 降低移动速度（疲劳系统）
5. WHEN 蛇漫游一段时间后 THEN 蛇 SHALL 进入伏击状态（200-500帧）
6. WHEN 蛇伏击时发现鸟类（150像素内） THEN 蛇 SHALL 以3.5倍速度突袭
7. WHEN 蛇突袭超时或捕获猎物 THEN 蛇 SHALL 进入恢复状态
8. WHEN 蛇移动时 THEN 蛇身体 SHALL 呈现蛇形波动效果（24节身体段）

### Requirement 6: 繁殖与进化

**User Story:** 作为玩家，我想要看到物种繁殖和进化，以便观察自然选择。

#### Acceptance Criteria

1. WHEN 生物能量达到阈值 THEN 生物 SHALL 可以开始怀孕
2. WHEN 怀孕期结束 THEN 生物 SHALL 生成后代
3. WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并以20%概率产生30%幅度变异
4. WHEN 生物能量耗尽 THEN 生物 SHALL 死亡
5. WHEN 捕食者繁殖 THEN 捕食者 SHALL 需要更高能量阈值（1.8倍）
6. WHEN 蚁巢储存食物>=2 THEN 蚁巢 SHALL 可以生成新蚂蚁

### Requirement 7: 摄像机系统

**User Story:** 作为玩家，我想要自由探索无限世界，以便观察不同区域的生态。

#### Acceptance Criteria

1. WHEN 玩家滚动鼠标滚轮 THEN 摄像机 SHALL 以鼠标位置为中心缩放（0.2-3倍）
2. WHEN 玩家右键/中键拖拽 THEN 摄像机 SHALL 平移视野
3. WHEN 玩家Shift+左键拖拽 THEN 摄像机 SHALL 平移视野
4. WHEN 玩家双指触摸 THEN 摄像机 SHALL 支持捏合缩放
5. WHEN 玩家单指触摸拖拽 THEN 摄像机 SHALL 平移视野

### Requirement 8: 游戏控制

**User Story:** 作为玩家，我想要控制游戏运行。

#### Acceptance Criteria

1. WHEN 玩家按空格键 THEN 系统 SHALL 暂停/继续游戏
2. WHEN 玩家按R键 THEN 系统 SHALL 重置游戏
3. WHEN 玩家按P键 THEN 系统 SHALL 切换信息素可视化显示
4. WHEN 游戏运行时 THEN 状态栏 SHALL 显示各物种数量和当前代数
