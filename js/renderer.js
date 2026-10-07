/**
 * 像素级瓦片渲染引擎
 * 绘制高清晰复古红砖、精钢护板、波纹水面、遮挡树林、反光冰面以及生动的老鹰基地
 */

class TileRenderer {
  constructor() {
    this.waterFrame = 0;
  }

  update(dt) {
    this.waterFrame += dt * 3;
  }

  // 绘制单个微图块 (16 x 16 px)
  drawTile(ctx, type, x, y) {
    switch (type) {
      case TILE.BRICK:
        this.drawBrick(ctx, x, y);
        break;
      case TILE.STEEL:
        this.drawSteel(ctx, x, y);
        break;
      case TILE.WATER:
        this.drawWater(ctx, x, y);
        break;
      case TILE.BUSH:
        this.drawBush(ctx, x, y);
        break;
      case TILE.ICE:
        this.drawIce(ctx, x, y);
        break;
      case TILE.EAGLE:
        // 老鹰占 2x2，通常统一在其左上角绘制，此处由专门函数处理
        break;
      case TILE.EAGLE_DEAD:
        break;
    }
  }

  // 🧱 经典红砖瓦片
  drawBrick(ctx, x, y) {
    ctx.fillStyle = '#b7410e';
    ctx.fillRect(x, y, 16, 16);

    // 砖缝纹路
    ctx.fillStyle = '#222222';
    ctx.fillRect(x, y + 7, 16, 2);
    ctx.fillRect(x, y + 15, 16, 1);

    // 竖向灰缝错落
    ctx.fillRect(x + 7, y, 2, 7);
    ctx.fillRect(x + 3, y + 8, 2, 8);
    ctx.fillRect(x + 11, y + 8, 2, 8);

    // 砖面高光与暗影
    ctx.fillStyle = '#d95a2b';
    ctx.fillRect(x + 1, y + 1, 5, 2);
    ctx.fillRect(x + 9, y + 1, 6, 2);
    ctx.fillRect(x + 1, y + 9, 2, 2);
    ctx.fillRect(x + 5, y + 9, 5, 2);
  }

  // 🛡️ 钢板铁墙
  drawSteel(ctx, x, y) {
    ctx.fillStyle = '#ced4da';
    ctx.fillRect(x, y, 16, 16);

    // 斜角金属高光
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(x, y, 16, 2);
    ctx.fillRect(x, y, 2, 16);

    // 金属阴影
    ctx.fillStyle = '#6c757d';
    ctx.fillRect(x, y + 14, 16, 2);
    ctx.fillRect(x + 14, y, 2, 16);

    // 铆钉
    ctx.fillStyle = '#495057';
    ctx.fillRect(x + 3, y + 3, 2, 2);
    ctx.fillRect(x + 11, y + 3, 2, 2);
    ctx.fillRect(x + 3, y + 11, 2, 2);
    ctx.fillRect(x + 11, y + 11, 2, 2);
  }

  // 🌊 动态波纹水面
  drawWater(ctx, x, y) {
    ctx.fillStyle = '#1d3557';
    ctx.fillRect(x, y, 16, 16);

    // 动态波浪光纹
    const offset = Math.floor(this.waterFrame) % 4;
    ctx.fillStyle = '#457b9d';
    ctx.fillRect(x, y + 3 + offset, 16, 2);
    ctx.fillStyle = '#a8dadc';
    ctx.fillRect(x + ((offset * 4) % 16), y + 9, 6, 2);
  }

  // 🌿 浓密草丛（可遮挡坦克）
  drawBush(ctx, x, y) {
    ctx.fillStyle = '#2d6a4f';
    ctx.fillRect(x, y, 16, 16);

    // 树叶点缀
    ctx.fillStyle = '#52b788';
    ctx.fillRect(x + 2, y + 2, 4, 4);
    ctx.fillRect(x + 10, y + 2, 4, 4);
    ctx.fillRect(x + 6, y + 8, 4, 4);
    ctx.fillRect(x + 2, y + 12, 3, 3);
    ctx.fillRect(x + 11, y + 11, 3, 3);

    ctx.fillStyle = '#1b4332';
    ctx.fillRect(x + 6, y + 2, 4, 3);
    ctx.fillRect(x + 2, y + 8, 4, 3);
  }

  // 🧊 光滑冰面
  drawIce(ctx, x, y) {
    ctx.fillStyle = '#e0fbfc';
    ctx.fillRect(x, y, 16, 16);

    // 冰晶斜纹
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(x + 3, y + 1);
    ctx.lineTo(x + 14, y + 12);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.strokeStyle = '#98c1d9';
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 8);
    ctx.lineTo(x + 8, y + 15);
    ctx.stroke();
  }

  // 🦅 老鹰基地（完好，占 32x32 区域）
  drawEagle(ctx, x, y) {
    ctx.save();
    // 底座
    ctx.fillStyle = '#14213d';
    ctx.fillRect(x, y, 32, 32);

    // 金黄色双翼与雄鹰轮廓
    ctx.fillStyle = '#fca311';
    // 鹰翼
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 6);
    ctx.lineTo(x + 28, y + 14);
    ctx.lineTo(x + 24, y + 26);
    ctx.lineTo(x + 16, y + 22);
    ctx.lineTo(x + 8, y + 26);
    ctx.lineTo(x + 4, y + 14);
    ctx.closePath();
    ctx.fill();

    // 鹰头
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x + 16, y + 10, 5, 0, Math.PI * 2);
    ctx.fill();

    // 鹰喙
    ctx.fillStyle = '#e63946';
    ctx.beginPath();
    ctx.moveTo(x + 16, y + 12);
    ctx.lineTo(x + 18, y + 16);
    ctx.lineTo(x + 14, y + 16);
    ctx.closePath();
    ctx.fill();

    // 眼睛
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 15, y + 9, 2, 2);

    ctx.restore();
  }

  // 💥 损毁老鹰基地（废墟）
  drawDeadEagle(ctx, x, y) {
    ctx.save();
    ctx.fillStyle = '#212529';
    ctx.fillRect(x, y, 32, 32);

    // 废墟瓦砾
    ctx.fillStyle = '#495057';
    ctx.fillRect(x + 4, y + 12, 10, 8);
    ctx.fillRect(x + 16, y + 16, 12, 10);
    ctx.fillRect(x + 10, y + 6, 8, 6);

    // 残破旗帜/枯骨十字
    ctx.strokeStyle = '#e63946';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 8);
    ctx.lineTo(x + 24, y + 24);
    ctx.moveTo(x + 24, y + 8);
    ctx.lineTo(x + 8, y + 24);
    ctx.stroke();

    ctx.restore();
  }
}

const tileRenderer = new TileRenderer();
