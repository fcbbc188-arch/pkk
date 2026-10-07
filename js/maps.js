/**
 * 经典战役关卡地图与自定义地图管理器
 * 地图尺寸为 26 x 26 微图块 (TILE_SIZE = 16px)
 * 老鹰基地默认位于第 24~25 行，第 12~13 列
 */

class MapManager {
  constructor() {
    this.totalBuiltinStages = 5;
    this.customMapKey = 'tank_battle_custom_map';
  }

  // 创建初始空白地图矩阵
  createEmptyMap() {
    const map = [];
    for (let r = 0; r < MAP_TILES; r++) {
      const row = new Array(MAP_TILES).fill(TILE.EMPTY);
      map.push(row);
    }
    // 默认布置老鹰基地 (2x2)
    map[24][12] = TILE.EAGLE;
    map[24][13] = TILE.EAGLE;
    map[25][12] = TILE.EAGLE;
    map[25][13] = TILE.EAGLE;

    // 默认老鹰周围保护砖墙
    this.setBaseFortification(map, TILE.BRICK);
    return map;
  }

  // 强化或还原基地防护墙（红砖 / 铁墙）
  setBaseFortification(map, tileType) {
    const wallCoords = [
      [23, 11], [23, 12], [23, 13], [23, 14],
      [24, 11], [24, 14],
      [25, 11], [25, 14]
    ];
    wallCoords.forEach(([r, c]) => {
      // 只有在不是老鹰本身时才覆盖
      if (map[r][c] !== TILE.EAGLE && map[r][c] !== TILE.EAGLE_DEAD) {
        map[r][c] = tileType;
      }
    });
  }

  // 复制地图矩阵
  cloneMap(source) {
    return source.map(row => [...row]);
  }

