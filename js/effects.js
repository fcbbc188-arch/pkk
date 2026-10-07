/**
 * 视觉特效管理器
 * 包含：命中火花、多段式经典像素大爆炸、得分浮动提示、出生星星动画、全屏文字提示
 */

class EffectsManager {
  constructor() {
    this.explosions = [];
    this.sparks = [];
    this.scores = [];
    this.floatingTexts = [];
    this.spawnStars = [];
  }

  reset() {
    this.explosions = [];
    this.sparks = [];
    this.scores = [];
    this.floatingTexts = [];
    this.spawnStars = [];
  }

  // 添加击中微小火花
  addHitSpark(x, y) {
    this.sparks.push({
      x,
      y,
      radius: 4,
      maxRadius: 10,
      alpha: 1.0,
      life: 0.12,
      maxLife: 0.12
    });
  }

  // 添加坦克爆炸
  addExplosion(x, y, isBig = true) {
    this.explosions.push({
      x,
      y,
      radius: 6,
      maxRadius: isBig ? 28 : 16,
      currentFrame: 0,
      totalFrames: isBig ? 18 : 12,
      isBig
    });
  }

  // 添加得分浮动文本
  addScore(x, y, score) {
    this.scores.push({
      x,
      y,
      score: `+${score}`,
      alpha: 1.0,
      life: 1.0
    });
  }

  // 添加屏幕大提示（如 TIME STOP, BASE FORTIFIED）
  addFloatingText(text, color = '#ffeb3b') {
    this.floatingTexts.push({
      text,
      color,
      y: CANVAS_HEIGHT / 2 - 20,
      alpha: 1.0,
      life: 1.5
    });
  }

  // 添加坦克降临动画（经典四角旋转星斑）
  addSpawnStar(x, y, onComplete) {
    this.spawnStars.push({
      x,
      y,
      frame: 0,
      maxFrames: 30,
      onComplete
    });
  }

  update(dt) {
    // 更新火花
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      s.alpha = s.life / s.maxLife;
      s.radius += 20 * dt;
      if (s.life <= 0) this.sparks.splice(i, 1);
    }

    // 更新爆炸
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.currentFrame++;
      if (ex.currentFrame >= ex.totalFrames) {
        this.explosions.splice(i, 1);
      }
    }

    // 更新飘分
    for (let i = this.scores.length - 1; i >= 0; i--) {
      const sc = this.scores[i];
      sc.life -= dt;
      sc.y -= 25 * dt;
      sc.alpha = Math.max(0, sc.life);
      if (sc.life <= 0) this.scores.splice(i, 1);
    }

    // 更新悬浮提示
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.life -= dt;
      ft.y -= 15 * dt;
      ft.alpha = Math.max(0, ft.life / 1.5);
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    // 更新降临星斑
    for (let i = this.spawnStars.length - 1; i >= 0; i--) {
      const st = this.spawnStars[i];
      st.frame++;
      if (st.frame >= st.maxFrames) {
        if (st.onComplete) st.onComplete();
        this.spawnStars.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // 绘制火花
    this.sparks.forEach(s => {
      ctx.save();
      ctx.fillStyle = `rgba(255, 200, 50, ${s.alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // 绘制多层炸裂动效
    this.explosions.forEach(ex => {
      ctx.save();
      const progress = ex.currentFrame / ex.totalFrames;
      const currentRadius = ex.radius + (ex.maxRadius - ex.radius) * Math.sin(progress * Math.PI);

      // 外焰
      ctx.fillStyle = progress < 0.4 ? '#ffffff' : (progress < 0.7 ? '#ffd166' : '#ef476f');
      ctx.beginPath();
      ctx.arc(ex.x + 16, ex.y + 16, currentRadius, 0, Math.PI * 2);
      ctx.fill();

      // 内芯
      if (progress < 0.6) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex.x + 16, ex.y + 16, currentRadius * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });

    // 绘制生成星
    this.spawnStars.forEach(st => {
      ctx.save();
      const size = 10 + 6 * Math.sin(st.frame * 0.6);
      ctx.fillStyle = (st.frame % 4 < 2) ? '#ffffff' : '#ffd166';
      ctx.fillRect(st.x + 16 - size / 2, st.y + 16 - 2, size, 4);
      ctx.fillRect(st.x + 16 - 2, st.y + 16 - size / 2, 4, size);
      ctx.restore();
    });

    // 绘制飘分
    this.scores.forEach(sc => {
      ctx.save();
      ctx.font = 'bold 12px "Courier New", monospace';
      ctx.fillStyle = `rgba(255, 255, 255, ${sc.alpha})`;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 3;
      ctx.fillText(sc.score, sc.x + 4, sc.y);
      ctx.restore();
    });

    // 绘制全屏浮动大字
    this.floatingTexts.forEach(ft => {
      ctx.save();
      ctx.font = 'bold 20px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = ft.color;
      ctx.globalAlpha = ft.alpha;
      ctx.shadowColor = '#000000';
      ctx.shadowBlur = 8;
      ctx.fillText(ft.text, CANVAS_WIDTH / 2, ft.y);
      ctx.restore();
    });
  }
}

const effectsManager = new EffectsManager();
