const BILL_MAP: Record<string, number> = {
    "1": 5000,
    "2": 1000,
    "3": 500,
    "4": 100,
    "5": 50,
    "6": 20,
    "7": 10,
    "8": 5,
    "9": 2,
    "0": 1,
    "99": 2000
};

export function billMapExpand(expr: string): string {
  return expr
    // handle with qty
    .replace(/(\d+)[zZ](\d+)/g, (_, code, qty) => {
      if (BILL_MAP[code] !== undefined) {
        return `${BILL_MAP[code]}*${qty}`;
      }
      return `${code}*${qty}`;
    })
    // handle without qty → default to 1
    .replace(/(\d+)[zZ](?!\d)/g, (_, code) => {
      if (BILL_MAP[code] !== undefined) {
        return `${BILL_MAP[code]}*1`;
      }
      return `${code}*1`;
    });
}
