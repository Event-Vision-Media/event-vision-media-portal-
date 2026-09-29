import type { ContractBlock, ContractDoc } from "@/lib/contract";
import { restDueDaysFor } from "@/lib/contract";

/** Vertragstext (Kundenportal, Admin, Druckansicht). */
export function ContractDocument({ doc, children }: { doc: ContractDoc; children?: React.ReactNode }) {
  return (
    <article className="contract-doc text-sm leading-relaxed text-anthracite-700">
      <header className="border-b border-anthracite-100 pb-4">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-600">
          Buchung {doc.bookingCode} · Vertragsversion {doc.version}
        </p>
        <h2 className="mt-1 font-serif text-xl font-semibold text-anthracite-800">{doc.title}</h2>
      </header>

      <div className="grid gap-4 border-b border-anthracite-100 py-4 sm:grid-cols-2">
        <Party title="Vermieter" lines={doc.landlord} />
        <Party title="Mieter" lines={doc.renter} />
      </div>

      <section className="border-b border-anthracite-100 py-4">
        <h3 className="font-serif text-base font-semibold text-anthracite-800">Leistungsübersicht</h3>
        <div className="mt-3 space-y-2">
          {doc.lines.map((l, i) => (
            <div key={i} className="flex justify-between gap-4">
              <div>
                <p className="font-medium text-anthracite-800">{l.name}</p>
                {l.features?.length ? <p className="text-xs text-anthracite-500">{l.features.join(" · ")}</p> : null}
              </div>
              <span className="whitespace-nowrap font-medium text-anthracite-800">{l.price}</span>
            </div>
          ))}
          <div className="flex justify-between gap-4 border-t border-anthracite-100 pt-2 font-semibold text-anthracite-800">
            <span>Gesamtpreis</span>
            <span className="whitespace-nowrap">{doc.total}</span>
          </div>
          <div className="flex justify-between gap-4 text-anthracite-500">
            <span>Anzahlung</span>
            <span className="whitespace-nowrap">{doc.deposit}</span>
          </div>
          <div className="flex justify-between gap-4 text-anthracite-500">
            <span>Restbetrag ({restDueDaysFor(doc.version)} Tage vorher oder bar vor Ort)</span>
            <span className="whitespace-nowrap">{doc.rest}</span>
          </div>
          <p className="pt-1 text-xs text-anthracite-400">{doc.taxNote}</p>
        </div>
      </section>

      {doc.sections.map((s, i) => (
        <section key={s.title} className="py-3">
          <h3 className="font-serif text-base font-semibold text-anthracite-800">
            § {i + 1} {s.title}
          </h3>
          <Blocks blocks={s.blocks} />
        </section>
      ))}

      {doc.withdrawal?.map((s) => (
        <section key={s.title} className="mt-2 rounded-xl border border-anthracite-100 bg-sand-50 p-4 print:break-inside-avoid">
          <h3 className="font-serif text-base font-semibold text-anthracite-800">{s.title}</h3>
          <Blocks blocks={s.blocks} />
        </section>
      ))}

      {children}
    </article>
  );
}

function Party({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-anthracite-400">{title}</p>
      {lines.map((l, i) => (
        <p key={i} className={i === 0 ? "font-medium text-anthracite-800" : ""}>
          {l}
        </p>
      ))}
    </div>
  );
}

function Blocks({ blocks }: { blocks: ContractBlock[] }) {
  return (
    <div className="mt-1.5 space-y-2">
      {blocks.map((b, i) =>
        "p" in b ? (
          <p key={i}>{b.p}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.ul.map((li, j) => (
              <li key={j}>{li}</li>
            ))}
          </ul>
        )
      )}
    </div>
  );
}
