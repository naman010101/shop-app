// Sample ledger data — swap these arrays for your API response.

export type Entry = {
  party: string;
  slip: string;
  remarks: string;
  time: string;
  amount: number;
};

export const inflows: Entry[] = [
  { party: "Meera Traders", slip: "SLIP-0482", remarks: "Walk-in counter", time: "10:24", amount: 12500 },
  { party: "Kiran Exports", slip: "SLIP-0483", remarks: "UPI transfer", time: "11:47", amount: 8200 },
  { party: "Suresh & Sons", slip: "SLIP-0484", remarks: "Cash — back-dated entry", time: "14:02", amount: 21000 },
  { party: "Walk-in", slip: "SLIP-0485", remarks: "Carton sales", time: "16:38", amount: 20700 },
];

export const outflows: Entry[] = [
  { party: "Godown rent", slip: "VCH-0211", remarks: "Monthly · Main store", time: "09:10", amount: 18000 },
  { party: "Ravi Transport", slip: "VCH-0212", remarks: "Party dispatch · 3 crates", time: "12:35", amount: 9400 },
  { party: "Staff advance", slip: "VCH-0213", remarks: "Anil K.", time: "15:20", amount: 6500 },
  { party: "Packaging", slip: "VCH-0214", remarks: "Shop transfer", time: "17:05", amount: 5000 },
];

export const balance = {
  opening: 124750,
  net: 23500,
  closing: 148250,
  verifiedBy: "Arun V.",
  verifiedAt: "19:15",
  slips: 7,
};

export const totals = {
  inflow: 62400,
  outflow: 38900,
};

/** Last 7 days net movement, in thousands. */
export const weekly = [14.2, 16.8, 9.4, 21.1, 15.6, 22.4, 23.5];

export const stats = [
  { label: "Inflow today", value: "₹62,400", note: "4 slips" },
  { label: "Outflow today", value: "₹38,900", note: "4 vouchers" },
  { label: "Flagged", value: "1", note: "Back-dated entry" },
  { label: "Team", value: "3", note: "Arun, Anil, Priya" },
];

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
