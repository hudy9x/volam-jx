import type Phaser from 'phaser';
import type { Element } from '@vltk/shared';

interface GemStyle {
  c0: string;
  c1: string;
  c2: string;
  c3: string;
  glyphColor: string;
  glyphShadow: string;
}

const GEM_STYLES: Record<Element, GemStyle> = {
  kim: {
    c0: '#fff6b0', c1: '#f0b929', c2: '#9d6208', c3: '#4d2c02',
    glyphColor: '#2e1600', glyphShadow: '#ffe985',
  },
  moc: {
    c0: '#a8ffbe', c1: '#22c55e', c2: '#0a6b31', c3: '#033617',
    glyphColor: '#042610', glyphShadow: '#86efac',
  },
  thuy: {
    c0: '#b8f0ff', c1: '#1da1f2', c2: '#0b4d99', c3: '#05204d',
    glyphColor: '#031a3d', glyphShadow: '#93e2ff',
  },
  hoa: {
    c0: '#ffb3b8', c1: '#e6243b', c2: '#8f0a24', c3: '#420312',
    glyphColor: '#2b0208', glyphShadow: '#ff99a8',
  },
  tho: {
    c0: '#e6d8c5', c1: '#9c876e', c2: '#544637', c3: '#261f18',
    glyphColor: '#17120c', glyphShadow: '#e0d2be',
  },
};

export const ELEMENT_BADGE_TEX_SIZE = 36;

export function isElement(value: string | undefined): value is Element {
  return value === 'kim' || value === 'moc' || value === 'thuy' || value === 'hoa' || value === 'tho';
}

function strokeGlyph(ctx: CanvasRenderingContext2D, element: Element): void {
  const seg = (width: number, fn: () => void) => {
    ctx.lineWidth = width;
    ctx.beginPath();
    fn();
    ctx.stroke();
  };

  switch (element) {
    case 'kim': // 金
      seg(2.1, () => {
        ctx.moveTo(18, 9.2); ctx.lineTo(10.5, 15.8);
        ctx.moveTo(18, 9.2); ctx.lineTo(25.5, 15.8);
      });
      seg(2.0, () => {
        ctx.moveTo(13.2, 15.6); ctx.lineTo(22.8, 15.6);
        ctx.moveTo(11.5, 19.8); ctx.lineTo(24.5, 19.8);
        ctx.moveTo(18, 15.6); ctx.lineTo(18, 25.8);
        ctx.moveTo(10.8, 25.8); ctx.lineTo(25.2, 25.8);
      });
      seg(1.8, () => {
        ctx.moveTo(13.4, 21.8); ctx.lineTo(15.2, 24.4);
        ctx.moveTo(22.6, 21.8); ctx.lineTo(20.8, 24.4);
      });
      break;
    case 'moc': // 木
      seg(2.2, () => {
        ctx.moveTo(10.5, 15.5); ctx.lineTo(25.5, 15.5);
        ctx.moveTo(18, 9.5); ctx.lineTo(18, 26.8);
      });
      seg(2.1, () => {
        ctx.moveTo(18, 16.0); ctx.bezierCurveTo(16, 20.2, 13.5, 23.2, 10.5, 25.5);
        ctx.moveTo(18, 16.0); ctx.bezierCurveTo(20, 20.2, 22.5, 23.2, 25.5, 25.5);
      });
      break;
    case 'thuy': // 水
      seg(2.2, () => {
        ctx.moveTo(18, 9.5); ctx.lineTo(18, 25.8); ctx.lineTo(15.4, 23.8);
      });
      seg(2.0, () => {
        ctx.moveTo(10.8, 15.5); ctx.lineTo(14.8, 15.5);
        ctx.bezierCurveTo(14.2, 19.2, 12.6, 22.2, 10.2, 24.6);
      });
      seg(2.0, () => {
        ctx.moveTo(24.6, 13.5); ctx.lineTo(20.6, 17.2);
        ctx.moveTo(18.8, 16.2); ctx.bezierCurveTo(20.8, 19.8, 23.0, 22.6, 25.6, 24.8);
      });
      break;
    case 'hoa': // 火
      seg(2.2, () => {
        ctx.moveTo(18, 9.5); ctx.bezierCurveTo(18, 16.5, 16.4, 21.8, 10.8, 25.8);
        ctx.moveTo(18, 16.8); ctx.bezierCurveTo(19.8, 20.5, 22.2, 23.5, 25.4, 25.8);
      });
      seg(2.0, () => {
        ctx.moveTo(12.4, 13.8); ctx.lineTo(13.8, 18.0);
        ctx.moveTo(24.0, 13.2); ctx.lineTo(21.2, 17.2);
      });
      break;
    case 'tho': // 土
      seg(2.3, () => {
        ctx.moveTo(12.2, 17.4); ctx.lineTo(23.8, 17.4);
        ctx.moveTo(18, 10.2); ctx.lineTo(18, 24.8);
        ctx.moveTo(10.2, 24.8); ctx.lineTo(25.8, 24.8);
      });
      break;
  }
}

