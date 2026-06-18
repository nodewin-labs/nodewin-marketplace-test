import React, { useState, useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from "recharts";

/* ================================================================== *
 *  Nodewin OKR Dashboard — template
 *  Single source of truth: data/okr-dataset.json (injected below).
 *  View mode: OKR tree + progress charts. Edit mode: targets/actuals/
 *  prices/baselines, with change_log discipline on target edits.
 *  The /okr skill replaces __OKR_DATA__ with the JSON file contents.
 * ================================================================== */

const SEED = __OKR_DATA__;

/* ---------- derivation & scoring helpers ---------- */
const lastNum = (arr) => { for (let i = arr.length - 1; i >= 0; i--) if (arr[i] != null) return { v: arr[i], i }; return null; };

function deriveRevenue(data, useActuals) {
  const { drivers, prices } = data.revenue_model;
  const findKR = (id) => { for (const o of data.objectives) for (const k of o.krs) if (k.id === id) return k; return null; };
  const w = findKR(drivers.workshops_sold), m = findKR(drivers.mrr);
  return data.meta.months.map((_, i) => {
    const series = (kr) => (useActuals ? kr.actuals : kr.targets);
    const wi = series(w)?.[i], wprev = i > 0 ? series(w)?.[i - 1] : 0;
    const mi = series(m)?.[i];
    if (useActuals && (wi == null)) return null;
    const newW = (wi ?? 0) - (wprev ?? 0);
    return Math.max(0, newW) * prices.workshop + (mi ?? 0);
  });
}

function krProgress(kr, data, i) {
  const t = kr.targets, a = kr.actuals;
  if (kr.type === "derived") {
    const da = deriveRevenue(data, true)[i];
    return da == null ? null : Math.min(1.2, da / data.revenue_model.success_bar_month);
  }
  if (a?.[i] == null) return null;
  const endT = t[t.length - 1];
  if (kr.type === "inverted") {
    const denom = kr.baseline - endT || 1;
    return Math.min(1.2, Math.max(0, (kr.baseline - a[i]) / denom));
  }
  return Math.min(1.2, endT ? a[i] / endT : 0);
}

/* ---------- view-mode components (v1 listings) ---------- */
function KRRow({ kr, tone, open, onToggle }) {
  const endT = kr.type === "derived" ? null : kr.targets[kr.targets.length - 1];
  return (
    <div className={`kr ${open ? "is-open" : ""}`} style={{ "--tone": tone }}>
      <button className="kr-head" onClick={onToggle}>
        <span className="kr-id mono">{kr.id}</span>
        <span className="kr-statement">{kr.statement}</span>
        <span className="kr-chev mono">{open ? "–" : "+"}</span>
      </button>
      <div className="kr-target mono">
        <span className="kr-commit">{kr.type === "derived" ? "DERIVED" : "COMMITTED"}</span>
        <span className="kr-arrow">{kr.baseline} {kr.unit} → <b>{kr.deadline_note}</b></span>
      </div>
      {open && (
        <div className="kr-projects">
          <span className="kp-label mono">PROJECTS / ACTIVITIES</span>
          <ul>{kr.projects.map((p, i) => (
            <li key={i}><span className="kp-box mono">{String(i + 1).padStart(2, "0")}</span>{p}</li>
          ))}</ul>
        </div>
      )}
    </div>
  );
}

function Objective({ o, openKR, setOpenKR }) {
  return (
    <section className="obj" style={{ "--tone": o.tone }}>
      <div className="obj-head">
        <span className="obj-rank mono">{o.id.replace("O", "0")}</span>
        <div className="obj-main">
          <h2 className="obj-title">{o.title}</h2>
          <p className="obj-why">{o.why}</p>
        </div>
      </div>
      <div className="obj-krs">
        {o.krs.map((kr) => (
          <KRRow key={kr.id} kr={kr} tone={o.tone}
            open={openKR === kr.id} onToggle={() => setOpenKR(openKR === kr.id ? null : kr.id)} />
        ))}
      </div>
    </section>
  );
}

/* ---------- edit-mode components ---------- */
function NumCell({ value, onChange, disabled }) {
  return (
    <input className="numcell" type="number" disabled={disabled}
      value={value ?? ""} placeholder="·"
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))} />
  );
}

