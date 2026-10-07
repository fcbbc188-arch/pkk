/**
 * 坦克大战核心游戏循环与状态机
 */

class TankBattleGame {
  constructor() {
    this.canvas = document.getElementById('gameCanvas');
    this.ctx = this.canvas.getContext('2d');

    this.state = GAME_STATE.MENU;
    this.currentStage = 1;
    this.highScore = parseInt(localStorage.getItem('tank_battle_highscore') || '0', 10);

    this.map = null;
    this.player = null;
    this.enemies = [];
    this.bullets = [];
    this.powerups = [];

    // 关卡敌军波次生成控制
    this.totalEnemiesToSpawn = 20;
    this.enemiesSpawnedCount = 0;
    this.maxOnScreenEnemies = 4;
    this.enemySpawnTimer = 0;
    this.spawnPoints = [
      { x: 0, y: 0 },
      { x: 12 * TILE_SIZE, y: 0 },
      { x: 24 * TILE_SIZE, y: 0 }
    ];
    this.nextSpawnIndex = 0;

    // 基地加固时效状态
    this.shovelTimer = 0;

    // 敌军定身冻结时效状态
    this.clockFreezeTimer = 0;

    // 输入控制集合
    this.keys = {};
    this.touchDirection = null;
    this.touchFiring = false;

    // 计时与帧率
    this.lastTime = 0;
    this.stageIntroTimer = 0;

    // 模块挂载
    this.editor = new MapEditor(this);

    this.initEventListeners();
    this.resizeCanvas();
  }

  // 初始化分辨率与视口适配
  resizeCanvas() {
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
  }

