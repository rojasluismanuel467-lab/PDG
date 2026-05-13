import type { ImplementationRoadmap, Initiative, Phase } from "@/lib/types/roadmap.types";

const safe = (v: unknown) => String(v ?? "").replace(/\s+/g, " ").trim();

const money = (value: number) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);

const sortByDate = (a: Initiative, b: Initiative) =>
  (a.start_date ?? "9999-12-31").localeCompare(b.start_date ?? "9999-12-31");

export function buildRoadmapTxtReport(roadmap: ImplementationRoadmap): string {
  const lines: string[] = [];
  const now = new Date().toISOString();
  lines.push("ARQDATA | Roadmap de Implementacion");
  lines.push(`Generado: ${now}`);
  lines.push("");
  lines.push(`Duracion (meses): ${roadmap.duration_total_months}`);
  lines.push(`Presupuesto total: ${money(roadmap.budget_total)}`);
  lines.push(`Fases: ${roadmap.phases.length}`);
  lines.push("");

  if (roadmap.milestones?.length) {
    lines.push("HITOS");
    roadmap.milestones
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((m) => {
        lines.push(`- ${safe(m.date)} | ${safe(m.name)}${m.description ? ` | ${safe(m.description)}` : ""}`);
      });
    lines.push("");
  }

  roadmap.phases.forEach((p, idx) => {
    lines.push(`FASE ${idx + 1}: ${safe(p.name)}`);
    lines.push(`Periodo: ${safe(p.start_date)} - ${safe(p.end_date)}`);
    if (p.description) lines.push(`Descripcion: ${safe(p.description)}`);
    lines.push(`Presupuesto fase: ${money(p.budget_total)}`);
    lines.push(`Iniciativas: ${p.initiatives.length}`);
    lines.push("");

    p.initiatives.slice().sort(sortByDate).forEach((i) => {
      lines.push(`  ${safe(i.code ?? i.id)} | ${safe(i.name)}`);
      lines.push(`  Proyecto: ${safe(i.project_ref ?? "-")}`);
      lines.push(`  Stream: ${safe(i.stream)} | Estado: ${safe(i.status)} | Prioridad: ${safe(i.priority)}`);
      lines.push(`  Owner: ${safe(i.owner)} | Fechas: ${safe(i.start_date ?? "-")} - ${safe(i.end_date ?? "-")}`);
      lines.push(`  Presupuesto: ${money(i.budget)}`);
      if (i.description) lines.push(`  Descripcion: ${safe(i.description)}`);

      if (i.quick_wins?.length) {
        lines.push(`  Quick wins:`);
        i.quick_wins.forEach((w) => lines.push(`    - ${safe(w)}`));
      }

      if (i.dependency_ids?.length) {
        lines.push(`  Dependencias: ${i.dependency_ids.map((d) => safe(d)).join(", ")}`);
      }

      const arts = i.traceability?.artifacts ?? [];
      const gaps = i.traceability?.gaps ?? [];
      const mat = i.traceability?.maturity ?? [];

      if (arts.length) {
        lines.push("  Artefactos relacionados:");
        arts.forEach((a) => lines.push(`    - ${safe(a.stage)} | ${safe(a.name)} (${safe(a.id)})`));
      }
      if (gaps.length) {
        lines.push("  Brechas:");
        gaps.forEach((g) => lines.push(`    - ${safe(g.id)} | ${safe(g.severity)} | ${safe(g.title)}`));
      }
      if (mat.length) {
        lines.push("  Madurez (DAMA):");
        mat.forEach((m) =>
          lines.push(`    - ${safe(m.domain)}${m.subdomain ? ` | ${safe(m.subdomain)}` : ""}`)
        );
      }

      lines.push("");
    });
  });

  return lines.join("\n").trimEnd() + "\n";
}

const escapeHtml = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

function renderInitiativeRow(i: Initiative): string {
  return `
    <tr>
      <td class="mono">${escapeHtml(safe(i.code ?? i.id))}</td>
      <td>${escapeHtml(safe(i.name))}</td>
      <td class="mono">${escapeHtml(safe(i.project_ref ?? "-"))}</td>
      <td>${escapeHtml(safe(i.stream))}</td>
      <td>${escapeHtml(safe(i.status))}</td>
      <td>${escapeHtml(safe(i.priority))}</td>
      <td>${escapeHtml(safe(i.owner))}</td>
      <td class="mono">${escapeHtml(safe(i.start_date ?? "-"))}</td>
      <td class="mono">${escapeHtml(safe(i.end_date ?? "-"))}</td>
      <td class="mono right">${escapeHtml(money(i.budget))}</td>
    </tr>
  `.trim();
}

function renderPhaseSection(p: Phase, idx: number): string {
  const initiatives = p.initiatives.slice().sort(sortByDate);
  return `
    <section class="card">
      <div class="card-h">
        <div>
          <div class="kicker">FASE ${idx + 1}</div>
          <h2>${escapeHtml(safe(p.name))}</h2>
          <div class="sub">${escapeHtml(safe(p.start_date))} - ${escapeHtml(safe(p.end_date))}</div>
        </div>
        <div class="meta">
          <div><span class="lbl">Presupuesto</span><span class="val mono">${escapeHtml(money(p.budget_total))}</span></div>
          <div><span class="lbl">Iniciativas</span><span class="val mono">${initiatives.length}</span></div>
        </div>
      </div>
      ${p.description ? `<p class="desc">${escapeHtml(safe(p.description))}</p>` : ""}

      <table class="tbl">
        <thead>
          <tr>
            <th>Codigo</th>
            <th>Iniciativa</th>
            <th>Proyecto</th>
            <th>Stream</th>
            <th>Estado</th>
            <th>Prioridad</th>
            <th>Owner</th>
            <th>Inicio</th>
            <th>Fin</th>
            <th class="right">Presupuesto</th>
          </tr>
        </thead>
        <tbody>
          ${initiatives.map(renderInitiativeRow).join("\n")}
        </tbody>
      </table>
    </section>
  `.trim();
}

