/**
 * 道具系统
 * 包含：五角星、钢盔、手雷、怀表、铁铲、加命、火箭靴、激光炮
 */

class PowerUp {
  constructor(type, x, y) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = 28;
    this.active = true;
    this.duration = 20.0; // 20秒后自动消失
    this.blinkTimer = 0;
  }

  getBounds() {
    return {
      left: this.x,
      right: this.x + this.size,
      top: this.y,
      bottom: this.y + this.size
    };
  }

  update(dt) {
    this.duration -= dt;
    this.blinkTimer += dt;
    if (this.duration <= 0) {
      this.active = false;
    }
  }

  draw(ctx) {
    if (!this.active) return;
    // 即将消失时闪烁 (最后4秒)
    if (this.duration < 4 && Math.floor(this.blinkTimer * 8) % 2 === 0) {
      return;
    }

    ctx.save();
    // 道具外框背板
    ctx.fillStyle = '#111111';
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(this.x, this.y, this.size, this.size);

    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;

    switch (this.type) {
      case POWERUP_TYPE.STAR: // ⭐ 五角星
        ctx.fillStyle = '#ffd166';
        this.drawStar(ctx, cx, cy, 5, 10, 4);
        break;

      case POWERUP_TYPE.HELMET: // 🛡️ 钢盔无敌
        ctx.fillStyle = '#06d6a0';
        ctx.beginPath();
        ctx.arc(cx, cy - 2, 8, Math.PI, 0);
        ctx.lineTo(cx + 8, cy + 5);
        ctx.lineTo(cx - 8, cy + 5);
        ctx.closePath();
        ctx.fill();
        break;

      case POWERUP_TYPE.BOMB: // 💣 手雷清屏
        ctx.fillStyle = '#ef476f';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 8, 4, 4);
        break;

      case POWERUP_TYPE.CLOCK: // ⏱️ 怀表定身
        ctx.strokeStyle = '#118ab2';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy - 5);
        ctx.lineTo(cx + 4, cy);
        ctx.stroke();
        break;

      case POWERUP_TYPE.SHOVEL: // ⛏️ 铁铲加固
        ctx.fillStyle = '#e76f51';
        ctx.fillRect(cx - 6, cy - 8, 12, 6);
        ctx.fillStyle = '#d4a373';
        ctx.fillRect(cx - 2, cy - 2, 4, 12);
        break;

      case POWERUP_TYPE.TANK: // 🎖️ 加命
        ctx.fillStyle = '#e63946';
        ctx.fillRect(cx - 6, cy - 4, 12, 8);
        ctx.fillRect(cx - 2, cy - 8, 4, 4);
        break;

      case POWERUP_TYPE.BOOTS: // 🚀 火箭靴加速
        ctx.fillStyle = '#a8dadc';
        ctx.beginPath();
        ctx.moveTo(cx - 6, cy - 6);
        ctx.lineTo(cx + 4, cy - 6);
        ctx.lineTo(cx + 4, cy + 2);
        ctx.lineTo(cx + 7, cy + 6);
        ctx.lineTo(cx - 6, cy + 6);
        ctx.closePath();
        ctx.fill();
        break;

      case POWERUP_TYPE.LASER: // ⚡ 激光暴击
        ctx.fillStyle = '#7209b7';
        ctx.beginPath();
        ctx.moveTo(cx - 1, cy - 9);
        ctx.lineTo(cx + 5, cy - 2);
        ctx.lineTo(cx, cy);
        ctx.lineTo(cx + 4, cy + 8);
        ctx.lineTo(cx - 5, cy + 1);
        ctx.lineTo(cx, cy - 1);
        ctx.closePath();
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = Math.PI / 2 * 3;
    let step = Math.PI / spikes;
    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      let x = cx + Math.cos(rot) * outerRadius;
      let y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
  }
}