  // 绑定键盘、触控与界面按钮事件
  initEventListeners() {
    // 键盘监听
    window.addEventListener('keydown', e => {
      soundManager.init();
      this.keys[e.code] = true;

      // 快捷控制
      if (e.code === 'KeyP') {
        this.togglePause();
      } else if (e.code === 'KeyM') {
        this.toggleMute();
      }
    });

    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
    });

    // 手机端虚拟轮盘摇杆 (Virtual Joystick) 交互监听
    const joystick = document.getElementById('virtualJoystick');
    const joystickKnob = document.getElementById('joystickKnob');
    const joystickBase = joystick ? joystick.querySelector('.joystick-base') : null;
    const joyTicks = joystick ? joystick.querySelectorAll('.joy-tick') : [];

    if (joystick && joystickKnob) {
      let isJoyActive = false;
      let joyTouchId = null;
      const maxRadius = 38; // 最大拖拽半径 (px)
      const deadZone = 8;    // 死区阈值 (px)

      const updateJoystick = (clientX, clientY) => {
        const rect = joystick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.hypot(dx, dy);

        // 更新摇杆手柄物理位移
        const clampRatio = dist > maxRadius ? (maxRadius / dist) : 1;
        const knobX = dx * clampRatio;
        const knobY = dy * clampRatio;
        joystickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;

        // 清除旧方向高亮
        joyTicks.forEach(t => t.classList.remove('active'));

        // 死区判定
        if (dist < deadZone) {
          this.touchDirection = null;
          return;
        }

        // 依据拖拽夹角判定 4 向行进 (Battle City 经典 4 向)
        const angleDeg = Math.atan2(dy, dx) * 180 / Math.PI;
        let activeDir = null;
        let tickSelector = null;

        if (angleDeg >= -135 && angleDeg < -45) {
          activeDir = DIR.UP;
          tickSelector = '.tick-u';
        } else if (angleDeg >= -45 && angleDeg < 45) {
          activeDir = DIR.RIGHT;
          tickSelector = '.tick-r';
        } else if (angleDeg >= 45 && angleDeg < 135) {
          activeDir = DIR.DOWN;
          tickSelector = '.tick-d';
        } else {
          activeDir = DIR.LEFT;
          tickSelector = '.tick-l';
        }

        this.touchDirection = activeDir;
        if (tickSelector && joystick) {
          const tickEl = joystick.querySelector(tickSelector);
          if (tickEl) tickEl.classList.add('active');
        }
      };

      const resetJoystick = () => {
        isJoyActive = false;
        joyTouchId = null;
        this.touchDirection = null;
        joystickKnob.classList.remove('dragging');
        if (joystickBase) joystickBase.classList.remove('active');
        joystickKnob.style.transform = 'translate(0px, 0px)';
        joyTicks.forEach(t => t.classList.remove('active'));
      };

      // 触控事件 (移动端)
      joystick.addEventListener('touchstart', (e) => {
        e.preventDefault();
        soundManager.init();
        if (isJoyActive) return;
        const touch = e.changedTouches[0];
        joyTouchId = touch.identifier;
        isJoyActive = true;
        joystickKnob.classList.add('dragging');
        if (joystickBase) joystickBase.classList.add('active');
        updateJoystick(touch.clientX, touch.clientY);
      }, { passive: false });

      window.addEventListener('touchmove', (e) => {
        if (!isJoyActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          if (touch.identifier === joyTouchId) {
            e.preventDefault();
            updateJoystick(touch.clientX, touch.clientY);
            break;
          }
        }
      }, { passive: false });

      window.addEventListener('touchend', (e) => {
        if (!isJoyActive) return;
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === joyTouchId) {
            resetJoystick();
            break;
          }
        }
      });

      window.addEventListener('touchcancel', (e) => {
        if (!isJoyActive) return;
        resetJoystick();
      });

      // 鼠标事件 (便于桌面端调试与体验)
      joystick.addEventListener('mousedown', (e) => {
        e.preventDefault();
        soundManager.init();
        isJoyActive = true;
        joystickKnob.classList.add('dragging');
        if (joystickBase) joystickBase.classList.add('active');
        updateJoystick(e.clientX, e.clientY);

        const onMouseMove = (moveEvt) => {
          if (!isJoyActive) return;
          moveEvt.preventDefault();
          updateJoystick(moveEvt.clientX, moveEvt.clientY);
        };

        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
          resetJoystick();
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      });
    }

    // 手机开火按键监听
    const fireBtn = document.getElementById('fireBtn');
    if (fireBtn) {
      const startFire = (e) => {
        e.preventDefault();
        soundManager.init();
        this.touchFiring = true;
        if (this.state === GAME_STATE.PLAYING && this.player) {
          const b = this.player.shoot();
          if (b) this.bullets.push(b);
        }
      };
      const endFire = (e) => {
        e.preventDefault();
        this.touchFiring = false;
      };

      fireBtn.addEventListener('touchstart', startFire, { passive: false });
      fireBtn.addEventListener('touchend', endFire, { passive: false });
      fireBtn.addEventListener('mousedown', startFire);
      fireBtn.addEventListener('mouseup', endFire);
    }

    // 地图编辑器画布交互（鼠标与触控）
    const getCanvasPos = (evt) => {
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const clientX = evt.touches ? evt.touches[0].clientX : evt.clientX;
      const clientY = evt.touches ? evt.touches[0].clientY : evt.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
      };
    };

    const startPaint = (evt) => {
      if (this.state !== GAME_STATE.EDITOR) return;
      evt.preventDefault();
      this.editor.isPainting = true;
      const pos = getCanvasPos(evt);
      this.editor.paintAt(pos.x, pos.y);
    };

    const movePaint = (evt) => {
      if (this.state !== GAME_STATE.EDITOR || !this.editor.isPainting) return;
      evt.preventDefault();
      const pos = getCanvasPos(evt);
      this.editor.paintAt(pos.x, pos.y);
    };

    const endPaint = (evt) => {
      if (this.state !== GAME_STATE.EDITOR) return;
      this.editor.isPainting = false;
    };

    this.canvas.addEventListener('mousedown', startPaint);
    this.canvas.addEventListener('mousemove', movePaint);
    window.addEventListener('mouseup', endPaint);

    this.canvas.addEventListener('touchstart', startPaint, { passive: false });
    this.canvas.addEventListener('touchmove', movePaint, { passive: false });
    this.canvas.addEventListener('touchend', endPaint, { passive: false });
  }

  // 切换静音
  toggleMute() {
    const isEnabled = soundManager.toggleSound();
    const btn = document.getElementById('muteBtn');
    if (btn) {
      btn.innerText = isEnabled ? '🔊 声音: 开' : '🔇 声音: 关';
    }
  }

  // 切换暂停
  togglePause() {
    if (this.state === GAME_STATE.PLAYING) {
      this.state = GAME_STATE.PAUSED;
    } else if (this.state === GAME_STATE.PAUSED) {
      this.state = GAME_STATE.PLAYING;
    }
  }

  // 开始指定战役关卡
  startStage(stageNumber) {
    soundManager.init();
    this.currentStage = stageNumber;
    this.state = GAME_STATE.STAGE_START;
    this.stageIntroTimer = 2.0; // 展示关卡片头 2 秒

    this.map = mapManager.getStageMap(stageNumber);
    this.initBattlefield();
    soundManager.playStageStart();
    this.updateHUD();
  }

  // 开始自定义地图游玩
  startCustomGame(customMap) {
    soundManager.init();
    this.currentStage = '自定义';
    this.state = GAME_STATE.STAGE_START;
    this.stageIntroTimer = 1.5;

    this.map = mapManager.cloneMap(customMap);
    this.initBattlefield();
    soundManager.playStageStart();
    this.updateHUD();
  }

  // 初始化战场单位
  initBattlefield() {
    effectsManager.reset();
    this.bullets = [];
    this.powerups = [];
    this.enemies = [];
    this.shovelTimer = 0;
    this.clockFreezeTimer = 0;

    // 敌军出兵计划
    this.totalEnemiesToSpawn = 20;
    this.enemiesSpawnedCount = 0;
    this.enemySpawnTimer = 0.5;

    // 初始化玩家坦克
    if (!this.player) {
      this.player = new PlayerTank(8 * TILE_SIZE, 24 * TILE_SIZE);
    } else {
      this.player.respawn();
    }
  }

  // 生成下一辆敌军坦克
  spawnEnemy() {
    if (this.enemiesSpawnedCount >= this.totalEnemiesToSpawn) return;
    if (this.enemies.filter(e => e.isAlive).length >= this.maxOnScreenEnemies) return;

    const sp = this.spawnPoints[this.nextSpawnIndex];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.spawnPoints.length;

    // 随机决定敌军类型 (随着关卡加深，高阶敌军概率增加)
    const roll = Math.random();
    let type = ENEMY_TYPE.BASIC;
    if (typeof this.currentStage === 'number' && this.currentStage >= 2) {
      if (roll < 0.3) type = ENEMY_TYPE.BASIC;
      else if (roll < 0.6) type = ENEMY_TYPE.FAST;
      else if (roll < 0.85) type = ENEMY_TYPE.POWER;
      else type = ENEMY_TYPE.ARMOR;
    } else {
      if (roll < 0.6) type = ENEMY_TYPE.BASIC;
      else if (roll < 0.85) type = ENEMY_TYPE.FAST;
      else type = ENEMY_TYPE.POWER;
    }

    // 第 4, 10, 16 辆坦克设定为红光闪烁宝物车
    const isBonus = (this.enemiesSpawnedCount === 3 || this.enemiesSpawnedCount === 9 || this.enemiesSpawnedCount === 15);

    // 播放出生四星光芒动效
    effectsManager.addSpawnStar(sp.x, sp.y, () => {
      const enemy = new EnemyTank(sp.x, sp.y, type, isBonus);
      this.enemies.push(enemy);
    });

    this.enemiesSpawnedCount++;
    this.updateHUD();
  }

  // 随机掉落强化道具
  spawnRandomPowerup(x, y) {
    const types = [
      POWERUP_TYPE.STAR,
      POWERUP_TYPE.HELMET,
      POWERUP_TYPE.BOMB,
      POWERUP_TYPE.CLOCK,
      POWERUP_TYPE.SHOVEL,
      POWERUP_TYPE.TANK,
      POWERUP_TYPE.BOOTS,
      POWERUP_TYPE.LASER
    ];
    const picked = types[Math.floor(Math.random() * types.length)];
    const p = new PowerUp(picked, Math.max(16, Math.min(x, CANVAS_WIDTH - 48)), Math.max(16, Math.min(y, CANVAS_HEIGHT - 48)));
    this.powerups.push(p);
    soundManager.playPowerupSpawn();
  }

  // 拾取道具并激活特效
  applyPowerup(p) {
    soundManager.playPowerupPickup();
    this.player.score += 500;
    this.checkHighScore();

    switch (p.type) {
      case POWERUP_TYPE.STAR:
        this.player.upgradeTier();
        effectsManager.addFloatingText('★ 火力升级！', '#ffd166');
        break;

      case POWERUP_TYPE.HELMET:
        this.player.shieldTime = 12.0;
        effectsManager.addFloatingText('🛡️ 无敌防护罩！', '#06d6a0');
        break;

      case POWERUP_TYPE.BOMB:
        effectsManager.addFloatingText('💣 全屏敌军歼灭！', '#ef476f');
        soundManager.playLargeExplosion();
        this.enemies.forEach(e => {
          if (e.isAlive) {
            e.isAlive = false;
            effectsManager.addExplosion(e.x, e.y, true);
            effectsManager.addScore(e.x, e.y, e.score);
            this.player.score += e.score;
          }
        });
        this.checkHighScore();
        break;

      case POWERUP_TYPE.CLOCK:
        this.clockFreezeTimer = 10.0;
        effectsManager.addFloatingText('⏱️ 敌军定身冻结！', '#118ab2');
        this.enemies.forEach(e => e.isFrozen = true);
        break;

      case POWERUP_TYPE.SHOVEL:
        this.shovelTimer = 15.0;
        mapManager.setBaseFortification(this.map, TILE.STEEL);
        effectsManager.addFloatingText('⛏️ 基地精钢加固！', '#e76f51');
        break;

      case POWERUP_TYPE.TANK:
        this.player.lives++;
        effectsManager.addFloatingText('🎖️ 额外生命 +1！', '#e63946');
        break;

      case POWERUP_TYPE.BOOTS:
        this.player.speedBuffTime = 12.0;
        effectsManager.addFloatingText('🚀 履带超频加速！', '#a8dadc');
        break;

      case POWERUP_TYPE.LASER:
        this.player.laserBuffTime = 12.0;
        effectsManager.addFloatingText('⚡ 穿透暴击重炮！', '#7209b7');
        break;
    }
  }

  // 玩家阵亡处理
  handlePlayerHit() {
    if (this.player.shieldTime > 0) return; // 护盾抵挡

    soundManager.playLargeExplosion();
    effectsManager.addExplosion(this.player.x, this.player.y, true);
    this.player.lives--;
    this.updateHUD();

    if (this.player.lives > 0) {
      // 降级一级并重生
      if (this.player.tier > 1) this.player.tier--;
      this.player.applyTierConfig();
      effectsManager.addSpawnStar(this.player.spawnX, this.player.spawnY, () => {
        this.player.respawn();
      });
    } else {
      this.player.isAlive = false;
      this.gameOver('全军覆没！');
    }
  }

  // 基地受击损毁判定
  destroyEagleBase() {
    this.map[24][12] = TILE.EAGLE_DEAD;
    this.map[24][13] = TILE.EAGLE_DEAD;
    this.map[25][12] = TILE.EAGLE_DEAD;
    this.map[25][13] = TILE.EAGLE_DEAD;

    soundManager.playLargeExplosion();
    effectsManager.addExplosion(12 * TILE_SIZE, 24 * TILE_SIZE, true);
    effectsManager.addFloatingText('基地已沦陷！', '#e63946');
    this.gameOver('基地已被摧毁！');
  }

  // 游戏结束
  gameOver(reason = 'GAME OVER') {
    this.state = GAME_STATE.GAME_OVER;
    soundManager.playGameOver();
    this.checkHighScore();
    this.showGameOverModal(reason);
  }

  // 战役胜利过关
  stageVictory() {
    this.state = GAME_STATE.VICTORY;
    soundManager.playVictory();
    this.checkHighScore();
    this.showVictoryModal();
  }

  // 检查并记录最高分
  checkHighScore() {
    if (this.player && this.player.score > this.highScore) {
      this.highScore = this.player.score;
      localStorage.setItem('tank_battle_highscore', this.highScore.toString());
    }
    this.updateHUD();
  }

  // 更新界面状态栏 (得分、关卡、剩余敌军、生命等)
  updateHUD() {
    const scoreEl = document.getElementById('hudScore');
    const highEl = document.getElementById('hudHighScore');
    const stageEl = document.getElementById('hudStage');
    const livesEl = document.getElementById('hudLives');
    const enemiesEl = document.getElementById('hudEnemies');

    if (scoreEl && this.player) scoreEl.innerText = this.player.score;
    if (highEl) highEl.innerText = this.highScore;
    if (stageEl) stageEl.innerText = this.currentStage;
    if (livesEl && this.player) livesEl.innerText = '♥ ' + this.player.lives;
    if (enemiesEl) {
      const remaining = Math.max(0, this.totalEnemiesToSpawn - (this.enemies.filter(e => !e.isAlive).length));
      enemiesEl.innerText = remaining;
    }
  }

  // 物理与逻辑更新帧
  update(dt) {
    tileRenderer.update(dt);
    effectsManager.update(dt);

    if (this.state === GAME_STATE.STAGE_START) {
      this.stageIntroTimer -= dt;
      if (this.stageIntroTimer <= 0) {
        this.state = GAME_STATE.PLAYING;
      }
      return;
    }

    if (this.state !== GAME_STATE.PLAYING) return;

    // 道具加固计时
    if (this.shovelTimer > 0) {
      this.shovelTimer -= dt;
      // 临近结束时红砖闪烁
      if (this.shovelTimer <= 3.0) {
        const toggle = Math.floor(this.shovelTimer * 6) % 2 === 0;
        mapManager.setBaseFortification(this.map, toggle ? TILE.STEEL : TILE.BRICK);
      }
      if (this.shovelTimer <= 0) {
        mapManager.setBaseFortification(this.map, TILE.BRICK);
      }
    }

    // 怀表定身计时
    if (this.clockFreezeTimer > 0) {
      this.clockFreezeTimer -= dt;
      if (this.clockFreezeTimer <= 0) {
        this.enemies.forEach(e => e.isFrozen = false);
      }
    }

    // 玩家移动与射击判定 (支持键盘与触控多端控制)
    if (this.player && this.player.isAlive) {
      let moveDir = null;
      if (this.touchDirection !== null) {
        moveDir = this.touchDirection;
      } else if (this.keys['KeyW'] || this.keys['ArrowUp']) {
        moveDir = DIR.UP;
      } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
        moveDir = DIR.RIGHT;
      } else if (this.keys['KeyS'] || this.keys['ArrowDown']) {
        moveDir = DIR.DOWN;
      } else if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
        moveDir = DIR.LEFT;
      }

      const activeEnemies = this.enemies.filter(e => e.isAlive);
      if (moveDir !== null) {
        this.player.move(moveDir, this.map, activeEnemies);
      }

      // 射击 (键盘空格键或 J 键)
      if (this.keys['Space'] || this.keys['KeyJ']) {
        const bullet = this.player.shoot();
        if (bullet) this.bullets.push(bullet);
      }

      this.player.update(dt, this.map);

      // 道具拾取检测
      const pb = this.player.getBounds();
      for (let i = this.powerups.length - 1; i >= 0; i--) {
        const p = this.powerups[i];
        if (p.active) {
          const itemBox = p.getBounds();
          if (pb.left < itemBox.right && pb.right > itemBox.left && pb.top < itemBox.bottom && pb.bottom > itemBox.top) {
            p.active = false;
            this.applyPowerup(p);
            this.powerups.splice(i, 1);
          }
        }
      }
    }

    // 敌军出兵推进
    this.enemySpawnTimer -= dt;
    if (this.enemySpawnTimer <= 0) {
      this.spawnEnemy();
      this.enemySpawnTimer = 3.0; // 每 3 秒尝试生成一名敌军
    }

    // 敌军 AI 行为驱动
    const aliveEnemies = this.enemies.filter(e => e.isAlive);
    const allTanks = this.player ? [this.player, ...aliveEnemies] : aliveEnemies;

    aliveEnemies.forEach(e => {
      e.update(dt, this.map, this.player, allTanks, (enemyBullet) => {
        this.bullets.push(enemyBullet);
      });
    });

    // 道具时效刷新
    this.powerups.forEach(p => p.update(dt));
    this.powerups = this.powerups.filter(p => p.active);

    // 炮弹位移与碰撞系统
    this.updateBullets(dt);

    // 胜负判定：所有计划敌军全数剿灭
    const deadEnemiesCount = this.enemies.filter(e => !e.isAlive).length;
    if (this.enemiesSpawnedCount >= this.totalEnemiesToSpawn && deadEnemiesCount >= this.totalEnemiesToSpawn) {
      this.stageVictory();
    }
  }

  // 细致的炮弹碰撞判定
  updateBullets(dt) {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      if (!b.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      b.update();
      if (!b.active) {
        this.bullets.splice(i, 1);
        continue;
      }

      const bb = b.getBounds();

      // 1. 炮弹与炮弹相互对撞抵消
      for (let j = this.bullets.length - 1; j >= 0; j--) {
        const other = this.bullets[j];
        if (i !== j && other.active && b.owner !== other.owner) {
          const ob = other.getBounds();
          if (bb.left < ob.right && bb.right > ob.left && bb.top < ob.bottom && bb.bottom > ob.top) {
            b.active = false;
            other.active = false;
            soundManager.playHitSteel();
            effectsManager.addHitSpark((bb.left + ob.left) / 2, (bb.top + ob.top) / 2);
            break;
          }
        }
      }
      if (!b.active) continue;

      // 2. 炮弹击中地图障碍物 (红砖、铁墙、老鹰基地)
      const centerTileCol = Math.floor((b.x + b.size / 2) / TILE_SIZE);
      const centerTileRow = Math.floor((b.y + b.size / 2) / TILE_SIZE);

      // 采样炮弹前方接触网格
      const hitTiles = [];
      for (let ro = -1; ro <= 1; ro++) {
        for (let co = -1; co <= 1; co++) {
          const r = centerTileRow + ro;
          const c = centerTileCol + co;
          if (r >= 0 && r < MAP_TILES && c >= 0 && c < MAP_TILES) {
            const tileRect = { left: c * TILE_SIZE, right: (c + 1) * TILE_SIZE, top: r * TILE_SIZE, bottom: (r + 1) * TILE_SIZE };
            if (bb.left < tileRect.right && bb.right > tileRect.left && bb.top < tileRect.bottom && bb.bottom > tileRect.top) {
              hitTiles.push({ r, c, type: this.map[r][c] });
            }
          }
        }
      }

      let hitObstacle = false;
      for (const t of hitTiles) {
        if (t.type === TILE.BRICK) {
          this.map[t.r][t.c] = TILE.EMPTY;
          hitObstacle = true;
          soundManager.playSmallExplosion();
          effectsManager.addHitSpark(t.c * TILE_SIZE + 8, t.r * TILE_SIZE + 8);
        } else if (t.type === TILE.STEEL) {
          hitObstacle = true;
          if (b.canBreakSteel) {
            this.map[t.r][t.c] = TILE.EMPTY;
            soundManager.playSmallExplosion();
            effectsManager.addHitSpark(t.c * TILE_SIZE + 8, t.r * TILE_SIZE + 8);
          } else {
            soundManager.playHitSteel();
            effectsManager.addHitSpark(b.x, b.y);
          }
        } else if (t.type === TILE.EAGLE) {
          this.destroyEagleBase();
          b.active = false;
          hitObstacle = true;
          break;
        }
      }

      if (hitObstacle && !b.isLaser) {
        b.active = false;
        continue;
      }

      // 3. 玩家炮弹击中敌军
      if (b.owner === 'player') {
        for (const e of this.enemies) {
          if (e.isAlive) {
            const eb = e.getBounds();
            if (bb.left < eb.right && bb.right > eb.left && bb.top < eb.bottom && bb.bottom > eb.top) {
              b.active = false;
              const killed = e.takeHit();
              if (killed) {
                soundManager.playLargeExplosion();
                effectsManager.addExplosion(e.x, e.y, true);
                effectsManager.addScore(e.x, e.y, e.score);
                this.player.score += e.score;
                this.checkHighScore();

                // 击中闪光红坦克必爆道具
                if (e.isBonus) {
                  this.spawnRandomPowerup(e.x, e.y);
                }
              } else {
                soundManager.playHitSteel();
                effectsManager.addHitSpark(b.x, b.y);
              }
              break;
            }
          }
        }
      }

      // 4. 敌军炮弹击中玩家
      if (b.owner === 'enemy' && this.player && this.player.isAlive) {
        const pb = this.player.getBounds();
        if (bb.left < pb.right && bb.right > pb.left && bb.top < pb.bottom && bb.bottom > pb.top) {
          b.active = false;
          this.handlePlayerHit();
        }
      }
    }
  }

  // 渲染绘制
  render() {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state === GAME_STATE.EDITOR) {
      this.editor.draw(this.ctx);
      return;
    }

    if (!this.map) return;

    // 1. 绘制底层地形（水面、冰面、砖块、铁墙）
    for (let r = 0; r < MAP_TILES; r++) {
      for (let c = 0; c < MAP_TILES; c++) {
        const type = this.map[r][c];
        if (type !== TILE.EMPTY && type !== TILE.BUSH && type !== TILE.EAGLE && type !== TILE.EAGLE_DEAD) {
          tileRenderer.drawTile(this.ctx, type, c * TILE_SIZE, r * TILE_SIZE);
        }
      }
    }

    // 2. 绘制老鹰基地
    if (this.map[24][12] === TILE.EAGLE) {
      tileRenderer.drawEagle(this.ctx, 12 * TILE_SIZE, 24 * TILE_SIZE);
    } else {
      tileRenderer.drawDeadEagle(this.ctx, 12 * TILE_SIZE, 24 * TILE_SIZE);
    }

    // 3. 绘制地面道具
    this.powerups.forEach(p => p.draw(this.ctx));

    // 4. 绘制坦克单位 (玩家与敌军)
    if (this.player) this.player.draw(this.ctx);
    this.enemies.forEach(e => e.draw(this.ctx));

    // 5. 绘制炮弹
    this.bullets.forEach(b => b.draw(this.ctx));

    // 6. 绘制高层草丛（遮挡坦克）
    for (let r = 0; r < MAP_TILES; r++) {
      for (let c = 0; c < MAP_TILES; c++) {
        if (this.map[r][c] === TILE.BUSH) {
          tileRenderer.drawTile(this.ctx, TILE.BUSH, c * TILE_SIZE, r * TILE_SIZE);
        }
      }
    }

    // 7. 绘制爆炸火花与飘分特效
    effectsManager.draw(this.ctx);

    // 8. 绘制关卡开场过场字幕
    if (this.state === GAME_STATE.STAGE_START) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      this.ctx.fillRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);
      this.ctx.fillStyle = '#ffd166';
      this.ctx.font = 'bold 26px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`STAGE ${this.currentStage}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 8);
      this.ctx.restore();
    }

    // 9. 暂停遮罩
    if (this.state === GAME_STATE.PAUSED) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
      this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 30px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('PAUSE', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      this.ctx.font = '16px "Courier New", monospace';
      this.ctx.fillText('点击或按 P 键继续', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 35);
      this.ctx.restore();
    }
  }

  // 弹窗与控制面板界面交互处理
  showGameOverModal(reason) {
    const modal = document.getElementById('gameOverModal');
    const reasonText = document.getElementById('gameOverReason');
    const finalScore = document.getElementById('finalScoreText');
    if (modal) {
      if (reasonText) reasonText.innerText = reason;
      if (finalScore && this.player) finalScore.innerText = `最终得分: ${this.player.score}`;
      modal.classList.add('active');
    }
  }

  showVictoryModal() {
    const modal = document.getElementById('victoryModal');
    const scoreText = document.getElementById('victoryScoreText');
    if (modal) {
      if (scoreText && this.player) scoreText.innerText = `得分: ${this.player.score}`;
      modal.classList.add('active');
    }
  }

  // 驱动主游戏循环
  startLoop() {
    const loop = (currentTime) => {
      if (!this.lastTime) this.lastTime = currentTime;
      const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
      this.lastTime = currentTime;

      this.update(dt);
      this.render();

      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// 实例化主游戏
let gameInstance = null;
window.addEventListener('DOMContentLoaded', () => {
  gameInstance = new TankBattleGame();
  gameInstance.startLoop();
});
