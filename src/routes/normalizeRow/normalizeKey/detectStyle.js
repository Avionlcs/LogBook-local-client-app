function detectStyle(key) {
  if (/^[a-z]+([A-Z][a-z0-9]+)+$/.test(key)) return "camel";     // salePrice
  if (/^[A-Z][a-z0-9]+([A-Z][a-z0-9]+)*$/.test(key)) return "pascal"; // SalePrice
  if (/^[a-z0-9]+(_[a-z0-9]+)+$/.test(key)) return "snake";      // sale_price
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(key)) return "kebab";      // sale-price
  if (/^[A-Z0-9_]+$/.test(key)) return "screaming";              // SALE_PRICE
  if (/\s+/.test(key)) return "spaced";                          // Sale Price
  return "unknown";
}

module.exports = detectStyle;