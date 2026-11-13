/**
 * Original interface art (spr/ui3) -> public/assets/ui/*.webp, at 1:1, for the DOM interface.
 *
 *   npm run gen:ui -w @vltk/client
 *
 * Multi-frame buttons become horizontal strips (frame 0 normal, 1 pressed, 2 hover), so CSS can switch
 * frames with background-position. Pieces cut out of bigger panels (stone texture, coin emblem, the
 * quick bar) are cropped at the coordinates below; check them with the preview in docs if the client
 * changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { generateLoginFigures } from './gen-login-figures.ts';
import { updateManifest } from './jx/manifest.ts';
import { resolveAny } from './jx/hashindex.ts';
import { readGameFile } from './jx/source.ts';
import { decodeSpr, type SprFrame } from './jx/spr.ts';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(HERE, '../public/assets/ui');
const UI = '\\spr\\ui3\\';

/** Whole canvas of one frame (frame boxes are offsets inside the sprite canvas). */
function canvas(file: string, frame = 0): { w: number; h: number; px: Buffer } {
  const spr = decodeSpr(readGameFile(UI + file));
  const f: SprFrame = spr.frames[frame];
  const w = spr.width, h = spr.height;
  const px = Buffer.alloc(w * h * 4);
  if (f?.w) {
    for (let y = 0; y < f.h; y++) {
      const ty = y + f.y;
      if (ty < 0 || ty >= h) continue;
      for (let x = 0; x < f.w; x++) {
        const tx = x + f.x;
        if (tx < 0 || tx >= w) continue;
        const s = (y * f.w + x) * 4, d = (ty * w + tx) * 4;
        px[d] = f.rgba[s]; px[d + 1] = f.rgba[s + 1]; px[d + 2] = f.rgba[s + 2]; px[d + 3] = f.rgba[s + 3];
      }
    }
  }
  return { w, h, px };
}

const frames = (file: string) => decodeSpr(readGameFile(UI + file)).frames.length;

async function save(name: string, img: sharp.Sharp): Promise<void> {
  const out = path.join(OUT, `${name}.webp`);
  const info = await img.webp({ lossless: true }).toFile(out);
  console.log(`  ${name}.webp ${info.width}x${info.height}`);
}

const raw = (c: { w: number; h: number; px: Buffer }) => sharp(c.px, { raw: { width: c.w, height: c.h, channels: 4 } });

