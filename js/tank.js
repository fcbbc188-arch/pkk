/**
 * 坦克实体类体系：BaseTank, PlayerTank, EnemyTank
 * 包含：平滑移动、微网格对齐自适应、地形碰撞检测、冰面打滑、智能AI寻路、火炮发射
 */

class BaseTank {
  constructor(x, y, size = TANK_SIZE) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.direction = DIR.UP;
    this.speed = 1.5;
    this.isAlive = true;
    this.treadFrame = 0; // 履带滚动帧动效
    this.reloadTimer = 0;
  }

  getBounds() {
    return {
      left: this.x,
      right: this.x + this.size,
      top: this.y,
      bottom: this.y + this.size
    };
  }

  // 检测在当前坐标与方向下是否能移动到目标位置
  canMoveTo(newX, newY, map, otherTanks = []) {
    // 边界碰撞
    if (newX < 0 || newX + this.size > CANVAS_WIDTH || newY < 0 || newY + this.size > CANVAS_HEIGHT) {
      return false;
    }

    // 地形碰撞（采样 4 个角和边框关键点）
    const samplePoints = [
      { x: newX + 1, y: newY + 1 },
      { x: newX + this.size - 2, y: newY + 1 },
      { x: newX + 1, y: newY + this.size - 2 },
      { x: newX + this.size - 2, y: newY + this.size - 2 },
      { x: newX + this.size / 2, y: newY + 1 },
      { x: newX + this.size / 2, y: newY + this.size - 2 },
      { x: newX + 1, y: newY + this.size / 2 },
      { x: newX + this.size - 2, y: newY + this.size / 2 }
    ];

    for (const p of samplePoints) {
      const tileCol = Math.floor(p.x / TILE_SIZE);
      const tileRow = Math.floor(p.y / TILE_SIZE);

      if (tileRow >= 0 && tileRow < MAP_TILES && tileCol >= 0 && tileCol < MAP_TILES) {
        const tileType = map[tileRow][tileCol];
        // 砖块、铁墙、水面、基地均不可驶入
        if (
          tileType === TILE.BRICK ||
          tileType === TILE.STEEL ||
          tileType === TILE.WATER ||
          tileType === TILE.EAGLE ||
          tileType === TILE.EAGLE_DEAD
        ) {
          return false;
        }
      }
    }

    // 与其他活跃坦克碰撞
    const box = { left: newX, right: newX + this.size, top: newY, bottom: newY + this.size };
    for (const other of otherTanks) {
      if (other !== this && other.isAlive) {
        const ob = other.getBounds();
        if (box.left < ob.right && box.right > ob.left && box.top < ob.bottom && box.bottom > ob.top) {
          return false;
        }
      }
    }

    return true;
  }

  // 经典 FC 网格平滑微对齐（拐弯时自动吸附对齐到 16px 或 8px 网格，避免卡拐角）
  alignToGrid(dir) {
    const halfTile = TILE_SIZE / 2; // 8px
    if (dir === DIR.UP || dir === DIR.DOWN) {
      // 竖向移动时，自动校正水平 X 坐标
      const rem = this.x % halfTile;
      if (rem < 4) this.x -= rem;
      else if (rem > halfTile - 4) this.x += (halfTile - rem);
    } else {
      // 横向移动时，自动校正垂直 Y 坐标
      const rem = this.y % halfTile;
      if (rem < 4) this.y -= rem;
      else if (rem > halfTile - 4) this.y += (halfTile - rem);
    }
  }

  // 检查是否处于冰面上
  isOnIce(map) {
    const cx = Math.floor((this.x + this.size / 2) / TILE_SIZE);
    const cy = Math.floor((this.y + this.size / 2) / TILE_SIZE);
    if (cy >= 0 && cy < MAP_TILES && cx >= 0 && cx < MAP_TILES) {
      return map[cy][cx] === TILE.ICE;
    }
    return false;
  }
}

