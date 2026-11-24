/**
 * Keyboard shortcuts in one table: the world scene binds them, the interface shows them (Tùy chỉnh → Phím tắt,
 * button titles). `code` is the Phaser key name. Esc is handled by the window manager (ui/kit/dialog.ts) before
 * the game sees it. Touch screens (mobile) will get buttons for the same actions.
 */
export const KEYS = {
  skills: { code: 'E', label: 'E' },
  bag: { code: 'W', label: 'W' },
  /**
   * Trang bị và Thuộc tính. Was F3 like SHXT; no F-row keys (USER 2026-11-13: hard to press on some keyboards,
   * e.g. laptops with Fn). USER 2026-11-14: Q-W-E-R-T / A-S-Z-D-V-P layout (Phương án B).
   */
  char: { code: 'Q', label: 'Q' },
  travel: { code: 'T', label: 'T' },
  bigmap: { code: 'TAB', label: 'Tab' },
  mount: { code: 'M', label: 'M' },
  pk: { code: 'A', label: 'A' },
  auto: { code: 'Z', label: 'Z' },
  autoToggle: { code: 'F', label: 'F' },
  /** Tổ đội, Kỳ Trân Các, Thợ rèn (USER 2026-11-12: phím tắt cho thanh dưới). */
  team: { code: 'P', label: 'P' },
  kytran: { code: 'V', label: 'V' },
  shop: { code: 'D', label: 'D' },
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
    ['1 – 9', 'Dùng thuốc hoặc chọn nhanh chiêu thức cho chuột trái (T)'],
    [`${k('char')} · ${k('skills')} · ${k('bag')} · ${k('travel')} / Shift+${k('bigmap')} · ${k('bigmap')}`, 'Trang bị và Thuộc tính · Kỹ năng · Hành trang · Chuyển map (Xa phu) · Bản đồ'],
    [`${k('mount')} · ${k('pk')}`, 'Lên / xuống ngựa · Đổi chế độ PK (Luyện công → Chiến đấu → Đồ sát)'],
    [`${k('team')} · ${k('kytran')} · ${k('shop')}`, 'Tổ đội · Kỳ Trân Các · Thợ rèn (trong thành)'],
    [`${k('auto')} · ${k('autoToggle')} / Shift+${k('auto')}`, 'Mở cài đặt Auto · Bật / tắt nhanh Auto'],
    [k('system'), 'Đóng cửa sổ trên cùng / mở Hệ thống'],
    ['Lăn chuột', 'Phóng to / thu nhỏ'],
  ];
}
