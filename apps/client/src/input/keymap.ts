/**
 * Keyboard shortcuts in one table: the world scene binds them, the interface shows them (Tùy chỉnh → Phím tắt,
 * button titles). `code` is the Phaser key name. Esc is handled by the window manager (ui/kit/dialog.ts) before
 * the game sees it. Touch screens (mobile) will get buttons for the same actions.
 */
export const KEYS = {
  skills: { code: 'F', label: 'F' },
  bag: { code: 'I', label: 'I' },
  /**
   * Trang bị và Thuộc tính. Was F3 like SHXT; no F-row keys (USER 2026-11-13: hard to press on some keyboards,
   * e.g. laptops with Fn) — C like "Character".
   */
  char: { code: 'C', label: 'C' },
  travel: { code: 'T', label: 'T' },
  bigmap: { code: 'TAB', label: 'Tab' },
  mount: { code: 'M', label: 'M' },
  pk: { code: 'P', label: 'P' },
  auto: { code: 'Z', label: 'Z' },
  /** Tổ đội, Kỳ Trân Các, Thợ rèn (USER 2026-11-12: phím tắt cho thanh dưới). */
  team: { code: 'G', label: 'G' },
  kytran: { code: 'K', label: 'K' },
  shop: { code: 'B', label: 'B' },
  system: { code: 'ESC', label: 'Esc' },
} as const;

export type KeyAction = keyof typeof KEYS;

/** Keys 1–9: the skills on the quick bar. */
export const SLOT_KEYS = ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'] as const;

export const keyLabel = (action: KeyAction): string => KEYS[action].label;

/** Tùy chỉnh → Phím tắt: [what to press, what it does]. ("T" / "P" in the texts are the quick bar's mouse slots.) */
export function shortcutHelp(): [string, string][] {
  const k = keyLabel;
  return [
    ['Click đất / bản đồ nhỏ', 'Chạy tới'],
    ['Click quái / người', 'Khóa mục tiêu, đánh liên tục bằng chiêu chuột trái (T)'],
    ['Chuột phải', 'Chiêu chuột phải (P)'],
    ['1 – 9', 'Chiêu trên thanh phím tắt'],
    [`${k('char')} · ${k('skills')} · ${k('bag')} · ${k('travel')} · ${k('bigmap')}`, 'Trang bị và Thuộc tính · Kỹ năng · Hành trang · Chuyển map · Bản đồ lớn'],
    [`${k('mount')} · ${k('pk')}`, 'Lên / xuống ngựa · Đổi chế độ PK (Luyện công → Chiến đấu → Đồ sát)'],
    [`${k('team')} · ${k('kytran')} · ${k('shop')}`, 'Tổ đội · Kỳ Trân Các · Thợ rèn (trong thành)'],
    [k('auto'), 'Bật / tắt tự động đánh'],
    [k('system'), 'Đóng cửa sổ trên cùng / mở Hệ thống'],
    ['Lăn chuột', 'Phóng to / thu nhỏ'],
  ];
}