/**
 * 玩家坦克
 */
class PlayerTank extends BaseTank {
  constructor(x = 128, y = 384) {
    super(x, y);
    this.spawnX = x;
    this.spawnY = y;
    this.tier = 1;
    this.lives = 3;
    this.shieldTime = 4.0; // 出生自带 4 秒防护罩
    this.speedBuffTime = 0;
    this.laserBuffTime = 0;
    this.score = 0;
    this.activeBullets = [];
    this.applyTierConfig();
  }

  applyTierConfig() {
    const cfg = PLAYER_TIERS[this.tier - 1];
    this.baseSpeed = cfg.speed;
    this.bulletSpeed = cfg.bulletSpeed;
    this.maxBullets = cfg.maxBullets;
    this.canBreakSteel = cfg.canBreakSteel;
  }

  upgradeTier() {
    if (this.tier < 4) {
      this.tier++;
      this.applyTierConfig();
    }
  }

  respawn() {
    this.x = this.spawnX;
    this.y = this.spawnY;
    this.direction = DIR.UP;
    this.isAlive = true;
    this.shieldTime = 4.0;
    this.speedBuffTime = 0;
    this.laserBuffTime = 0;
    this.activeBullets = [];
  }

  move(dir, map, allTanks) {
    if (!this.isAlive) return;

    if (this.direction !== dir) {
      this.direction = dir;
      this.alignToGrid(dir);
    }

    const currentSpeed = this.speedBuffTime > 0 ? this.baseSpeed * 1.4 : this.baseSpeed;
    const v = DIR_VECTORS[dir];
    const newX = this.x + v.x * currentSpeed;
    const newY = this.y + v.y * currentSpeed;

    if (this.canMoveTo(newX, newY, map, allTanks)) {
      this.x = newX;
      this.y = newY;
      this.treadFrame = (this.treadFrame + 1) % 4;
    }
  }

  shoot() {
    if (!this.isAlive) return null;
    this.activeBullets = this.activeBullets.filter(b => b.active);

    const maxCount = this.laserBuffTime > 0 ? 3 : this.maxBullets;
    if (this.activeBullets.length >= maxCount) return null;

    let bx = this.x + this.size / 2 - BULLET_SIZE / 2;
    let by = this.y + this.size / 2 - BULLET_SIZE / 2;
    const offset = this.size / 2 + 2;
    const v = DIR_VECTORS[this.direction];
    bx += v.x * offset;
    by += v.y * offset;

    const bSpeed = this.laserBuffTime > 0 ? 6.5 : this.bulletSpeed;
    const breakSteel = this.canBreakSteel || this.laserBuffTime > 0;
    const isLaser = this.laserBuffTime > 0;

    const bullet = new Bullet('player', bx, by, this.direction, bSpeed, breakSteel, isLaser);
    this.activeBullets.push(bullet);
    soundManager.playShoot();
    return bullet;
  }

  update(dt, map) {
    if (!this.isAlive) return;
    if (this.shieldTime > 0) this.shieldTime -= dt;
    if (this.speedBuffTime > 0) this.speedBuffTime -= dt;
    if (this.laserBuffTime > 0) this.laserBuffTime -= dt;

    // 冰面惯性滑行
    if (this.isOnIce(map)) {
      const v = DIR_VECTORS[this.direction];
      const newX = this.x + v.x * 0.8;
      const newY = this.y + v.y * 0.8;
      if (this.canMoveTo(newX, newY, map, [])) {
        this.x = newX;
        this.y = newY;
      }
    }
  }

