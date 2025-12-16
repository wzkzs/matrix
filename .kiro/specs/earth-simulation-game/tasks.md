# Implementation Plan

- [x] 1. 搭建项目基础





  - 创建 index.html 包含 Canvas 和工具栏布局
  - 创建 style.css 基础样式
  - 创建 main.js 游戏主循环和事件处理
  - _Requirements: 1.1, 7.1, 7.3_

- [x] 2. 实现世界和食物系统





  - [x] 2.1 创建 World 类


    - 实现世界初始化和边界
    - 实现食物生成和再生逻辑
    - 实现 draw() 绘制世界和食物
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. 实现信息素系统






  - [x] 3.1 创建 PheromoneGrid 类

    - 实现信息素网格数据结构
    - 实现 deposit() 释放信息素
    - 实现 evaporate() 蒸发逻辑
    - 实现 getStrength() 获取浓度
    - 实现 draw() 可视化信息素（可选显示）
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 4. 实现蚂蚁（蚁群算法）




  - [x] 4.1 创建 Ant 类基础


    - 实现蚂蚁构造函数和基础属性
    - 实现移动和能量消耗
    - 实现 draw() 绘制蚂蚁
    - _Requirements: 2.1_

  - [x] 4.2 实现蚁群算法行为


    - 实现 followPheromone() 跟随信息素
    - 实现 depositPheromone() 释放信息素
    - 实现 returnToNest() 携带食物返回蚁巢
    - 实现逃跑行为
    - _Requirements: 3.1, 3.2, 3.3, 3.5_


  - [x] 4.3 创建 AntNest 类

    - 实现蚁巢位置和食物存储
    - 实现从蚁巢生成新蚂蚁
    - _Requirements: 2.3_

- [x] 5. 实现鸟类（鸟群算法）




  - [x] 5.1 创建 Bird 类基础


    - 实现鸟构造函数和基础属性
    - 实现移动和能量消耗
    - 实现 draw() 绘制鸟（三角形表示方向）
    - _Requirements: 2.1_

  - [x] 5.2 实现 Boids 三规则

    - 实现 separation() 分离规则
    - 实现 alignment() 对齐规则
    - 实现 cohesion() 聚合规则
    - 实现 flock() 组合三规则
    - _Requirements: 4.1_


  - [x] 5.3 实现鸟的觅食和逃跑
    - 实现寻找食物（种子和蚂蚁）
    - 实现发现天敌时群体逃跑
    - 实现边界转向
    - _Requirements: 4.2, 4.3, 4.4_

- [x] 6. 实现捕食者





  - [x] 6.1 创建 Anteater 类（食蚁兽）


    - 实现基础属性和移动
    - 实现追捕蚂蚁逻辑
    - 实现 draw() 绘制
    - _Requirements: 2.1, 5.1_


  - [x] 6.2 创建 Snake 类（蛇）

    - 实现基础属性和移动
    - 实现追捕鸟和蚂蚁逻辑
    - 实现 draw() 绘制
    - _Requirements: 2.1, 5.2_

- [x] 7. 实现繁殖与进化



  - [x] 7.1 实现基因系统


    - 创建基因结构（speed, perception, size）
    - 实现基因变异逻辑
    - _Requirements: 6.2_


  - [x] 7.2 实现繁殖机制

    - 实现能量阈值判断
    - 实现后代生成和基因继承
    - 实现死亡逻辑
    - _Requirements: 6.1, 6.2, 6.3_

- [x] 8. 实现 UI 和交互






  - [x] 8.1 创建边缘物种图标

    - 在画布四个角落绘制物种图标（蚂蚁、鸟、食蚁兽、蛇）
    - 实现图标的悬停效果
    - _Requirements: 2.1_


  - [x] 8.2 实现拖拽放置交互
    - 实现从图标开始拖拽的检测
    - 拖拽过程中显示虚线和预览
    - 根据拖拽距离计算生成数量（1-10只）
    - 释放时在目标位置生成物种
    - _Requirements: 2.2, 2.3, 2.4_

  - [x] 8.3 创建状态显示


    - 在底部显示各物种数量和代数
    - 显示操作提示（空格=暂停，R=重置）
    - _Requirements: 7.2_


  - [x] 8.4 实现键盘控制

    - 空格键暂停/继续
    - R键重置
    - _Requirements: 7.1, 7.3_

- [x] 9. 集成测试与优化




  - [x] 9.1 集成所有模块


    - 在 main.js 中整合所有组件
    - 确保食物链正常运作
    - 测试蚁群和鸟群算法效果
    - _Requirements: 全部_