export function buildRoadmapHtmlReport(roadmap: ImplementationRoadmap): string {
  const now = new Date().toISOString();
  const phasesHtml = roadmap.phases.map((p, idx) => renderPhaseSection(p, idx)).join("\n");
  const milestonesHtml = (roadmap.milestones ?? [])
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(
      (m) =>
        `<li><span class="mono">${escapeHtml(safe(m.date))}</span> <strong>${escapeHtml(
          safe(m.name)
        )}</strong>${m.description ? ` <span class="muted">- ${escapeHtml(safe(m.description))}</span>` : ""}</li>`
    )
    .join("\n");

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roadmap de Implementacion</title>
  <style>
    :root { --bg:#0b1220; --paper:#ffffff; --ink:#0f172a; --muted:#475569; --border:#e2e8f0; --accent:#28b8d5; }
    *{ box-sizing:border-box; }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; background: #f1f5f9; color: var(--ink); }
    .wrap{ max-width: 1100px; margin: 24px auto; padding: 0 16px; }
    .topbar{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom: 14px; }
    .btn{ display:inline-flex; align-items:center; gap:8px; border:1px solid var(--border); background: white; padding: 10px 12px; border-radius: 12px; cursor:pointer; font-weight:600; }
    .btn.primary{ background: var(--accent); border-color: var(--accent); color:white; }
    .sheet{ background: var(--paper); border:1px solid var(--border); border-radius: 16px; box-shadow: 0 8px 32px rgba(15,23,42,0.08); overflow:hidden; }
    header{ padding: 18px 20px; border-bottom:1px solid var(--border); background: linear-gradient(90deg, rgba(40,184,213,0.10), rgba(2,132,199,0.06)); }
    h1{ margin:0; font-size: 18px; letter-spacing: -0.2px; }
    .sub{ margin-top: 4px; color: var(--muted); font-size: 12px; }
    .grid{ display:grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; padding: 14px 20px; border-bottom:1px solid var(--border); }
    .stat{ border:1px solid var(--border); border-radius: 14px; padding: 10px 12px; }
    .stat .k{ font-size: 11px; color: var(--muted); }
    .stat .v{ font-size: 15px; font-weight:700; margin-top: 2px; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    main{ padding: 16px 20px; }
    .card{ border:1px solid var(--border); border-radius: 16px; padding: 14px; margin-bottom: 12px; }
    .card-h{ display:flex; align-items:flex-start; justify-content:space-between; gap: 12px; margin-bottom: 10px; }
    .kicker{ font-size: 11px; color: var(--muted); letter-spacing: 0.8px; }
    h2{ margin: 0; font-size: 16px; }
    .meta{ display:flex; gap: 14px; flex-wrap:wrap; align-items:flex-end; }
    .meta .lbl{ display:block; font-size: 10px; color: var(--muted); }
    .meta .val{ display:block; font-weight: 800; }
    .desc{ margin: 0 0 10px 0; color: var(--muted); font-size: 12px; }
    .tbl{ width: 100%; border-collapse: collapse; }
    .tbl th, .tbl td{ border-top:1px solid var(--border); padding: 9px 8px; font-size: 12px; text-align:left; vertical-align: top; }
    .tbl th{ color: var(--muted); font-weight: 700; background: #f8fafc; }
    .right{ text-align:right; }
    ul{ margin: 8px 0 0 16px; padding: 0; }
    .muted{ color: var(--muted); }
    @media print {
      body{ background: white; }
      .wrap{ margin: 0; max-width: none; padding: 0; }
      .topbar{ display:none; }
      .sheet{ border: none; box-shadow: none; border-radius: 0; }
      .card{ break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="mono muted">ARQDATA | Roadmap</div>
      <div style="display:flex; gap:10px;">
        <button class="btn" onclick="window.close()">Cerrar</button>
        <button class="btn primary" onclick="window.print()">Imprimir / Guardar PDF</button>
      </div>
    </div>

    <div class="sheet">
      <header>
        <h1>Roadmap de Implementacion</h1>
        <div class="sub">Generado: <span class="mono">${escapeHtml(now)}</span></div>
      </header>

      <div class="grid">
        <div class="stat"><div class="k">Duracion (meses)</div><div class="v mono">${escapeHtml(
          String(roadmap.duration_total_months)
        )}</div></div>
        <div class="stat"><div class="k">Presupuesto total</div><div class="v mono">${escapeHtml(
          money(roadmap.budget_total)
        )}</div></div>
        <div class="stat"><div class="k">Fases</div><div class="v mono">${escapeHtml(
          String(roadmap.phases.length)
        )}</div></div>
        <div class="stat"><div class="k">Hitos</div><div class="v mono">${escapeHtml(
          String((roadmap.milestones ?? []).length)
        )}</div></div>
      </div>

      <main>
        ${
          (roadmap.milestones ?? []).length
            ? `<section class="card"><div class="card-h"><div><div class="kicker">HITOS</div><h2>Hitos clave</h2></div></div><ul>${milestonesHtml}</ul></section>`
            : ""
        }
        ${phasesHtml}
      </main>
    </div>
  </div>
</body>
</html>
  `.trim();
}