/** Draw one 36×36 procedural JX1-style element gem badge onto a 2D canvas context. */
export function drawElementBadge(ctx: CanvasRenderingContext2D, element: Element): void {
  const g = GEM_STYLES[element];
  ctx.clearRect(0, 0, ELEMENT_BADGE_TEX_SIZE, ELEMENT_BADGE_TEX_SIZE);

  // Outer dark outline
  ctx.beginPath();
  ctx.arc(18, 18, 17.2, 0, Math.PI * 2);
  ctx.fillStyle = '#0b0d10';
  ctx.fill();

  // Metallic silver bezel
  const rim = ctx.createLinearGradient(0, 0, 36, 36);
  rim.addColorStop(0, '#f2f4f8');
  rim.addColorStop(0.45, '#a6b0bc');
  rim.addColorStop(1, '#3c434d');
  ctx.beginPath();
  ctx.arc(18, 18, 15.8, 0, Math.PI * 2);
  ctx.fillStyle = rim;
  ctx.fill();

  // Inner dark bevel
  ctx.beginPath();
  ctx.arc(18, 18, 13.8, 0, Math.PI * 2);
  ctx.fillStyle = '#121417';
  ctx.fill();

  // Colored gem body
  const gem = ctx.createRadialGradient(13.4, 12.2, 1, 18, 18, 14.5);
  gem.addColorStop(0, g.c0);
  gem.addColorStop(0.35, g.c1);
  gem.addColorStop(0.78, g.c2);
  gem.addColorStop(1, g.c3);
  ctx.beginPath();
  ctx.arc(18, 18, 13.0, 0, Math.PI * 2);
  ctx.fillStyle = gem;
  ctx.fill();

  // Specular shine
  ctx.save();
  ctx.translate(13.2, 12.0);
  ctx.rotate(-Math.PI / 6);
  ctx.beginPath();
  ctx.ellipse(0, 0, 4.2, 3.0, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.48)';
  ctx.fill();
  ctx.restore();

  // Engraved Hanzi glyph (subtle highlight emboss + dark ink)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.save();
  ctx.translate(0.7, 0.8);
  ctx.strokeStyle = g.glyphShadow;
  ctx.globalAlpha = 0.55;
  strokeGlyph(ctx, element);
  ctx.restore();

  ctx.strokeStyle = g.glyphColor;
  ctx.globalAlpha = 1;
  strokeGlyph(ctx, element);
}

/** Ensure the procedural texture for `element` exists in `scene.textures` and return its key. */
export function ensureElementBadgeTexture(scene: Phaser.Scene, element: Element): string | null {
  const key = `element-badge:${element}`;
  const textures = scene.textures;
  if (!textures) return null;
  if (textures.exists(key)) return key;
  if (typeof textures.createCanvas !== 'function') return null;
  const tex = textures.createCanvas(key, ELEMENT_BADGE_TEX_SIZE, ELEMENT_BADGE_TEX_SIZE);
  if (!tex) return null;
  drawElementBadge(tex.getContext(), element);
  tex.refresh();
  return key;
}
