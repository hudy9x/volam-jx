import { MARKET_PRICING as config } from './tuning.js';
import { itemDef, QUALITY, type Item } from '../items/items.js';
import { MAGIC_ATTRIBS } from '../items/magicattrib.gen.js';
import { KNB_PRICE, MAX_MONEY } from '../items/shops.js';

/** CHỌN pricing policy, kept outside generated item data; restart server/runner after editing JSON. */
function validatePolicy(): void {
  const finite = (n: number, min = 0) => Number.isFinite(n) && n >= min;
  for (const policy of [config.green, config.gold]) {
    if (![policy.baseMoney, policy.perLevelMoney, policy.minMoney, policy.maxMoney].every(n => finite(n))
      || policy.minMoney < 1 || policy.minMoney > policy.maxMoney || policy.maxMoney > MAX_MONEY
      || !finite(policy.minScore) || policy.minScore > 1) throw Error('market-pricing.json: giá hoặc ngưỡng chất lượng không hợp lệ.');
  }
  if (!finite(config.green.targetWeight, 1) || !Number.isSafeInteger(config.currency.moneyStep) || config.currency.moneyStep < 1
    || !finite(config.currency.knbFromMoney, KNB_PRICE) || !Number.isSafeInteger(config.history.maxSales) || config.history.maxSales < 1
    || config.history.learningEnabled !== false) throw Error('market-pricing.json: cấu hình tiền/lịch sử sai; học giá thị trường chưa được bật hỗ trợ.');
  if (!finite(config.quality.baseMultiplier) || !finite(config.quality.scoreMultiplier)
    || !finite(config.quality.hiddenFactor) || config.quality.hiddenFactor > 1 || !finite(config.quality.synergyMultiplier)) throw Error('market-pricing.json: hệ số chất lượng không hợp lệ.');
  for (const table of [config.attributes, config.kindMultipliers, ...Object.values(config.kindAttributes)]) {
    if (!Object.values(table).every(n => finite(n))) throw Error('market-pricing.json: trọng số phải là số hữu hạn không âm.');
  }
  for (const override of Object.values(config.itemOverrides) as {baseMoney?:number; minMoney?:number; maxMoney?:number}[]) {
    if (!Object.values(override).every(n => finite(n)) || (override.minMoney ?? 1) > (override.maxMoney ?? MAX_MONEY)) throw Error('market-pricing.json: giá riêng từng món không hợp lệ.');
  }
}
validatePolicy();
export interface ItemValuation {
  version: number;
  group: string;
  score: number;
  money: number;
  currency: 'money' | 'knb';
  price: number;
  reasons: string[];
}
export interface MarketSale {
  at: number; offerId: number; uid: string; def: string; group: string;
  score: number; currency: 'money' | 'knb'; price: number;
  buyer: string; seller: string; eligible: boolean;
}

/** Actual rolled options, normalised within their own kind/level/series/prefix or exact gold row. */
export function valueMarketItem(item: Item): ItemValuation | null {
  const def = itemDef(item);
  if (!def || (!def.gold && item.q !== QUALITY.magic)) return null;
  const gold = !!def.gold, policy = gold ? config.gold : config.green;
  const weights = config.attributes as Record<string, number>;
  const kindWeights = (config.kindAttributes as Record<string, Record<string, number>>)[def.kind] ?? {};
  let total = 0, possible = 0;
  const useful = new Set<string>();
  for (const [index, [attr, value, hidden]] of (item.magic ?? []).entries()) {
    if (!Number.isFinite(value) || value <= 0 || useful.has(attr)) continue;
    const weight = kindWeights[attr] ?? weights[attr] ?? 0;
    if (weight <= 0) continue;
    const fixed = def.gold?.lines[index];
    const rows = gold ? [] : MAGIC_ATTRIBS.filter(r => r.attr === attr && r.prefix === !hidden
      && r.level <= def.level && r.kinds.includes(def.kind) && (r.weights[def.kind] ?? 0) > 0 && (!hidden || r.series === item.series));
    const hi = gold ? fixed?.[0] === attr ? Math.max(fixed[1][0], fixed[2][0]) : 0 : Math.max(0, ...rows.map(r => r.max));
    const lo = gold && fixed?.[0] === attr ? Math.min(fixed[1][0], fixed[2][0]) : 0;
    if (!hi || value > hi) continue; // Unknown/invalid options never inflate a price.
    const ratio = gold ? hi === lo ? 1 : Math.max(0, (value - lo) / (hi - lo)) : value / hi;
    total += weight * ratio * (hidden ? config.quality.hiddenFactor : 1);
    possible += weight * (gold && hidden ? config.quality.hiddenFactor : 1);
    useful.add(attr);
  }
  if (!possible) return null;
  const score = Math.min(1, total / (gold ? possible : config.green.targetWeight));
  if (score < policy.minScore) return null;
  const profile = config.profiles.find(p => p.attrs.filter(a => useful.has(a)).length >= p.minLines && p.requires.every(a => useful.has(a)));
  const override = (config.itemOverrides as Record<string, { baseMoney?: number; minMoney?: number; maxMoney?: number }>)[def.id];
  const floor = Math.max(1, override?.minMoney ?? policy.minMoney);
  const ceiling = Math.min(MAX_MONEY, override?.maxMoney ?? policy.maxMoney);
  const base = override?.baseMoney ?? policy.baseMoney + policy.perLevelMoney * def.level;
  const multiplier = (config.kindMultipliers as Record<string, number>)[def.kind] ?? 1;
  const raw = base * multiplier * (config.quality.baseMultiplier + score * config.quality.scoreMultiplier)
    * (profile ? config.quality.synergyMultiplier : 1);
  const money = Math.min(ceiling, Math.max(floor, Math.round(raw / config.currency.moneyStep) * config.currency.moneyStep));
  if (!Number.isSafeInteger(money) || money <= 0 || floor > ceiling) return null;
  // Use KNB only when the exact represented value stays inside the configured price bounds.
  const knb = Math.max(1, Math.round(money / KNB_PRICE));
  const currency = money >= config.currency.knbFromMoney && knb * KNB_PRICE >= floor && knb * KNB_PRICE <= ceiling ? 'knb' : 'money';
  const group = gold ? `gold:${def.id}` : `green:${def.kind}:${def.level}:${item.series ?? -1}:${profile?.name ?? 'Khác'}`;
  return { version: config.version, group, score, money: currency === 'knb' ? knb * KNB_PRICE : money,
    currency, price: currency === 'knb' ? knb : money,
    reasons: [gold ? 'Hoàng kim: so roll theo đúng món' : 'Đồ xanh: tính theo loại/cấp/hệ và dòng thực dụng',
      `Điểm chất lượng ${Math.round(score * 100)}/100`, ...(profile ? [`Phối hợp ${profile.name}`] : []),
      'Giá khởi điểm cấu hình; chưa điều chỉnh theo thị trường'] };
}
