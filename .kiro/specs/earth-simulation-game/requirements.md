# Requirements Document

## Introduction

这是一个生物进化模拟游戏，包含四种物种形成两条食物链。蚂蚁使用蚁群算法协作觅食，鸟类使用鸟群算法成群飞行。玩家可以放置不同物种，观察它们的生存、繁殖和进化。

## Requirements

### Requirement 1: 游戏世界

**User Story:** 作为玩家，我想要一个有资源的世界，以便物种可以在其中生存。

#### Acceptance Criteria

1. WHEN 游戏启动 THEN 系统 SHALL 生成一个2D世界
2. WHEN 世界生成时 THEN 系统 SHALL 随机分布食物（植物/种子）
3. WHEN 时间流逝 THEN 食物 SHALL 逐渐再生

### Requirement 2: 物种系统（拖拽放置）

**User Story:** 作为玩家，我想要通过拖拽方式放置物种，以便获得更直观有趣的交互体验。

#### Acceptance Criteria

1. WHEN 游戏运行时 THEN 系统 SHALL 在屏幕边缘显示四种物种图标：蚂蚁、食蚁兽、鸟、蛇
2. WHEN 玩家从边缘拖拽物种图标到地图 THEN 系统 SHALL 在释放位置生成该物种
3. WHEN 玩家拖拽距离越长 THEN 系统 SHALL 生成更多数量的该物种（1-10只）
4. WHEN 拖拽过程中 THEN 系统 SHALL 显示预览效果和将要生成的数量
5. WHEN 放置蚂蚁时 THEN 系统 SHALL 创建蚁巢作为蚂蚁的基地

### Requirement 3: 蚂蚁行为（蚁群算法）

**User Story:** 作为玩家，我想要看到蚂蚁通过信息素协作，以便理解蚁群算法。

#### Acceptance Criteria

1. WHEN 蚂蚁寻找食物时 THEN 蚂蚁 SHALL 倾向于跟随信息素浓度高的路径
2. WHEN 蚂蚁找到食物时 THEN 蚂蚁 SHALL 携带食物返回蚁巢
3. WHEN 蚂蚁移动时 THEN 蚂蚁 SHALL 在路径上释放信息素
4. WHEN 时间流逝 THEN 信息素 SHALL 逐渐蒸发
5. WHEN 蚂蚁发现天敌 THEN 蚂蚁 SHALL 尝试逃跑

### Requirement 4: 鸟类行为（鸟群算法）

**User Story:** 作为玩家，我想要看到鸟类成群飞行，以便理解鸟群算法。

#### Acceptance Criteria

1. WHEN 鸟类移动时 THEN 鸟类 SHALL 遵循三条规则：分离、对齐、聚合
2. WHEN 鸟类饥饿时 THEN 鸟类 SHALL 寻找食物（种子或蚂蚁）
3. WHEN 鸟类发现天敌 THEN 鸟群 SHALL 一起逃跑
4. WHEN 鸟类接近边界 THEN 鸟类 SHALL 转向

### Requirement 5: 捕食者行为

**User Story:** 作为玩家，我想要看到捕食者捕猎，以便观察食物链。

#### Acceptance Criteria

1. WHEN 食蚁兽饥饿时 THEN 食蚁兽 SHALL 寻找并追捕蚂蚁
2. WHEN 蛇饥饿时 THEN 蛇 SHALL 寻找并追捕鸟类或蚂蚁
3. WHEN 捕食者捕获猎物 THEN 捕食者 SHALL 获得能量

### Requirement 6: 繁殖与进化

**User Story:** 作为玩家，我想要看到物种繁殖和进化，以便观察自然选择。

#### Acceptance Criteria

1. WHEN 生物能量充足 THEN 生物 SHALL 可以繁殖
2. WHEN 繁殖时 THEN 后代 SHALL 继承父母基因并产生变异
3. WHEN 生物能量耗尽 THEN 生物 SHALL 死亡

### Requirement 7: 游戏控制

**User Story:** 作为玩家，我想要控制游戏运行。

#### Acceptance Criteria

1. WHEN 玩家按空格键 THEN 系统 SHALL 暂停/继续
2. WHEN 玩家点击生物 THEN 系统 SHALL 显示该生物信息
3. WHEN 玩家按R键 THEN 系统 SHALL 重置游戏