/** All frames side by side (normal, pressed, hover…). */
async function strip(name: string, file: string, count = frames(file)): Promise<void> {
  const parts = Array.from({ length: count }, (_, i) => canvas(file, i));
  const w = parts[0].w, h = parts[0].h;
  const img = sharp({ create: { width: w * count, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map((p, i) => ({ input: p.px, raw: { width: p.w, height: p.h, channels: 4 }, left: i * w, top: 0 })));
  await save(name, sharp(await img.png().toBuffer()));
}

/** Frames stacked vertically (bars of the same width). */
async function stack(name: string, files: string[]): Promise<void> {
  const parts = files.map(f => canvas(f));
  const w = Math.max(...parts.map(p => p.w)), h = parts.reduce((a, p) => a + p.h, 0);
  let y = 0;
  const img = sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(parts.map(p => { const top = y; y += p.h; return { input: p.px, raw: { width: p.w, height: p.h, channels: 4 }, left: 0, top }; }));
  await save(name, sharp(await img.png().toBuffer()));
}

async function crop(name: string, file: string, left: number, top: number, width: number, height: number, frame = 0): Promise<void> {
  await save(name, sharp(await raw(canvas(file, frame)).png().toBuffer()).extract({ left, top, width, height }));
}

/** Bounding box of opaque pixels with y >= fromY. */
function opaqueBox(c: { w: number; h: number; px: Buffer }, fromY: number): { left: number; top: number; width: number; height: number } {
  let x0 = c.w, y0 = c.h, x1 = -1, y1 = -1;
  for (let y = fromY; y < c.h; y++) for (let x = 0; x < c.w; x++) {
    if (c.px[(y * c.w + x) * 4 + 3] === 0) continue;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

fs.mkdirSync(OUT, { recursive: true });
console.log('UI art ->', OUT);

// Frames and textures of windows.
await save('jade', raw(canvas('npc对话条\\滚动选择对话条不透明.spr')));
await crop('stone', '买卖\\新奇珍阁界面\\奇珍阁背景_vn.spr', 24, 22, 160, 24);
await crop('coin', '系统\\系统－关闭程序.spr', 9, 3, 22, 22);
await save('brocade', raw(canvas('游戏提示框\\游戏提示框.spr')));
// Silver icon next to tiền túi (ui3/随身物品.ini [MoneyIcon]: 道具\yingliangtubiao.spr).
await save('money', raw(canvas('道具\\yingliangtubiao.spr')));
await strip('close', 'button\\free_close_radius.spr');
await strip('check', '系统选项\\订阅打勾按钮.spr');
await save('thumb', raw(canvas('系统选项\\通用拖动条-横.spr')));
await strip('tab', '状态与装备\\分页.spr');
await strip('btn2', '状态与装备\\2字按钮.spr');
await strip('mm-world', '小地图\\小地图－世界大地图按钮.spr');
await strip('mm-switch', '小地图\\小地图－切换按钮0.spr');

// Vitals: Sinh lực, Nội lực, Thể lực, Kinh nghiệm (106x11 each, stacked in this order).
await stack('bars', ['主界面\\生命条.spr', '主界面\\内力条.spr', '主界面\\体力条.spr', '主界面\\经验条.spr']);

// Quick bar of the Vietnamese 800x600 main interface: slots 1–9, Trái / Phải and ten more slots.
{
  const c = canvas('主界面\\快捷栏800x600_vn.spr');
  const box = opaqueBox(c, 400);
  console.log('  quickbar box', JSON.stringify(box));
  await save('quickbar', sharp(await raw(c).png().toBuffer()).extract(box));
}

// Function buttons of the main interface (28x28 or 31x31, frames: normal / pressed / hover).
const BUTTONS: Record<string, string> = {
  'b-char': '人物属性按钮_0', 'b-skill': '技能按钮', 'b-bag': '背包按钮', 'b-system': '系统按钮', 'b-task': '任务按钮',
  'b-team': '队伍按钮', 'b-guild': '帮会按钮', 'b-friend': '人际关系按钮', 'b-horse': '骑马按钮', 'b-sit': '打坐按钮',
  'b-pk': 'pk按钮', 'b-trade': '交易按钮', 'b-run': '跑步按钮',
};
for (const [name, file] of Object.entries(BUTTONS)) await strip(name, `主界面\\${file}.spr`);
// Kỳ Trân Các button of the Vietnamese main interface (frames: normal / pressed / hover).
await strip('b-kytran', '主界面\\奇珍阁按钮_vn.spr');

// Login screens (USER 2026-11-12: chọn / tạo nhân vật theo hình gốc), spr/ui3/登入界面: backgrounds (登陆过程背景窗口.ini Login /
// Login2), the new-character window (新建角色.ini, 800 x 600 with its five ngũ hành buttons) and the saved-character buttons.
{
  fs.mkdirSync(path.join(OUT, 'login'), { recursive: true });
  const L = '登入界面\\';
  await save('login/bg', sharp(readGameFile(UI + L + '登入-底图.jpg')));
  await save('login/bg2', sharp(readGameFile(UI + L + '登入-底图2.jpg')));
  await strip('login/new-window', L + '登入-新建角色2.spr', 1);
  await strip('login/name-box', L + '登陆界面_7_角色名.spr');
  const SEL: Record<string, string> = { ok: '确定', cancel: '取消', new: '新建', del: '删除', info: '角色信息窗口' };
  for (const [k, f] of Object.entries(SEL)) await strip(`login/sel-${k}`, `${L}选存档角色按钮\\登入-选存档角色－${f}.spr`);
  const SERIES: Record<string, string> = { kim: '金', moc: '木', thuy: '水', hoa: '火', tho: '土' };
  for (const [k, f] of Object.entries(SERIES)) await strip(`login/series-${k}`, `${L}新建角色按钮\\登入-新建角色－${f}.spr`);
  await strip('login/arrow-left', L + '人物选择向左.spr');
  await strip('login/arrow-right', L + '人物选择向右.spr');
}

// Mouse cursors: [CursorList] of ui/_unnamed/ini/d0e56354.ini names \spr\Ui3\鼠标\*.cur (unnamed in the PAKs, found by
// hash). Windows .cur = ICONDIR + one 32x32 DIB (8 bpp + palette, or 32 bpp) with an AND mask; the hotspot is in the entry.
// Browsers take PNG cursors with the hotspot in CSS, so: PNG files + src/art/cursors.gen.ts.
{
  const CURSORS: Record<string, string> = {
    normal: '鼠标正常FOR2000', attack: '攻击FOR2000', talk: 'NPC对话FOR2000', pick: '拣物品FOR2000', buy: '买物品FOR2000',
    sell: '卖物品FOR2000', repair: '修物品FOR2000', view: '看objFOR2000', help: '查询图标FOR2000', bind: '绑定FOR2000', unbind: '解除FOR2000',
  };
  const out: Record<string, { url: string; x: number; y: number }> = {};
  fs.mkdirSync(path.join(OUT, 'cursor'), { recursive: true });
  for (const [name, file] of Object.entries(CURSORS)) {
    const where = resolveAny(`\\spr\\Ui3\\鼠标\\${file}.cur`);
    if (!where) { console.log(`  cursor ${name}: missing`); continue; }
    const c = decodeCur(fs.readFileSync(where));
    await sharp(c.px, { raw: { width: c.w, height: c.h, channels: 4 } }).png().toFile(path.join(OUT, 'cursor', `${name}.png`));
    out[name] = { url: `assets/ui/cursor/${name}.png`, x: c.hotX, y: c.hotY };
    console.log(`  cursor/${name}.png ${c.w}x${c.h} hotspot ${c.hotX},${c.hotY}`);
  }
  const ts = `// Generated by tools/gen-ui.ts from the original \\spr\\Ui3\\鼠标\\*.cur. Do not edit.\n` +
    `export const CURSORS: Record<string, { url: string; x: number; y: number }> = ${JSON.stringify(out, null, 2)};\n`;
  fs.writeFileSync(path.resolve(HERE, '../src/art/cursors.gen.ts'), ts);
}
await generateLoginFigures();
updateManifest(['core']);
console.log('done');

/** First image of a Windows .cur: RGBA pixels (top-down) + hotspot. */
function decodeCur(b: Buffer): { w: number; h: number; hotX: number; hotY: number; px: Buffer } {
  if (b.readUInt16LE(2) !== 2) throw new Error('not a cursor');
  const hotX = b.readUInt16LE(10), hotY = b.readUInt16LE(12), off = b.readUInt32LE(18);
  if (b.readUInt32LE(off) !== 40) throw new Error('PNG cursors not handled');
  const w = b.readInt32LE(off + 4), h = b.readInt32LE(off + 8) / 2, bpp = b.readUInt16LE(off + 14);
  const colors = bpp <= 8 ? b.readUInt32LE(off + 32) || 1 << bpp : 0;
  const pal = off + 40, xor = pal + colors * 4;
  const xorStride = Math.ceil((w * bpp) / 32) * 4, andStride = Math.ceil(w / 32) * 4, and = xor + xorStride * h;
  const px = Buffer.alloc(w * h * 4);
  let anyAlpha = false;
  for (let y = 0; y < h; y++) {
    const row = h - 1 - y; // bottom-up
    for (let x = 0; x < w; x++) {
      const d = (y * w + x) * 4;
      let r: number, g: number, bl: number, a = 255;
      if (bpp === 32) {
        const s = xor + row * xorStride + x * 4;
        bl = b[s]; g = b[s + 1]; r = b[s + 2]; a = b[s + 3];
        if (a) anyAlpha = true;
      } else {
        const bit = x * bpp, byte = b[xor + row * xorStride + (bit >> 3)];
        const idx = bpp === 8 ? byte : (byte >> (8 - bpp - (bit & 7))) & ((1 << bpp) - 1);
        const p = pal + idx * 4;
        bl = b[p]; g = b[p + 1]; r = b[p + 2];
      }
      const masked = (b[and + row * andStride + (x >> 3)] >> (7 - (x & 7))) & 1;
      px[d] = r; px[d + 1] = g; px[d + 2] = bl; px[d + 3] = bpp === 32 ? a : masked ? 0 : 255;
      if (bpp === 32) px[d + 3] = masked && !a ? 0 : a;
    }
  }
  if (bpp === 32 && !anyAlpha) {
    // 32 bpp without alpha: the AND mask decides.
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const masked = (b[and + (h - 1 - y) * andStride + (x >> 3)] >> (7 - (x & 7))) & 1;
      px[(y * w + x) * 4 + 3] = masked ? 0 : 255;
    }
  }
  return { w, h, hotX, hotY, px };
}
