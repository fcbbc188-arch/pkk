/**
 * 坦克大战核心常量定义
 */
const TILE_SIZE = 16; // 基础微图块尺寸 (px)
const MAP_TILES = 26; // 地图宽高网格数 (26 x 26)
const CANVAS_WIDTH = TILE_SIZE * MAP_TILES; // 416 px
const CANVAS_HEIGHT = TILE_SIZE * MAP_TILES; // 416 px
const TANK_SIZE = 32; // 坦克尺寸 (32 x 32 px, 占 2x2 微图块)
const BULLET_SIZE = 6; // 子弹尺寸

// 地形图块定义
const TILE = {
  EMPTY: 0,
  BRICK: 1,      // 可破坏红砖
  STEEL: 2,      // 铁墙
  WATER: 3,      // 水面（不可通行，子弹可穿）
  BUSH: 4,       // 树林（遮挡视野与坦克）
  ICE: 5,        // 冰面（滑行）
  EAGLE: 6,      // 老鹰基地（完好）
  EAGLE_DEAD: 7  // 老鹰基地（损毁）
};

// 方向常量与向量
const DIR = {
  UP: 0,
  RIGHT: 1,
  DOWN: 2,
  LEFT: 3
};

const DIR_VECTORS = [
  { x: 0, y: -1 }, // UP
  { x: 1, y: 0 },  // RIGHT
  { x: 0, y: 1 },  // DOWN
  { x: -1, y: 0 }  // LEFT
];

// 敌军坦克类型定义
const ENEMY_TYPE = {
  BASIC: 0, // 普通装甲车：移速中等，攻击一般，1 HP
  FAST: 1,  // 急速轻坦：跑速极快，灵活，1 HP
  POWER: 2, // 强击炮坦：炮弹飞行极快，1 HP
  ARMOR: 3  // 重装巨坦：血量厚 (4 HP)，速度较慢，受击变色
};

// 敌军属性配置表
const ENEMY_CONFIG = [
  { type: ENEMY_TYPE.BASIC, name: '普通装甲车', hp: 1, speed: 1.2, bulletSpeed: 3.2, score: 100, color: '#e69c24' },
  { type: ENEMY_TYPE.FAST,  name: '急速轻坦',   hp: 1, speed: 2.2, bulletSpeed: 3.5, score: 200, color: '#38b000' },
  { type: ENEMY_TYPE.POWER, name: '强击炮坦',   hp: 1, speed: 1.4, bulletSpeed: 5.0, score: 300, color: '#0077b6' },
  { type: ENEMY_TYPE.ARMOR, name: '重装巨坦',   hp: 4, speed: 1.0, bulletSpeed: 3.2, score: 400, color: '#7209b7' }
];

// 强化道具定义
const POWERUP_TYPE = {
  STAR: 'star',       // 五角星：提升坦克等级 (1~4阶)
  HELMET: 'helmet',   // 钢盔：无敌护盾
  BOMB: 'bomb',       // 手雷：全屏敌军轰炸
  CLOCK: 'clock',     // 怀表：敌军定身冻结
  SHOVEL: 'shovel',   // 铁铲：老鹰基地周边变铁墙
  TANK: 'tank',       // 加命：额外增加 1 条生命
  BOOTS: 'boots',     // 火箭靴：额外移速加成
  LASER: 'laser'      // 暴击激光炮：超强火力与高穿透
};

// 玩家坦克进阶档位
const PLAYER_TIERS = [
  { tier: 1, speed: 1.6, maxBullets: 1, bulletSpeed: 3.8, canBreakSteel: false, name: '轻型坦克' },
  { tier: 2, speed: 1.8, maxBullets: 1, bulletSpeed: 5.0, canBreakSteel: false, name: '速射坦克' },
  { tier: 3, speed: 2.0, maxBullets: 2, bulletSpeed: 5.2, canBreakSteel: false, name: '双管战车' },
  { tier: 4, speed: 2.2, maxBullets: 2, bulletSpeed: 6.0, canBreakSteel: true,  name: '重装毁灭者' }
];

// 游戏状态枚举
const GAME_STATE = {
  MENU: 'menu',
  STAGE_START: 'stage_start',
  PLAYING: 'playing',
  PAUSED: 'paused',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
  EDITOR: 'editor'
};
