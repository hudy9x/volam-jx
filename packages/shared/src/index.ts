// @vltk/shared — luật + dữ liệu dùng chung cho server và client (TS thuần, không Phaser / Colyseus / DOM).
// Chia theo chủ đề; mỗi thư mục có index.ts riêng. Xem docs/architecture.md.
export * from './protocol.js';
export * from './geometry.js';
export * from './assets.js';
export * from './maps/nav/types.js';
export { decodeGrid, isWalkable, canStandAt, nearestWalkable, clearSegment } from './maps/nav/grid.js';
export { findPath } from './maps/nav/pathfinding.js';
export * from './maps/index.js';
export * from './maps/safe-zones.js';
export * from './characters/index.js';
export * from './monsters/index.js';
export * from './items/index.js';
export * from './npcs/index.js';
export * from './status/index.js';
export * from './combat/index.js';
export * from './skills/index.js';
export * from './formulas/index.js';
export * from './drops/index.js';
export * from './auto/index.js';
export * from './bots/index.js';
export * from './bosses/index.js';
