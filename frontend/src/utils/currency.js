const COUNTRY_CURRENCY = {
  ge: { code: 'GEL', symbol: '₾' },
  tr: { code: 'TRY', symbol: '₺' },
  az: { code: 'AZN', symbol: '₼' },
  am: { code: 'AMD', symbol: '֏' },
  ru: { code: 'RUB', symbol: '₽' },
  ua: { code: 'UAH', symbol: '₴' },
  de: { code: 'EUR', symbol: '€' },
  fr: { code: 'EUR', symbol: '€' },
  it: { code: 'EUR', symbol: '€' },
  es: { code: 'EUR', symbol: '€' },
  gr: { code: 'EUR', symbol: '€' },
  gb: { code: 'GBP', symbol: '£' },
  us: { code: 'USD', symbol: '$' },
  pl: { code: 'PLN', symbol: 'zł' },
  bg: { code: 'BGN', symbol: 'лв' },
  ro: { code: 'RON', symbol: 'lei' },
  kz: { code: 'KZT', symbol: '₸' },
  il: { code: 'ILS', symbol: '₪' },
  ae: { code: 'AED', symbol: 'AED' },
  cn: { code: 'CNY', symbol: '¥' },
};

export const DEFAULT_CURRENCY = { code: 'USD', symbol: '$' };
export const GEORGIA_CURRENCY = { code: 'GEL', symbol: '₾' };

export function getCurrencyForCountry(code) {
  if (!code) return null;
  return COUNTRY_CURRENCY[code.toLowerCase()] || null;
}

export function deriveCurrencyFromLanding({ search_scope, search_countries } = {}) {
  if (search_scope === 'georgia') return GEORGIA_CURRENCY;
  if (search_scope === 'custom' && Array.isArray(search_countries) && search_countries.length) {
    return getCurrencyForCountry(search_countries[0]) || DEFAULT_CURRENCY;
  }
  return DEFAULT_CURRENCY;
}
