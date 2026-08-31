import { formatINR, type Entry } from "@/data/ledger";

export function EntryTable({
  entries,
  direction,
  headings = ["Customer / slip", "Remarks", "Time", "Amount"],
}: {
  entries: Entry[];
  direction: "in" | "out";
  headings?: [string, string, string, string] | string[];
}) {
  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr className="border-b border-border">
          {headings.map((h, i) => (
            <th
              key={h}
              className={`label-caps px-6 pb-3 font-normal ${i > 1 ? "text-right" : "text-left"}`}
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {entries.map((e) => (
          <tr key={e.slip} className="border-b border-border/70 last:border-0">
            <td className="px-6 py-4">
              <span className="block font-medium">{e.party}</span>
              <span className="num block text-[11px] text-muted-foreground">{e.slip}</span>
            </td>
            <td className="px-6 py-4 text-muted-foreground">{e.remarks}</td>
            <td className="num px-6 py-4 text-right text-xs text-muted-foreground">{e.time}</td>
            <td
              className={`num px-6 py-4 text-right font-medium ${
                direction === "in" ? "text-inflow" : "text-outflow"
              }`}
            >
              {direction === "in" ? "+" : "−"}₹{formatINR(e.amount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
