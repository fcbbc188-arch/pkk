/**
 * 炮弹系统
 * 支持子弹飞行、击碎砖块/破坏铁墙、炮弹对撞抵消、击中基地与击中坦克判定
 */

class Bullet {
  constructor(owner, x, y, direction, speed, canBreakSteel = false, isLaser = false) {
    this.owner = owner; // 'player' 或 'enemy'
    this.x = x;
    this.y = y;
    this.direction = direction;
    this.speed = speed;
    this.canBreakSteel = canBreakSteel;
    this.isLaser = isLaser; // 激光/暴击状态可穿透多层
    this.size = BULLET_SIZE;
    this.active = true;
  }

  // 获得包围盒
  getBounds() {
    return {
      left: this.x,
      right: this.x + this.size,
      top: this.y,
      bottom: this.y + this.size
    };
  }

  update() {
    if (!this.active) return;
    const v = DIR_VECTORS[this.direction];
    this.x += v.x * this.speed;
    this.y += v.y * this.speed;

    // 飞出画布边界判定
    if (
      this.x < 0 ||
      this.x + this.size > CANVAS_WIDTH ||
      this.y < 0 ||
      this.y + this.size > CANVAS_HEIGHT
    ) {
      this.active = false;
      soundManager.playHitSteel();
      effectsManager.addHitSpark(this.x, this.y);
    }
  }

  draw(ctx) {
    if (!this.active) return;
    ctx.save();
    ctx.fillStyle = this.isLaser ? '#00f5d4' : (this.owner === 'player' ? '#fff275' : '#ffffff');
    ctx.shadowBlur = this.isLaser ? 8 : 4;
    ctx.shadowColor = this.isLaser ? '#00f5d4' : (this.owner === 'player' ? '#ff9f1c' : '#ffffff');

    // 椭圆或方块炮弹
    ctx.beginPath();
    ctx.arc(this.x + this.size / 2, this.y + this.size / 2, this.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