  // 关卡数据生成器
  getStageMap(stageIndex) {
    const map = this.createEmptyMap();

    switch ((stageIndex - 1) % 5 + 1) {
      case 1: // 经典第一关：标志性对称红砖纵列与小段铁墙
        this.fillBlock(map, 2, 4, 10, 2, TILE.BRICK);
        this.fillBlock(map, 2, 8, 10, 2, TILE.BRICK);
        this.fillBlock(map, 2, 16, 10, 2, TILE.BRICK);
        this.fillBlock(map, 2, 20, 10, 2, TILE.BRICK);

        this.fillBlock(map, 14, 4, 8, 2, TILE.BRICK);
        this.fillBlock(map, 14, 8, 8, 2, TILE.BRICK);
        this.fillBlock(map, 14, 16, 8, 2, TILE.BRICK);
        this.fillBlock(map, 14, 20, 8, 2, TILE.BRICK);

        // 中央铁墙与红砖走廊
        this.fillBlock(map, 12, 11, 2, 4, TILE.STEEL);
        this.fillBlock(map, 6, 12, 4, 2, TILE.BRICK);

        // 两侧横向砖墙
        this.fillBlock(map, 14, 0, 2, 3, TILE.STEEL);
        this.fillBlock(map, 14, 23, 2, 3, TILE.STEEL);
        break;

      case 2: // 第二关：水域河流防线与草丛掩体
        // 横向水流隔离带
        this.fillBlock(map, 8, 0, 2, 10, TILE.WATER);
        this.fillBlock(map, 8, 16, 2, 10, TILE.WATER);

        // 密集草丛
        this.fillBlock(map, 4, 4, 3, 5, TILE.BUSH);
        this.fillBlock(map, 4, 17, 3, 5, TILE.BUSH);
        this.fillBlock(map, 16, 8, 4, 10, TILE.BUSH);

        // 砖墙与防御铁桩
        this.fillBlock(map, 2, 12, 5, 2, TILE.BRICK);
        this.fillBlock(map, 12, 3, 6, 2, TILE.BRICK);
        this.fillBlock(map, 12, 21, 6, 2, TILE.BRICK);
        this.fillBlock(map, 14, 12, 2, 2, TILE.STEEL);
        this.fillBlock(map, 18, 5, 2, 2, TILE.STEEL);
        this.fillBlock(map, 18, 19, 2, 2, TILE.STEEL);
        break;

      case 3: // 第三关：冰原滑道与迷宫突袭
        // 大面积冰面加速滑行
        this.fillBlock(map, 6, 2, 4, 6, TILE.ICE);
        this.fillBlock(map, 6, 18, 4, 6, TILE.ICE);
        this.fillBlock(map, 14, 10, 4, 6, TILE.ICE);

        // 迷宫纵横
        this.fillBlock(map, 2, 10, 8, 2, TILE.BRICK);
        this.fillBlock(map, 2, 14, 8, 2, TILE.BRICK);
        this.fillBlock(map, 12, 2, 2, 7, TILE.BRICK);
        this.fillBlock(map, 12, 17, 2, 7, TILE.BRICK);

        this.fillBlock(map, 18, 2, 4, 2, TILE.STEEL);
        this.fillBlock(map, 18, 22, 4, 2, TILE.STEEL);
        this.fillBlock(map, 16, 12, 3, 2, TILE.WATER);
        break;

      case 4: // 第四关：铁壁要塞（重火力与破坏试炼）
        this.fillBlock(map, 3, 3, 2, 4, TILE.STEEL);
        this.fillBlock(map, 3, 19, 2, 4, TILE.STEEL);
        this.fillBlock(map, 7, 7, 2, 12, TILE.BRICK);
        this.fillBlock(map, 11, 4, 6, 2, TILE.WATER);
        this.fillBlock(map, 11, 20, 6, 2, TILE.WATER);

        this.fillBlock(map, 13, 8, 4, 3, TILE.BUSH);
        this.fillBlock(map, 13, 15, 4, 3, TILE.BUSH);
        this.fillBlock(map, 18, 8, 2, 10, TILE.BRICK);
        this.fillBlock(map, 20, 4, 2, 2, TILE.STEEL);
        this.fillBlock(map, 20, 20, 2, 2, TILE.STEEL);
        break;

      case 5: // 第五关：决战阵地（全地形终极对决）
        // 环形工事
        this.fillBlock(map, 4, 6, 2, 14, TILE.BRICK);
        this.fillBlock(map, 6, 4, 10, 2, TILE.BRICK);
        this.fillBlock(map, 6, 20, 10, 2, TILE.BRICK);

        this.fillBlock(map, 8, 8, 6, 2, TILE.WATER);
        this.fillBlock(map, 8, 16, 6, 2, TILE.WATER);

        this.fillBlock(map, 10, 11, 4, 4, TILE.BUSH);
        this.fillBlock(map, 16, 6, 3, 3, TILE.ICE);
        this.fillBlock(map, 16, 17, 3, 3, TILE.ICE);

        this.fillBlock(map, 18, 2, 2, 3, TILE.STEEL);
        this.fillBlock(map, 18, 21, 2, 3, TILE.STEEL);
        this.fillBlock(map, 2, 12, 2, 2, TILE.STEEL);
        break;
    }

    return map;
  }

  // 区域填充辅助函数
  fillBlock(map, startR, startC, height, width, tileType) {
    for (let r = startR; r < startR + height; r++) {
      for (let c = startC; c < startC + width; c++) {
        if (r >= 0 && r < MAP_TILES && c >= 0 && c < MAP_TILES) {
          // 不允许覆盖老鹰核心
          if (map[r][c] !== TILE.EAGLE && map[r][c] !== TILE.EAGLE_DEAD) {
            map[r][c] = tileType;
          }
        }
      }
    }
  }

  // 保存自定义地图到本地
  saveCustomMap(map) {
    try {
      localStorage.setItem(this.customMapKey, JSON.stringify(map));
      return true;
    } catch (e) {
      console.error('Failed to save custom map', e);
      return false;
    }
  }

  // 读取自定义地图
  loadCustomMap() {
    try {
      const data = localStorage.getItem(this.customMapKey);
      if (data) {
        return JSON.parse(data);
      }
    } catch (e) {
      console.error('Failed to load custom map', e);
    }
    return null;
  }
}

const mapManager = new MapManager();
