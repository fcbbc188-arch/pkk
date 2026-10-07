/**
 * 自定义地图编辑器模块
 * 支持鼠标/触控拖拽涂抹绘制、图块笔刷切换、一键清空、测试游玩与数据导入导出
 */

class MapEditor {
  constructor(game) {
    this.game = game;
    this.currentTile = TILE.BRICK;
    this.isPainting = false;
    this.editMap = null;
  }

  init() {
    this.editMap = mapManager.loadCustomMap() || mapManager.createEmptyMap();
  }

  setBrush(tileType) {
    this.currentTile = tileType;
  }

  // 坐标转换并涂抹
  paintAt(canvasX, canvasY) {
    const col = Math.floor(canvasX / TILE_SIZE);
    const row = Math.floor(canvasY / TILE_SIZE);

    if (row >= 0 && row < MAP_TILES && col >= 0 && col < MAP_TILES) {
      // 基地核心位置 (24,12) ~ (25,13) 保持为老鹰，不可涂抹破坏
      if ((row === 24 || row === 25) && (col === 12 || col === 13)) {
        return;
      }
      // 玩家出生点 (24, 8) ~ (25, 9) 提示避开，但允许自由设计
      this.editMap[row][col] = this.currentTile;
    }
  }

  clearMap() {
    this.editMap = mapManager.createEmptyMap();
  }

  saveAndPlay() {
    mapManager.saveCustomMap(this.editMap);
    this.game.startCustomGame(this.editMap);
  }

  exportJSON() {
    return JSON.stringify(this.editMap);
  }

  importJSON(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (Array.isArray(parsed) && parsed.length === MAP_TILES && parsed[0].length === MAP_TILES) {
        this.editMap = parsed;
        return true;
      }
    } catch (e) {
      console.error('Invalid map data', e);
    }
    return false;
  }

  draw(ctx) {
    // 绘制编辑中地图
    for (let r = 0; r < MAP_TILES; r++) {
      for (let c = 0; c < MAP_TILES; c++) {
        const type = this.editMap[r][c];
        if (type !== TILE.EMPTY && type !== TILE.EAGLE && type !== TILE.EAGLE_DEAD) {
          tileRenderer.drawTile(ctx, type, c * TILE_SIZE, r * TILE_SIZE);
        }
      }
    }

    // 绘制老鹰基地
    tileRenderer.drawEagle(ctx, 12 * TILE_SIZE, 24 * TILE_SIZE);

    // 绘制编辑网格参考线
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= MAP_TILES; i++) {
      ctx.beginPath();
      ctx.moveTo(i * TILE_SIZE, 0);
      ctx.lineTo(i * TILE_SIZE, CANVAS_HEIGHT);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * TILE_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * TILE_SIZE);
      ctx.stroke();
    }

    // 标记敌人出生点与玩家出生点虚线框
    ctx.strokeStyle = 'rgba(230, 57, 70, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 32, 32);
    ctx.strokeRect(12 * TILE_SIZE, 0, 32, 32);
    ctx.strokeRect(24 * TILE_SIZE, 0, 32, 32);

    ctx.strokeStyle = 'rgba(255, 183, 3, 0.7)';
    ctx.strokeRect(8 * TILE_SIZE, 24 * TILE_SIZE, 32, 32);

    ctx.restore();
  }
}