  draw(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    // 旋转方向
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ctx.rotate(angles[this.direction]);

    // 绘制玩家坦克机体（经典金黄 / 战地绿）
    const primaryColor = this.tier >= 3 ? '#ffb703' : '#e09f3e';
    const secondaryColor = this.tier === 4 ? '#d90429' : '#9d0208';

    // 履带左右两侧
    ctx.fillStyle = '#222222';
    ctx.fillRect(-15, -15, 6, 30);
    ctx.fillRect(9, -15, 6, 30);

    // 履带纹路动态交替
    ctx.fillStyle = this.treadFrame < 2 ? '#666666' : '#aaaaaa';
    for (let i = -14; i < 14; i += 6) {
      ctx.fillRect(-15, i, 6, 2);
      ctx.fillRect(9, i, 6, 2);
    }

    // 主车身
    ctx.fillStyle = primaryColor;
    ctx.fillRect(-10, -11, 20, 22);

    // 炮塔座
    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();

    // 炮管（升级为三/四阶时显示双炮或加粗重炮）
    ctx.fillStyle = '#111111';
    if (this.tier >= 3) {
      // 双炮管
      ctx.fillRect(-4, -18, 3, 12);
      ctx.fillRect(1, -18, 3, 12);
    } else {
      // 单炮管
      ctx.fillRect(-2, -18, 4, 12);
    }

    // 激光状态光环特效
    if (this.laserBuffTime > 0) {
      ctx.strokeStyle = '#00f5d4';
      ctx.lineWidth = 2;
      ctx.strokeRect(-12, -12, 24, 24);
    }

    ctx.restore();

    // 绘制防护罩光环 (若处于无敌状态)
    if (this.shieldTime > 0) {
      ctx.save();
      const ringAlpha = 0.5 + 0.5 * Math.sin(Date.now() * 0.015);
      ctx.strokeStyle = `rgba(0, 245, 212, ${ringAlpha})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, 20, 0, Math.PI * 2);
      ctx.stroke();

      // 双重护盾波纹
      ctx.strokeStyle = `rgba(255, 209, 102, ${ringAlpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(this.x + this.size / 2, this.y + this.size / 2, 17, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

/**
 * 敌军坦克
 */
class EnemyTank extends BaseTank {
  constructor(x, y, type = ENEMY_TYPE.BASIC, isBonus = false) {
    super(x, y);
    this.type = type;
    this.isBonus = isBonus; // 击杀必爆道具的闪烁敌军
    this.direction = DIR.DOWN;

    const cfg = ENEMY_CONFIG[type];
    this.maxHp = cfg.hp;
    this.hp = cfg.hp;
    this.speed = cfg.speed;
    this.bulletSpeed = cfg.bulletSpeed;
    this.score = cfg.score;
    this.baseColor = cfg.color;

    this.aiChangeDirTimer = 0;
    this.aiShootTimer = 0.5 + Math.random() * 1.5;
    this.isFrozen = false;
  }

  update(dt, map, player, allTanks, onShoot) {
    if (!this.isAlive || this.isFrozen) return;

    // AI 转向计时与逻辑判定
    this.aiChangeDirTimer -= dt;
    if (this.aiChangeDirTimer <= 0) {
      this.aiDecideDirection(map, player, allTanks);
      this.aiChangeDirTimer = 1.0 + Math.random() * 2.0;
    }

    // 移动判定
    const v = DIR_VECTORS[this.direction];
    const newX = this.x + v.x * this.speed;
    const newY = this.y + v.y * this.speed;

    if (this.canMoveTo(newX, newY, map, allTanks)) {
      this.x = newX;
      this.y = newY;
      this.treadFrame = (this.treadFrame + 1) % 4;
    } else {
      // 受阻卡住时立即重新转向
      this.aiDecideDirection(map, player, allTanks);
    }

    // AI 射击判定
    this.aiShootTimer -= dt;
    if (this.aiShootTimer <= 0) {
      this.aiShoot(onShoot);
      this.aiShootTimer = 1.0 + Math.random() * 2.0;
    }
  }

  aiDecideDirection(map, player, allTanks) {
    const roll = Math.random();
    let preferredDir = null;

    // 35% 几率向老鹰基地发起突围冲锋
    if (roll < 0.35) {
      const eagleX = 12 * TILE_SIZE;
      const eagleY = 24 * TILE_SIZE;
      if (Math.abs(this.x - eagleX) > Math.abs(this.y - eagleY)) {
        preferredDir = this.x > eagleX ? DIR.LEFT : DIR.RIGHT;
      } else {
        preferredDir = DIR.DOWN;
      }
    }
    // 30% 几率追踪玩家
    else if (roll < 0.65 && player && player.isAlive) {
      if (Math.abs(this.x - player.x) > Math.abs(this.y - player.y)) {
        preferredDir = this.x > player.x ? DIR.LEFT : DIR.RIGHT;
      } else {
        preferredDir = this.y > player.y ? DIR.UP : DIR.DOWN;
      }
    }
    // 其余情况随机机动
    else {
      preferredDir = Math.floor(Math.random() * 4);
    }

    // 验证目标方向能否前进，不能则尝试其他方向
    const dirs = [preferredDir, DIR.DOWN, DIR.LEFT, DIR.RIGHT, DIR.UP];
    for (const d of dirs) {
      const v = DIR_VECTORS[d];
      if (this.canMoveTo(this.x + v.x * 4, this.y + v.y * 4, map, allTanks)) {
        this.direction = d;
        this.alignToGrid(d);
        return;
      }
    }
  }

  aiShoot(onShoot) {
    if (!this.isAlive || !onShoot) return;
    let bx = this.x + this.size / 2 - BULLET_SIZE / 2;
    let by = this.y + this.size / 2 - BULLET_SIZE / 2;
    const offset = this.size / 2 + 2;
    const v = DIR_VECTORS[this.direction];
    bx += v.x * offset;
    by += v.y * offset;

    const bullet = new Bullet('enemy', bx, by, this.direction, this.bulletSpeed, false);
    onShoot(bullet);
  }

  // 受伤处理，重装坦克受损变色
  takeHit() {
    this.hp--;
    if (this.hp <= 0) {
      this.isAlive = false;
      return true; // 死亡
    }
    return false; // 存活
  }

  draw(ctx) {
    if (!this.isAlive) return;

    ctx.save();
    ctx.translate(this.x + this.size / 2, this.y + this.size / 2);
    const angles = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    ctx.rotate(angles[this.direction]);

    // 闪烁红光特种宝物车
    let bodyColor = this.baseColor;
    if (this.isBonus && Math.floor(Date.now() / 150) % 2 === 0) {
      bodyColor = '#ff0054';
    } else if (this.type === ENEMY_TYPE.ARMOR) {
      // 重装巨坦受损颜色变换
      if (this.hp === 3) bodyColor = '#f77f00';
      else if (this.hp === 2) bodyColor = '#fcbf49';
      else if (this.hp === 1) bodyColor = '#d62828';
    }

    // 履带
    ctx.fillStyle = '#222222';
    ctx.fillRect(-15, -15, 6, 30);
    ctx.fillRect(9, -15, 6, 30);

    // 履带滚动
    ctx.fillStyle = this.treadFrame < 2 ? '#555555' : '#888888';
    for (let i = -14; i < 14; i += 6) {
      ctx.fillRect(-15, i, 6, 2);
      ctx.fillRect(9, i, 6, 2);
    }

    // 车身
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-10, -11, 20, 22);

    // 炮塔
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    // 炮管
    ctx.fillRect(-2, -17, 4, 11);

    ctx.restore();

    // 定身冰冻状态视觉遮罩
    if (this.isFrozen) {
      ctx.save();
      ctx.fillStyle = 'rgba(72, 202, 228, 0.45)';
      ctx.fillRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
      ctx.strokeStyle = '#90e0ef';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(this.x - 2, this.y - 2, this.size + 4, this.size + 4);
      ctx.restore();
    }
  }
}