function EditKR({ kr, months, tone, onEdit }) {
  if (kr.type === "derived") return (
    <div className="edit-kr derived" style={{ "--tone": tone }}>
      <div className="ek-head"><span className="kr-id mono">{kr.id}</span><span className="ek-name">{kr.statement}</span>
        <span className="ek-derived mono">derived — edit drivers & prices instead</span></div>
    </div>
  );
  return (
    <div className="edit-kr" style={{ "--tone": tone }}>
      <div className="ek-head">
        <span className="kr-id mono">{kr.id}</span>
        <span className="ek-name">{kr.statement}</span>
        <label className="ek-base mono">baseline
          <NumCell value={kr.baseline} onChange={(v) => onEdit(kr.id, "baseline", null, v)} />
        </label>
      </div>
      <div className="ek-grid" style={{ gridTemplateColumns: `70px repeat(${months.length}, 1fr)` }}>
        <span className="ek-rowlab mono"></span>
        {months.map((m) => <span key={m} className="ek-month mono">{m}</span>)}
        <span className="ek-rowlab mono">target</span>
        {months.map((_, i) => (
          <NumCell key={"t" + i} value={kr.targets[i]} onChange={(v) => onEdit(kr.id, "targets", i, v)} />
        ))}
        <span className="ek-rowlab mono">actual</span>
        {months.map((_, i) => (
          <NumCell key={"a" + i} value={kr.actuals[i]} onChange={(v) => onEdit(kr.id, "actuals", i, v)} />
        ))}
      </div>
    </div>
  );
}

