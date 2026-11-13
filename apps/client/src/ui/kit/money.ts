import { moneyText } from '@vltk/shared';
import './money.css';

/**
 * Tiền túi as the original bag shows it (ui3/随身物品.ini [MoneyIcon] + [Money]): the silver icon, then the amount in
 * plain digits, gold (255,217,78), centred in a 110 px box.
 */
export const moneyHtml = (id: string): string =>
  `<div class="money-row" title="Tiền túi (lượng)"><i class="money-icon"></i><span class="money" id="${id}"></span></div>`;

export function setMoney(el: HTMLElement, amount: number): void {
  const text = moneyText(amount);
  if (el.textContent !== text) el.textContent = text;
}