/* ---------- main app ---------- */
export default function App() {
  const [data, setData] = useState(SEED);
  const [mode, setMode] = useState("view"); // view | edit
  const [openKR, setOpenKR] = useState(null);
  const [pendingTargetEdits, setPendingTargetEdits] = useState([]);
  const [reason, setReason] = useState("");
  const [exported, setExported] = useState(false);

  const months = data.meta.months;

  /* combined progress chart data: % of Dec target per KR */
  const progressData = useMemo(() => {
    return months.map((m, i) => {
      const row = { month: m };
      data.objectives.forEach((o) => o.krs.forEach((kr) => {
        const p = krProgress(kr, data, i);
        if (p != null) row[kr.id] = Math.round(p * 100);
      }));
      return row;
    });
  }, [data, months]);

  const krList = useMemo(() => {
    const list = [];
    data.objectives.forEach((o) => o.krs.forEach((kr) => list.push({ kr, tone: o.tone })));
    return list;
  }, [data]);

  /* revenue chart: derived target + derived actual + success bar */
  const revenueData = useMemo(() => {
    const t = deriveRevenue(data, false), a = deriveRevenue(data, true);
    return months.map((m, i) => ({ month: m, target: t[i], actual: a[i] }));
  }, [data, months]);

  const handleEdit = (krId, field, idx, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      for (const o of next.objectives) for (const kr of o.krs) {
        if (kr.id !== krId) continue;
        if (field === "baseline") { 
          setPendingTargetEdits((p) => [...p, { kr_id: krId, field: "baseline", old: kr.baseline, new: value }]);
          kr.baseline = value ?? 0;
        }
        else if (field === "targets") {
          setPendingTargetEdits((p) => [...p, { kr_id: krId, field: `targets[${idx}]`, old: kr.targets[idx], new: value }]);
          kr.targets[idx] = value ?? 0;
        }
        else if (field === "actuals") kr.actuals[idx] = value; /* actuals: free */
      }
      next.meta.last_modified = new Date().toISOString().slice(0, 10);
      return next;
    });
  };

  const handlePrice = (key, value) => {
    setData((prev) => {
      const next = JSON.parse(JSON.stringify(prev));
      setPendingTargetEdits((p) => [...p, { kr_id: "revenue_model", field: `prices.${key}`, old: prev.revenue_model.prices[key], new: value }]);
      next.revenue_model.prices[key] = value ?? 0;
      return next;
    });
  };

  const exportJSON = () => {
    const out = JSON.parse(JSON.stringify(data));
    if (pendingTargetEdits.length) {
      const date = new Date().toISOString().slice(0, 10);
      pendingTargetEdits.forEach((e) => out.meta.change_log.push({ date, ...e, reason: reason || "(no reason given)" }));
    }
    const text = JSON.stringify(out, null, 2);
    try {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand("copy"); document.body.removeChild(ta);
      setExported(true); setTimeout(() => setExported(false), 2500);
      setData(out); setPendingTargetEdits([]); setReason("");
    } catch (e) { console.error(e); }
  };

  const targetEditsPending = pendingTargetEdits.length > 0;

  return (
    <div className="wrap">
      <style>{CSS}</style>

      <header className="hero">
        <div className="hero-eyebrow mono">{(data.meta.company || "YOUR COMPANY").toUpperCase()} · OKR DASHBOARD · {data.meta.cycle} · schema v{data.meta.schema_version}</div>
        <h1 className="hero-title">{data.meta.company} OKRs</h1>
        <div className="modebar">
          <button className={`mode ${mode === "view" ? "on" : ""}`} onClick={() => setMode("view")}>View</button>
          <button className={`mode ${mode === "edit" ? "on" : ""}`} onClick={() => setMode("edit")}>Edit targets & actuals</button>
          <button className={`exportbtn ${exported ? "ok" : ""}`} onClick={exportJSON}>
            {exported ? "✓ JSON copied — save to data/okr-dataset.json" : "Export JSON"}
          </button>
        </div>
        {mode === "edit" && (
          <div className={`editnote ${targetEditsPending ? "warn" : ""}`}>
            <span className="mono">{targetEditsPending
              ? `⚠ ${pendingTargetEdits.length} target/price edit(s) pending — a reason is required before export:`
              : "Actuals are free to edit. Target & price edits are logged to change_log with a reason — re-baselining leaves a visible scar."}</span>
            {targetEditsPending && (
              <input className="reasonbox" placeholder="Why are the targets changing? (required)"
                value={reason} onChange={(e) => setReason(e.target.value)} />
            )}
          </div>
        )}
      </header>

      {mode === "view" && (
        <>
          <main className="tree">
            {data.objectives.map((o) => (
              <Objective key={o.id} o={o} openKR={openKR} setOpenKR={setOpenKR} />
            ))}
          </main>

          <section className="charts">
            <div className="chart-block">
              <span className="chart-eye mono">PROGRESS OVERVIEW · % OF DEC TARGET PER KR (= OKR SCORE ×100)</span>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={progressData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid stroke="#232B36" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#6B7787" fontSize={12} />
                    <YAxis stroke="#6B7787" fontSize={12} unit="%" domain={[0, 120]} />
                    <Tooltip contentStyle={{ background: "#151A22", border: "1px solid #232B36", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={100} stroke="#6B7787" strokeDasharray="4 4" label={{ value: "100%", fill: "#6B7787", fontSize: 10 }} />
                    {krList.map(({ kr, tone }) => (
                      <Line key={kr.id} type="monotone" dataKey={kr.id} stroke={tone}
                        strokeWidth={2} dot={{ r: 3 }} connectNulls />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-note">Lines appear as actuals get filled via /okr-update. Inverted KRs (e.g. KR4.2 hours) are normalised so up = good for every line.</p>
            </div>

            <div className="chart-block">
              <span className="chart-eye mono">REVENUE · DERIVED FROM DRIVERS × PRICES (NEVER ENTERED)</span>
              <div className="chart-frame">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={revenueData} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
                    <CartesianGrid stroke="#232B36" strokeDasharray="3 3" />
                    <XAxis dataKey="month" stroke="#6B7787" fontSize={12} />
                    <YAxis stroke="#6B7787" fontSize={12} tickFormatter={(v) => `€${v / 1000}k`} />
                    <Tooltip formatter={(v) => `€${v?.toLocaleString()}`}
                      contentStyle={{ background: "#151A22", border: "1px solid #232B36", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <ReferenceLine y={data.revenue_model.success_bar_month} stroke="#E08D79" strokeDasharray="4 4"
                      label={{ value: `€${data.revenue_model.success_bar_month / 1000}k bar`, fill: "#E08D79", fontSize: 10 }} />
                    <Line type="monotone" dataKey="target" name="Target (derived)" stroke="#6B7787" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="actual" name="Actual (derived)" stroke="#7DD3C0" strokeWidth={2.5} dot={{ r: 4 }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="chart-note">
                month € = new workshops × €{data.revenue_model.prices.workshop.toLocaleString()} + MRR. Change drivers or prices in Edit mode; this chart recalculates.
              </p>
            </div>
          </section>
        </>
      )}

      {mode === "edit" && (
        <main className="editmain">
          <div className="prices">
            <span className="chart-eye mono">PRICES (DRIVE THE REVENUE DERIVATION)</span>
            <div className="price-row">
              {Object.entries(data.revenue_model.prices).map(([k, v]) => (
                <label key={k} className="price mono">{k.replace(/_/g, " ")}
                  <NumCell value={v} onChange={(nv) => handlePrice(k, nv)} />
                </label>
              ))}
            </div>
          </div>
          {data.objectives.map((o) => (
            <div key={o.id} className="edit-obj" style={{ "--tone": o.tone }}>
              <span className="eo-title mono" style={{ color: o.tone }}>{o.id} · {o.title}</span>
              {o.krs.map((kr) => (
                <EditKR key={kr.id} kr={kr} months={months} tone={o.tone} onEdit={handleEdit} />
              ))}
            </div>
          ))}
        </main>
      )}

      {data.meta.change_log.length > 0 && mode === "edit" && (
        <section className="changelog">
          <span className="chart-eye mono">CHANGE LOG · TARGET RE-BASELINES</span>
          <ul>{data.meta.change_log.map((c, i) => (
            <li key={i} className="mono">{c.date} · {c.kr_id} {c.field}: {String(c.old)} → {String(c.new)} — “{c.reason}”</li>
          ))}</ul>
        </section>
      )}

      <footer className="foot">
        <span className="mono">source of truth: data/okr-dataset.json · created by /okr-onboarding · actuals via /okr-update · export edits back to the file</span>
      </footer>
    </div>
  );
}

const CSS = `
* { box-sizing: border-box; }
.wrap {
  --bg:#0E1116; --panel:#151A22; --line:#232B36; --ink-dim:#6B7787; --ink:#C9D3DF; --ink-bright:#EDF2F7;
  background:
    radial-gradient(1100px 600px at 80% -8%, rgba(125,211,192,0.10), transparent 60%),
    radial-gradient(900px 520px at -5% 6%, rgba(157,141,241,0.08), transparent 55%), var(--bg);
  min-height:100vh; color:var(--ink); background-attachment:fixed;
  font-family: ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  padding: clamp(20px,4vw,52px) clamp(14px,4vw,40px) 80px;
}
.mono{font-family:ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,monospace;}
.hero,.tree,.charts,.editmain,.changelog,.foot{max-width:940px;margin-left:auto;margin-right:auto;}

.hero{margin-bottom:clamp(22px,3.5vw,34px);}
.hero-eyebrow{font-size:11px;letter-spacing:0.34em;color:var(--ink-dim);margin-bottom:14px;}
.hero-title{font-size:clamp(30px,5.5vw,52px);line-height:1;margin:0;font-weight:760;letter-spacing:-0.03em;color:var(--ink-bright);}
.modebar{display:flex;flex-wrap:wrap;gap:8px;margin-top:18px;align-items:center;}
.mode{cursor:pointer;background:transparent;border:1px solid var(--line);border-radius:10px;padding:9px 16px;color:var(--ink-dim);font-size:13px;font-weight:600;transition:all .15s;}
.mode:hover{border-color:var(--ink);color:var(--ink);}
.mode.on{background:var(--ink-bright);color:#0E1116;border-color:var(--ink-bright);}
.exportbtn{margin-left:auto;cursor:pointer;background:transparent;border:1px solid #7DD3C0;border-radius:10px;padding:9px 16px;color:#7DD3C0;font-size:13px;font-weight:650;transition:all .15s;}
.exportbtn:hover{background:rgba(125,211,192,0.1);}
.exportbtn.ok{background:#7DD3C0;color:#0E1116;}
.editnote{margin-top:14px;border:1px solid var(--line);border-radius:10px;padding:10px 13px;font-size:11.5px;color:var(--ink-dim);display:grid;gap:9px;}
.editnote.warn{border-color:#F2C14E;color:#F2C14E;}
.reasonbox{background:var(--bg);border:1px solid #F2C14E;border-radius:8px;padding:9px 12px;color:var(--ink-bright);font-size:13px;font-family:inherit;}
.reasonbox:focus{outline:none;}

/* tree (v1 listings) */
.tree{display:grid;gap:14px;}
.obj{background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--tone);border-radius:16px;overflow:hidden;}
.obj-head{display:flex;gap:16px;align-items:flex-start;padding:clamp(16px,2.5vw,20px);}
.obj-rank{flex:0 0 auto;font-size:22px;font-weight:800;color:var(--tone);line-height:1;}
.obj-main{flex:1 1 auto;min-width:0;}
.obj-title{margin:0;font-size:clamp(18px,2.6vw,23px);font-weight:730;letter-spacing:-0.02em;color:var(--ink-bright);line-height:1.15;}
.obj-why{margin:6px 0 0;font-size:13px;line-height:1.5;color:var(--ink-dim);}
.obj-krs{padding:0 clamp(14px,2.5vw,18px) clamp(14px,2.5vw,18px);display:grid;gap:10px;}

.kr{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:13px 14px;transition:border-color .18s;}
.kr:hover{border-color:color-mix(in srgb,var(--tone) 32%,var(--line));}
.kr.is-open{border-color:color-mix(in srgb,var(--tone) 46%,var(--line));}
.kr-head{display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;cursor:pointer;background:transparent;border:none;color:inherit;padding:0;}
.kr-id{flex:0 0 auto;font-size:11px;font-weight:700;color:var(--tone);background:color-mix(in srgb,var(--tone) 12%,transparent);border:1px solid color-mix(in srgb,var(--tone) 30%,transparent);border-radius:6px;padding:2px 7px;margin-top:1px;}
.kr-statement{flex:1 1 auto;font-size:14px;font-weight:600;color:var(--ink-bright);line-height:1.4;}
.kr-chev{flex:0 0 auto;font-size:16px;color:var(--ink-dim);line-height:1;}
.kr-target{display:flex;flex-wrap:wrap;align-items:center;gap:9px;margin-top:10px;font-size:12px;}
.kr-commit{font-size:9.5px;letter-spacing:0.14em;font-weight:700;color:#0E1116;background:var(--tone);padding:3px 7px;border-radius:5px;}
.kr-arrow{color:var(--ink-dim);}
.kr-arrow b{color:var(--ink-bright);}
.kr-projects{margin-top:13px;padding-top:12px;border-top:1px dashed var(--line);}
.kp-label{display:block;font-size:10px;letter-spacing:0.16em;color:var(--ink-dim);margin-bottom:10px;}
.kr-projects ul{list-style:none;margin:0;padding:0;display:grid;gap:8px;}
.kr-projects li{display:flex;gap:10px;align-items:flex-start;font-size:13px;line-height:1.45;color:var(--ink);}
.kp-box{flex:0 0 auto;font-size:10px;font-weight:700;color:var(--tone);margin-top:2px;}

/* charts */
.charts{margin-top:26px;display:grid;gap:18px;}
.chart-block{background:var(--panel);border:1px solid var(--line);border-radius:16px;padding:clamp(14px,2.5vw,20px);}
.chart-eye{display:block;font-size:10.5px;letter-spacing:0.22em;color:var(--ink-dim);margin-bottom:14px;}
.chart-frame{width:100%;}
.chart-note{margin:10px 0 0;font-size:11.5px;line-height:1.5;color:var(--ink-dim);}

/* edit mode */
.editmain{display:grid;gap:16px;}
.prices{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;}
.price-row{display:flex;flex-wrap:wrap;gap:14px;}
.price{display:flex;flex-direction:column;gap:6px;font-size:11px;color:var(--ink-dim);letter-spacing:0.06em;}
.edit-obj{background:var(--panel);border:1px solid var(--line);border-top:2px solid var(--tone);border-radius:14px;padding:16px;display:grid;gap:12px;}
.eo-title{font-size:12px;letter-spacing:0.08em;font-weight:700;}
.edit-kr{background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:12px;}
.edit-kr.derived{opacity:0.75;}
.ek-head{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:10px;}
.ek-name{flex:1 1 auto;font-size:12.5px;font-weight:600;color:var(--ink-bright);min-width:180px;}
.ek-derived{font-size:10.5px;color:var(--ink-dim);font-style:italic;}
.ek-base{display:flex;align-items:center;gap:7px;font-size:10.5px;color:var(--ink-dim);}
.ek-grid{display:grid;gap:4px;overflow-x:auto;}
.ek-month{text-align:center;font-size:10.5px;color:var(--ink-dim);}
.ek-rowlab{font-size:10px;color:var(--ink-dim);align-self:center;}
.numcell{width:100%;min-width:44px;background:var(--panel);border:1px solid var(--line);border-radius:7px;padding:6px 5px;color:var(--ink-bright);font-size:12px;text-align:center;font-family:ui-monospace,Menlo,monospace;}
.numcell:focus{outline:none;border-color:var(--ink);}
.numcell:disabled{opacity:0.4;}

.changelog{margin-top:20px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:14px 16px;}
.changelog ul{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:6px;}
.changelog li{font-size:11px;color:var(--ink-dim);line-height:1.5;}

.foot{margin-top:30px;padding-top:18px;border-top:1px solid var(--line);text-align:center;}
.foot .mono{font-size:11px;color:var(--ink-dim);letter-spacing:0.02em;}
@media (prefers-reduced-motion: reduce){ *{transition:none!important;} }
`;
