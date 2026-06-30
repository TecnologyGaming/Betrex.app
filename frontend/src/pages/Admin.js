import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { useLang } from "../contexts/LanguageContext";
import {
  ChartBar, ListChecks, Lightning, Image as ImageIcon, Money,
  CurrencyDollar, Users, Megaphone, Plus, PencilSimple, TrashSimple, Check, X,
  CloudArrowDown, Gift,
} from "@phosphor-icons/react";

const SPORTS = ["football", "horse", "baseball", "lottery"];
const MARKET_TYPES = ["over_under_goals", "draw", "fouls", "red_cards", "custom"];
const ZONES = ["hero", "sidebar", "feed", "footer"];
const PM_TYPES = ["zelle", "stripe", "paypal", "binance", "custom"];

function Section({ title, icon: Icon, children, action }) {
  return (
    <div className="pz-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-2xl uppercase flex items-center gap-2">
          {Icon && <Icon size={24} weight="duotone" color="#d4ff00" />}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4" onClick={onClose}>
      <div className="pz-card p-6 max-w-2xl w-full max-h-[90vh] overflow-auto scrollbar-thin" onClick={(e) => e.stopPropagation()} data-testid="admin-modal">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-xl uppercase">{title}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-zinc-900 rounded" data-testid="modal-close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---- Tabs content ----
function MetricsTab() {
  const { t, lang } = useLang();
  const [m, setM] = useState(null);
  useEffect(() => { api.get("/admin/metrics").then(({ data }) => setM(data)); }, []);
  if (!m) return <div className="text-zinc-500">Loading...</div>;
  const cards = [
    { label: t("admin.totalUsers"), v: m.users, color: "text-[#d4ff00]" },
    { label: t("admin.openMarkets"), v: m.markets_open, color: "text-[#007aff]" },
    { label: t("admin.totalBets"), v: m.bets },
    { label: t("admin.pendingRecharges"), v: m.recharges_pending, color: "text-[#ffcc00]" },
    { label: t("admin.predictions"), v: m.predictions },
    { label: t("admin.revenue") + " (USD)", v: `$${(m.revenue_usd || 0).toFixed(2)}`, color: "text-[#00e676]" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {cards.map((c) => (
        <div key={c.label} className="pz-card p-5">
          <div className="label">{c.label}</div>
          <div className={`font-mono font-bold text-3xl mt-1 ${c.color || ""}`}>{c.v}</div>
        </div>
      ))}
    </div>
  );
}

function PredictionsTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { sport: "football", title: "", event: "", pick: "", odds: 1.8, stake: 5, confidence: 3, analysis: "", image_url: "", is_premium: false };
  const [form, setForm] = useState(empty);

  const load = useCallback(() => api.get("/predictions?limit=200").then(({ data }) => setItems(data || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, odds: Number(form.odds), stake: Number(form.stake), confidence: Number(form.confidence) };
    if (editing) await api.patch(`/admin/predictions/${editing.prediction_id}`, payload);
    else await api.post("/admin/predictions", payload);
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const setStatus = async (p, status) => { await api.patch(`/admin/predictions/${p.prediction_id}/status`, { status }); load(); };
  const del = async (p) => { if (window.confirm("¿Eliminar?")) { await api.delete(`/admin/predictions/${p.prediction_id}`); load(); } };

  return (
    <Section title={t("admin.predictions")} icon={ListChecks}
      action={<button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="btn-primary !py-1.5 !px-3 text-xs" data-testid="new-pred-btn"><Plus size={14} weight="bold" /> {t("admin.newPrediction")}</button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-400 text-xs uppercase">
            <tr><th className="text-left p-2">Sport</th><th className="text-left p-2">Title</th><th className="text-left p-2">Pick</th>
              <th className="text-right p-2">Odds</th><th className="text-center p-2">Status</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.prediction_id} className="border-t border-zinc-900">
                <td className="p-2 uppercase text-xs">{p.sport}</td>
                <td className="p-2 font-bold max-w-xs truncate">
                  {p.title}
                  {p.is_premium && (
                    <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] font-black bg-[#d4ff00] text-black">
                      PREMIUM
                    </span>
                  )}
                </td>
                <td className="p-2 text-zinc-400 max-w-xs truncate">{p.pick}</td>
                <td className="p-2 text-right font-mono">{Number(p.odds).toFixed(2)}</td>
                <td className="p-2 text-center">
                  <select value={p.status} onChange={(e) => setStatus(p, e.target.value)}
                    className="input !py-1 !px-2 text-xs" data-testid={`pred-status-select-${p.prediction_id}`}>
                    {["pending", "won", "lost", "void"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button onClick={() => { setEditing(p); setForm({ ...p }); setOpen(true); }} className="p-1.5 hover:bg-zinc-900 rounded mr-1"><PencilSimple size={16} /></button>
                  <button onClick={() => del(p)} className="p-1.5 hover:bg-zinc-900 rounded text-[#ff3b30]" data-testid={`pred-delete-${p.prediction_id}`}><TrashSimple size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("common.edit") : t("admin.newPrediction")}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Sport</label>
              <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="input">
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="label">Odds</label>
              <input type="number" step="0.01" min="1.01" value={form.odds} onChange={(e) => setForm({ ...form, odds: e.target.value })} className="input" required /></div>
          </div>
          <div><label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required data-testid="pred-form-title" /></div>
          <div><label className="label">Event</label>
            <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} className="input" required /></div>
          <div><label className="label">Pick</label>
            <input value={form.pick} onChange={(e) => setForm({ ...form, pick: e.target.value })} className="input" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Stake (1-10)</label>
              <input type="number" min={1} max={10} value={form.stake} onChange={(e) => setForm({ ...form, stake: e.target.value })} className="input" /></div>
            <div><label className="label">Confidence (1-5)</label>
              <input type="number" min={1} max={5} value={form.confidence} onChange={(e) => setForm({ ...form, confidence: e.target.value })} className="input" /></div>
          </div>
          <div><label className="label">Image URL</label>
            <input value={form.image_url || ""} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" /></div>

          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="is-premium-checkbox"
              checked={form.is_premium || false}
              onChange={(e) => setForm({ ...form, is_premium: e.target.checked })}
              className="h-4 w-4 rounded border-zinc-800 bg-zinc-950 text-[#d4ff00] focus:ring-[#d4ff00] accent-[#d4ff00] cursor-pointer"
            />
            <label htmlFor="is-premium-checkbox" className="text-xs font-bold text-[#d4ff00] cursor-pointer select-none">
              ★ Pronóstico Premium Only (Suscripción requerida)
            </label>
          </div>

          <div><label className="label">Analysis</label>
            <textarea rows={4} value={form.analysis} onChange={(e) => setForm({ ...form, analysis: e.target.value })} className="input" /></div>
          <button type="submit" className="btn-primary w-full justify-center" data-testid="pred-form-submit">{t("common.save")}</button>
        </form>
      </Modal>
    </Section>
  );
}

function MarketsTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { sport: "football", market_type: "over_under_goals", title: "", event: "",
    options: [{ label: "Over 2.5", odds: 1.85 }, { label: "Under 2.5", odds: 1.95 }], image_url: "" };
  const [form, setForm] = useState(empty);
  const [settling, setSettling] = useState(null);
  const [winLabel, setWinLabel] = useState("");

  const load = useCallback(() => api.get("/markets?limit=200").then(({ data }) => setItems(data || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, options: form.options.map((o) => ({ label: o.label, odds: Number(o.odds) })) };
    if (editing) await api.patch(`/admin/markets/${editing.market_id}`, payload);
    else await api.post("/admin/markets", payload);
    setOpen(false); setEditing(null); setForm(empty); load();
  };

  const settle = async () => {
    await api.post(`/admin/markets/${settling.market_id}/settle`, { winning_label: winLabel });
    setSettling(null); setWinLabel(""); load();
  };
  const del = async (m) => { if (window.confirm("¿Eliminar?")) { await api.delete(`/admin/markets/${m.market_id}`); load(); } };

  return (
    <Section title={t("admin.markets")} icon={Lightning}
      action={<button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="btn-primary !py-1.5 !px-3 text-xs" data-testid="new-market-btn"><Plus size={14} /> {t("admin.newMarket")}</button>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-400 text-xs uppercase">
            <tr><th className="text-left p-2">Sport</th><th className="text-left p-2">Title</th><th className="text-left p-2">Type</th>
              <th className="text-center p-2">Status</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.market_id} className="border-t border-zinc-900">
                <td className="p-2 uppercase text-xs">{m.sport}</td>
                <td className="p-2 font-bold max-w-xs truncate">{m.title}</td>
                <td className="p-2 text-xs text-zinc-400">{m.market_type}</td>
                <td className="p-2 text-center"><span className={`badge ${m.status === "open" ? "badge-lime" : ""}`}>{m.status}</span></td>
                <td className="p-2 text-right whitespace-nowrap">
                  {m.status === "open" && (
                    <button onClick={() => { setSettling(m); setWinLabel(m.options[0]?.label || ""); }} className="btn-secondary !py-1 !px-2 text-xs mr-1" data-testid={`market-settle-${m.market_id}`}>
                      {t("admin.settle")}
                    </button>
                  )}
                  <button onClick={() => { setEditing(m); setForm({ ...m }); setOpen(true); }} className="p-1.5 hover:bg-zinc-900 rounded mr-1"><PencilSimple size={16} /></button>
                  <button onClick={() => del(m)} className="p-1.5 hover:bg-zinc-900 rounded text-[#ff3b30]"><TrashSimple size={16} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("common.edit") : t("admin.newMarket")}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Sport</label>
              <select value={form.sport} onChange={(e) => setForm({ ...form, sport: e.target.value })} className="input">
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
            <div><label className="label">Type</label>
              <select value={form.market_type} onChange={(e) => setForm({ ...form, market_type: e.target.value })} className="input">
                {MARKET_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          <div><label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" required data-testid="market-form-title" /></div>
          <div><label className="label">Event</label>
            <input value={form.event} onChange={(e) => setForm({ ...form, event: e.target.value })} className="input" required /></div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label !mb-0">Options</label>
              <button type="button" className="btn-outline !py-1 !px-2 text-xs" onClick={() => setForm({ ...form, options: [...form.options, { label: "", odds: 1.5 }] })} data-testid="add-option-btn">
                <Plus size={12} /> {t("admin.addOption")}
              </button>
            </div>
            <div className="space-y-2">
              {form.options.map((o, i) => (
                <div key={i} className="flex gap-2">
                  <input value={o.label} onChange={(e) => { const arr = [...form.options]; arr[i].label = e.target.value; setForm({ ...form, options: arr }); }} placeholder="Label" className="input flex-1" required />
                  <input type="number" step="0.01" min="1.01" value={o.odds} onChange={(e) => { const arr = [...form.options]; arr[i].odds = e.target.value; setForm({ ...form, options: arr }); }} placeholder="Odds" className="input w-28" required />
                  <button type="button" onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })} className="p-2 hover:bg-zinc-900 text-[#ff3b30] rounded"><TrashSimple size={16} /></button>
                </div>
              ))}
            </div>
          </div>

          <button type="submit" className="btn-primary w-full justify-center" data-testid="market-form-submit">{t("common.save")}</button>
        </form>
      </Modal>

      <Modal open={!!settling} onClose={() => setSettling(null)} title={`${t("admin.settle")}: ${settling?.title || ""}`}>
        <div className="space-y-3">
          <label className="label">{t("admin.winningOption")}</label>
          <select value={winLabel} onChange={(e) => setWinLabel(e.target.value)} className="input">
            <option value="">— Void —</option>
            {settling?.options?.map((o) => <option key={o.label} value={o.label}>{o.label}</option>)}
          </select>
          <button onClick={settle} className="btn-primary w-full justify-center" data-testid="settle-confirm-btn">{t("admin.settle")}</button>
        </div>
      </Modal>
    </Section>
  );
}

function BannersTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { title: "", image_url: "", link_url: "", zone: "hero", active: true, order: 0 };
  const [form, setForm] = useState(empty);

  const load = useCallback(() => api.get("/admin/banners").then(({ data }) => setItems(data || [])), []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, order: Number(form.order) };
    if (editing) await api.patch(`/admin/banners/${editing.banner_id}`, payload);
    else await api.post("/admin/banners", payload);
    setOpen(false); setEditing(null); setForm(empty); load();
  };
  const del = async (b) => { if (window.confirm("¿Eliminar?")) { await api.delete(`/admin/banners/${b.banner_id}`); load(); } };
  const toggle = async (b) => { await api.patch(`/admin/banners/${b.banner_id}`, { ...b, active: !b.active }); load(); };

  return (
    <Section title={t("admin.banners")} icon={ImageIcon}
      action={<button onClick={() => { setEditing(null); setForm(empty); setOpen(true); }} className="btn-primary !py-1.5 !px-3 text-xs" data-testid="new-banner-btn"><Plus size={14} /> {t("admin.newBanner")}</button>}>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((b) => (
          <div key={b.banner_id} className="border border-zinc-800 rounded-md p-3 flex gap-3">
            {b.image_url && <img src={b.image_url} alt="" className="w-24 h-16 object-cover rounded" />}
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate">{b.title || "(no title)"}</div>
              <div className="text-xs text-zinc-400 truncate">{b.link_url}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="badge text-[10px]">{b.zone}</span>
                <button onClick={() => toggle(b)} className={`badge text-[10px] ${b.active ? "badge-win" : "badge-loss"}`}>{b.active ? "ON" : "OFF"}</button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setEditing(b); setForm({ ...b }); setOpen(true); }} className="p-1.5 hover:bg-zinc-900 rounded"><PencilSimple size={16} /></button>
              <button onClick={() => del(b)} className="p-1.5 hover:bg-zinc-900 rounded text-[#ff3b30]"><TrashSimple size={16} /></button>
            </div>
          </div>
        ))}
        {items.length === 0 && <div className="text-zinc-500 text-sm col-span-2">{t("common.noData")}</div>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("common.edit") : t("admin.newBanner")}>
        <form onSubmit={save} className="space-y-3">
          <div><label className="label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input" data-testid="banner-form-title" /></div>
          <div><label className="label">Image URL</label>
            <input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className="input" required data-testid="banner-form-image" /></div>
          <div><label className="label">Link URL</label>
            <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} className="input" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Zone</label>
              <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value })} className="input">
                {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
              </select></div>
            <div><label className="label">Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="input" /></div>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
          <button type="submit" className="btn-primary w-full justify-center" data-testid="banner-form-submit">{t("common.save")}</button>
        </form>
      </Modal>
    </Section>
  );
}

function PaymentMethodsTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const empty = { name: "", type: "zelle", instructions: "", account_info: "", config: {}, active: true, order: 0, icon_url: "" };
  const [form, setForm] = useState(empty);
  const [configRaw, setConfigRaw] = useState("{}");

  const load = useCallback(() => api.get("/admin/payment-methods").then(({ data }) => setItems(data || [])), []);
  useEffect(() => { load(); }, [load]);

  const startEdit = (m) => {
    setEditing(m); setForm({ ...m, config: m.config || {} });
    setConfigRaw(JSON.stringify(m.config || {}, null, 2));
    setOpen(true);
  };
  const startNew = () => { setEditing(null); setForm(empty); setConfigRaw("{}"); setOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    let config = {};
    try { config = JSON.parse(configRaw || "{}"); } catch { alert("Config must be valid JSON"); return; }
    const payload = { ...form, config, order: Number(form.order) };
    if (editing) await api.patch(`/admin/payment-methods/${editing.payment_method_id}`, payload);
    else await api.post("/admin/payment-methods", payload);
    setOpen(false); load();
  };
  const del = async (m) => { if (window.confirm("¿Eliminar?")) { await api.delete(`/admin/payment-methods/${m.payment_method_id}`); load(); } };
  const toggle = async (m) => { await api.patch(`/admin/payment-methods/${m.payment_method_id}`, { ...m, active: !m.active }); load(); };

  return (
    <Section title={t("admin.payments")} icon={CurrencyDollar}
      action={<button onClick={startNew} className="btn-primary !py-1.5 !px-3 text-xs" data-testid="new-pm-btn"><Plus size={14} /> {t("admin.newMethod")}</button>}>
      <div className="grid md:grid-cols-2 gap-3">
        {items.map((m) => (
          <div key={m.payment_method_id} className="border border-zinc-800 rounded-md p-4">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-bold">{m.name}</div>
                <div className="text-xs text-zinc-400 uppercase">{m.type}</div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => toggle(m)} className={`badge text-[10px] ${m.active ? "badge-win" : "badge-loss"}`}>{m.active ? "ON" : "OFF"}</button>
                <button onClick={() => startEdit(m)} className="p-1.5 hover:bg-zinc-900 rounded"><PencilSimple size={14} /></button>
                <button onClick={() => del(m)} className="p-1.5 hover:bg-zinc-900 rounded text-[#ff3b30]"><TrashSimple size={14} /></button>
              </div>
            </div>
            <div className="text-xs text-zinc-400 line-clamp-2">{m.instructions}</div>
            {m.account_info && <div className="text-xs font-mono text-[#d4ff00] mt-1 break-all">{m.account_info}</div>}
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? t("common.edit") : t("admin.newMethod")}>
        <form onSubmit={save} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input" required data-testid="pm-form-name" /></div>
            <div><label className="label">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input">
                {PM_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select></div>
          </div>
          {form.type !== "stripe" && (
            <div><label className="label">Account info</label>
              <input value={form.account_info} onChange={(e) => setForm({ ...form, account_info: e.target.value })} className="input" /></div>
          )}
          <div><label className="label">Instructions (visible al usuario)</label>
            <textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} className="input" /></div>

          {form.type === "stripe" ? (
            <div className="border border-[#007aff]/40 bg-[#007aff]/5 rounded-md p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div>
                  <h4 className="font-bold text-sm uppercase tracking-wider text-[#007aff]">Credenciales Stripe</h4>
                  <p className="text-xs text-zinc-400 mt-1">
                    Obtén tus llaves en <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-[#d4ff00] underline">dashboard.stripe.com/apikeys</a>.
                    Si dejas en blanco, se usa la key del entorno (modo demo).
                  </p>
                </div>
              </div>
              <div>
                <label className="label">Secret Key (sk_live_... o sk_test_...)</label>
                <input
                  type="password"
                  value={(form.config?.secret_key) || ""}
                  onChange={(e) => setForm({ ...form, config: { ...form.config, secret_key: e.target.value } })}
                  className="input font-mono text-xs"
                  placeholder="sk_live_xxxxxxxxxxxxxxxxx"
                  data-testid="stripe-secret-key"
                />
              </div>
              <div>
                <label className="label">Publishable Key (pk_live_... o pk_test_...)</label>
                <input
                  value={(form.config?.publishable_key) || ""}
                  onChange={(e) => setForm({ ...form, config: { ...form.config, publishable_key: e.target.value } })}
                  className="input font-mono text-xs"
                  placeholder="pk_live_xxxxxxxxxxxxxxxxx"
                  data-testid="stripe-pub-key"
                />
              </div>
              <div>
                <label className="label">Webhook Secret (whsec_...)</label>
                <input
                  type="password"
                  value={(form.config?.webhook_secret) || ""}
                  onChange={(e) => setForm({ ...form, config: { ...form.config, webhook_secret: e.target.value } })}
                  className="input font-mono text-xs"
                  placeholder="whsec_xxxxxxxxxxxxxxxxx"
                  data-testid="stripe-webhook-secret"
                />
                <div className="text-xs text-zinc-500 mt-1">
                  Webhook URL: <code className="text-[#d4ff00]">{`${window.location.origin}/api/webhook/stripe`}</code>
                  <button type="button" onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/stripe`)} className="ml-2 text-[#007aff] hover:underline">copiar</button>
                </div>
              </div>
            </div>
          ) : (
            <div><label className="label">Config JSON (avanzado)</label>
              <textarea rows={4} value={configRaw} onChange={(e) => setConfigRaw(e.target.value)} className="input font-mono text-xs" /></div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Active</label>
            <div><label className="label">Order</label>
              <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} className="input" /></div>
          </div>
          <button type="submit" className="btn-primary w-full justify-center" data-testid="pm-form-submit">{t("common.save")}</button>
        </form>
      </Modal>
    </Section>
  );
}

function RechargesTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(() => {
    const q = filter ? `?status=${filter}` : "";
    api.get(`/admin/recharges${q}`).then(({ data }) => setItems(data || []));
  }, [filter]);
  useEffect(() => { load(); }, [load]);

  const review = async (r, action) => {
    const note = window.prompt("Note (optional)", "") || "";
    await api.post(`/admin/recharges/${r.recharge_id}/review`, { action, note });
    load();
  };

  return (
    <Section title={t("admin.recharges")} icon={Money}
      action={<select value={filter} onChange={(e) => setFilter(e.target.value)} className="input !py-1 !w-auto text-xs" data-testid="recharge-filter">
        <option value="">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
      </select>}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-400 text-xs uppercase">
            <tr><th className="text-left p-2">User</th><th className="text-left p-2">Method</th>
              <th className="text-right p-2">USD</th><th className="text-right p-2">Coins</th>
              <th className="text-center p-2">Status</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {items.map((r) => (
              <tr key={r.recharge_id} className="border-t border-zinc-900">
                <td className="p-2"><div className="font-bold">{r.user_name}</div><div className="text-xs text-zinc-500">{r.user_email}</div></td>
                <td className="p-2">{r.payment_method_name}</td>
                <td className="p-2 text-right font-mono">${r.amount_usd}</td>
                <td className="p-2 text-right font-mono">{r.coins}</td>
                <td className="p-2 text-center"><span className={`badge ${r.status === "approved" ? "badge-win" : r.status === "rejected" ? "badge-loss" : "badge-pending"}`}>{r.status}</span></td>
                <td className="p-2 text-right whitespace-nowrap">
                  {r.status === "pending" && (
                    <>
                      <button onClick={() => review(r, "approve")} className="p-1.5 hover:bg-zinc-900 rounded text-[#00e676] mr-1" data-testid={`recharge-approve-${r.recharge_id}`}><Check size={16} /></button>
                      <button onClick={() => review(r, "reject")} className="p-1.5 hover:bg-zinc-900 rounded text-[#ff3b30]" data-testid={`recharge-reject-${r.recharge_id}`}><X size={16} /></button>
                    </>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-zinc-500">{t("common.noData")}</td></tr>}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function UsersTab() {
  const { t } = useLang();
  const [items, setItems] = useState([]);
  const load = useCallback(() => api.get("/admin/users").then(({ data }) => setItems(data || [])), []);
  useEffect(() => { load(); }, [load]);

  const setRole = async (u, role) => { await api.patch(`/admin/users/${u.user_id}/role`, { role }); load(); };
  const adjust = async (u) => {
    const v = window.prompt("Delta coins (+/-):", "0");
    if (v === null) return;
    await api.patch(`/admin/users/${u.user_id}/coins`, { delta: parseInt(v, 10) || 0 });
    load();
  };

  return (
    <Section title={t("admin.users")} icon={Users}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-zinc-400 text-xs uppercase">
            <tr><th className="text-left p-2">Name</th><th className="text-left p-2">Email</th>
              <th className="text-center p-2">Role</th><th className="text-right p-2">Coins</th><th className="text-right p-2"></th></tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.user_id} className="border-t border-zinc-900">
                <td className="p-2 font-bold">{u.name}</td>
                <td className="p-2 text-zinc-400">{u.email}</td>
                <td className="p-2 text-center"><span className={`badge ${u.role === "admin" ? "badge-lime" : ""}`}>{u.role}</span></td>
                <td className="p-2 text-right font-mono">{u.coins_balance}</td>
                <td className="p-2 text-right whitespace-nowrap">
                  <button onClick={() => adjust(u)} className="btn-outline !py-1 !px-2 text-xs mr-1" data-testid={`user-coins-${u.user_id}`}>{t("admin.adjustCoins")}</button>
                  <button onClick={() => setRole(u, u.role === "admin" ? "user" : "admin")} className="btn-outline !py-1 !px-2 text-xs">
                    {u.role === "admin" ? t("admin.makeUser") : t("admin.makeAdmin")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}

function NotificationsTab() {
  const { t } = useLang();
  const [users, setUsers] = useState([]);
  const [target, setTarget] = useState("all");
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => { api.get("/admin/users").then(({ data }) => setUsers(data || [])); }, []);

  const send = async (e) => {
    e.preventDefault(); setBusy(true); setResult(null);
    try {
      const { data } = await api.post("/admin/notifications/send", { title, body, target, user_id: userId || null, url });
      setResult({ ok: true, ...data });
      setTitle(""); setBody("");
    } catch (er) { setResult({ ok: false, msg: er?.response?.data?.detail || "Error" }); }
    finally { setBusy(false); }
  };

  return (
    <Section title={t("admin.notifications")} icon={Megaphone}>
      <form onSubmit={send} className="space-y-3 max-w-xl">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Target</label>
            <select value={target} onChange={(e) => setTarget(e.target.value)} className="input">
              <option value="all">All users</option>
              <option value="user">Specific user</option>
            </select></div>
          {target === "user" && (
            <div><label className="label">User</label>
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className="input" required>
                <option value="">—</option>
                {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.email}</option>)}
              </select></div>
          )}
        </div>
        <div><label className="label">{t("common.title")}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" required data-testid="notif-title" /></div>
        <div><label className="label">{t("common.body")}</label>
          <textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} className="input" required data-testid="notif-body" /></div>
        <div><label className="label">URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className="input" /></div>
        <button type="submit" disabled={busy} className="btn-primary justify-center" data-testid="notif-send">
          {busy ? "..." : t("common.sendNotification")}
        </button>
        {result && (
          <div className={`text-sm ${result.ok ? "text-[#00e676]" : "text-[#ff3b30]"}`} data-testid="notif-result">
            {result.ok ? `Sent: ${result.sent} · Failed: ${result.failed}` : result.msg}
          </div>
        )}
      </form>
    </Section>
  );
}

// ---- Bonus settings tab ----
function BonusTab() {
  const { lang } = useLang();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ladderInput, setLadderInput] = useState("");

  const load = useCallback(() => {
    api.get("/admin/bonus/settings").then(({ data }) => {
      setS(data);
      setLadderInput(
        Object.entries(data.streak_ladder || {})
          .sort((a, b) => Number(a[0]) - Number(b[0]))
          .map(([d, r]) => `${d}:${r}`)
          .join(", ")
      );
    });
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!s) return <div className="text-zinc-500">Loading...</div>;

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      // parse ladder input "1:10, 3:30, 7:75"
      const ladder = {};
      ladderInput.split(",").forEach((part) => {
        const [d, r] = part.split(":").map((x) => x.trim());
        if (d && r && !isNaN(d) && !isNaN(r)) ladder[d] = Number(r);
      });
      const { data } = await api.patch("/admin/bonus/settings", {
        welcome_bonus_enabled: s.welcome_bonus_enabled,
        welcome_bonus_amount: Number(s.welcome_bonus_amount),
        streak_enabled: s.streak_enabled,
        streak_base_reward: Number(s.streak_base_reward),
        streak_ladder: ladder,
      });
      setS(data);
      setMsg({ ok: true, text: lang === "es" ? "Guardado" : "Saved" });
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.detail || "Error" }); }
    finally { setBusy(false); }
  };

  return (
    <Section title={lang === "es" ? "Bonos y recompensas" : "Bonuses & rewards"} icon={Gift}>
      <div className="space-y-6">
        {/* Welcome bonus */}
        <div className="border border-zinc-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-xl uppercase">{lang === "es" ? "Bono de bienvenida" : "Welcome bonus"}</h3>
              <p className="text-xs text-zinc-400">{lang === "es" ? "Coins gratis cuando un usuario se registra (email o Google)." : "Free coins on register (email or Google)."}</p>
            </div>
            <button
              onClick={() => setS({ ...s, welcome_bonus_enabled: !s.welcome_bonus_enabled })}
              data-testid="welcome-toggle"
              className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wider transition-colors ${
                s.welcome_bonus_enabled ? "bg-[#00e676] text-black" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {s.welcome_bonus_enabled ? (lang === "es" ? "ACTIVO" : "ON") : (lang === "es" ? "DESACTIVADO" : "OFF")}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === "es" ? "Cantidad de coins" : "Coins amount"}</label>
              <input
                type="number" min={0} max={10000}
                value={s.welcome_bonus_amount}
                onChange={(e) => setS({ ...s, welcome_bonus_amount: e.target.value })}
                className="input" data-testid="welcome-amount"
                disabled={!s.welcome_bonus_enabled}
              />
            </div>
          </div>
        </div>

        {/* Streak */}
        <div className="border border-zinc-800 rounded-lg p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-display font-bold text-xl uppercase">{lang === "es" ? "Racha diaria" : "Daily streak"}</h3>
              <p className="text-xs text-zinc-400">{lang === "es" ? "Coins gratis al reclamar el bono diario. Premia consecutividad." : "Free coins for claiming daily. Rewards consecutive days."}</p>
            </div>
            <button
              onClick={() => setS({ ...s, streak_enabled: !s.streak_enabled })}
              data-testid="streak-toggle"
              className={`px-4 py-2 rounded-md font-bold text-sm uppercase tracking-wider transition-colors ${
                s.streak_enabled ? "bg-[#00e676] text-black" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {s.streak_enabled ? (lang === "es" ? "ACTIVO" : "ON") : (lang === "es" ? "DESACTIVADO" : "OFF")}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">{lang === "es" ? "Premio base (otros días)" : "Base reward (other days)"}</label>
              <input
                type="number" min={0} max={1000}
                value={s.streak_base_reward}
                onChange={(e) => setS({ ...s, streak_base_reward: e.target.value })}
                className="input" data-testid="streak-base"
                disabled={!s.streak_enabled}
              />
            </div>
            <div>
              <label className="label">{lang === "es" ? "Escalera (día:premio, separados por coma)" : "Ladder (day:reward, comma-separated)"}</label>
              <input
                value={ladderInput}
                onChange={(e) => setLadderInput(e.target.value)}
                className="input font-mono text-sm"
                placeholder="1:10, 3:30, 7:75, 14:150, 30:500"
                data-testid="streak-ladder"
                disabled={!s.streak_enabled}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={busy} className="btn-primary" data-testid="bonus-save">
            {busy ? "..." : (lang === "es" ? "Guardar cambios" : "Save changes")}
          </button>
          {msg && (
            <span className={`text-sm ${msg.ok ? "text-[#00e676]" : "text-[#ff3b30]"}`} data-testid="bonus-msg">{msg.text}</span>
          )}
        </div>

        <p className="text-xs text-zinc-500 leading-relaxed">
          {lang === "es"
            ? "💡 Tip: Si quieres pausar los bonos esta semana, simplemente desactiva el toggle. Los usuarios verán el widget en gris y no podrán reclamar. Vuelve a activarlo cuando quieras retomar la campaña."
            : "💡 Tip: To pause bonuses this week, just turn off the toggle. Users will see the widget greyed out and unable to claim. Re-enable whenever you want."}
        </p>
      </div>
    </Section>
  );
}

// ---- Odds API tab ----
function OddsTab() {
  const { lang } = useLang();
  const [cfg, setCfg] = useState(null);
  const [sports, setSports] = useState([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [creatingPreds, setCreatingPreds] = useState(true);
  const [creatingMkts, setCreatingMkts] = useState(true);

  const load = useCallback(async () => {
    const [{ data: c }, { data: s }] = await Promise.all([
      api.get("/admin/odds/config"),
      api.get("/admin/odds/sports").catch(() => ({ data: [] })),
    ]);
    setCfg(c); setSports(s || []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const toggleSport = (key) => {
    if (!cfg) return;
    const enabled = cfg.enabled_sports.includes(key)
      ? cfg.enabled_sports.filter((k) => k !== key)
      : [...cfg.enabled_sports, key];
    setCfg({ ...cfg, enabled_sports: enabled });
  };

  const saveCfg = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.patch("/admin/odds/config", {
        enabled_sports: cfg.enabled_sports,
        auto_sync_hours: Number(cfg.auto_sync_hours),
        auto_sync_enabled: cfg.auto_sync_enabled,
      });
      setCfg(data);
      setMsg({ ok: true, text: lang === "es" ? "Configuración guardada" : "Config saved" });
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.detail || "Error" }); }
    finally { setBusy(false); }
  };

  const syncNow = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post("/admin/odds/sync", {
        create_predictions: creatingPreds, create_markets: creatingMkts,
      });
      setMsg({ ok: true, text: `${lang === "es" ? "Listo" : "Done"}: ${data.predictions_created} preds · ${data.markets_created} mkts · ${data.events_seen} eventos` });
      load();
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.detail || "Error" }); }
    finally { setBusy(false); }
  };

  const settleNow = async () => {
    setBusy(true); setMsg(null);
    try {
      const { data } = await api.post("/admin/odds/settle");
      setMsg({ ok: true, text: `${lang === "es" ? "Liquidados" : "Settled"}: ${data.settled} · Void: ${data.voided} · ${lang === "es" ? "Revisados" : "Checked"}: ${data.checked}` });
      load();
    } catch (e) { setMsg({ ok: false, text: e?.response?.data?.detail || "Error" }); }
    finally { setBusy(false); }
  };

  if (!cfg) return <div className="text-zinc-500">Loading...</div>;

  // Filter sports relevant to us (soccer + baseball)
  const relevantSports = sports.filter((s) =>
    s.key.startsWith("soccer_") || s.key.startsWith("baseball_") || s.key.startsWith("americanfootball_") || s.key.startsWith("basketball_")
  );
  const groupBy = relevantSports.reduce((acc, s) => {
    const grp = s.group || "Other";
    (acc[grp] ||= []).push(s);
    return acc;
  }, {});

  return (
    <Section title="Odds API" icon={CloudArrowDown}>
      <div className="space-y-5">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="border border-zinc-800 rounded-md p-4">
            <div className="label">API Key</div>
            <div className={`font-mono text-sm ${cfg.api_key_set ? "text-[#00e676]" : "text-[#ff3b30]"}`}>
              {cfg.api_key_set ? "✓ Configurada" : "✗ Falta en .env (ODDS_API_KEY)"}
            </div>
          </div>
          <div className="border border-zinc-800 rounded-md p-4">
            <div className="label">{lang === "es" ? "Última sync" : "Last sync"}</div>
            <div className="text-sm">
              {cfg.last_sync_at ? new Date(cfg.last_sync_at).toLocaleString() : "—"}
            </div>
            {cfg.last_sync_summary && (
              <div className="text-xs text-zinc-400 mt-1">
                {cfg.last_sync_summary.predictions_created} preds · {cfg.last_sync_summary.markets_created} mkts · {cfg.last_sync_summary.events_seen} ev · {(cfg.last_sync_summary.errors || []).length} errors
              </div>
            )}
          </div>
        </div>

        <div className="border border-zinc-800 rounded-md p-4 space-y-3">
          <h3 className="font-display font-bold text-lg uppercase">Auto-sync</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cfg.auto_sync_enabled}
                onChange={(e) => setCfg({ ...cfg, auto_sync_enabled: e.target.checked })}
                data-testid="odds-auto-toggle" />
              {lang === "es" ? "Activar sync automático" : "Enable auto-sync"}
            </label>
            <div className="flex items-center gap-2">
              <span className="label !mb-0">{lang === "es" ? "Cada" : "Every"}</span>
              <input type="number" min={1} max={24} value={cfg.auto_sync_hours}
                onChange={(e) => setCfg({ ...cfg, auto_sync_hours: e.target.value })}
                className="input !py-1 !w-20" data-testid="odds-hours-input" />
              <span className="text-sm text-zinc-400">{lang === "es" ? "horas" : "hours"}</span>
            </div>
          </div>
        </div>

        <div className="border border-zinc-800 rounded-md p-4">
          <h3 className="font-display font-bold text-lg uppercase mb-3">{lang === "es" ? "Ligas / Deportes activos" : "Active sports / leagues"}</h3>
          <p className="text-xs text-zinc-500 mb-3">{lang === "es" ? "Solo se sincronizarán las ligas marcadas. ⚠️ Cada liga marcada = 1 request por sync." : "Only checked sports are synced. Each one = 1 API call per sync."}</p>
          <div className="space-y-3 max-h-[400px] overflow-auto scrollbar-thin pr-2">
            {Object.entries(groupBy).map(([grp, items]) => (
              <div key={grp}>
                <div className="label !mb-2">{grp}</div>
                <div className="grid sm:grid-cols-2 gap-1.5">
                  {items.map((s) => {
                    const supported = !!cfg.sport_map[s.key];
                    const checked = cfg.enabled_sports.includes(s.key);
                    return (
                      <label key={s.key} className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm border ${
                        checked ? "border-[#d4ff00] bg-[#d4ff00]/5" : "border-zinc-900"
                      } ${!supported ? "opacity-50" : "cursor-pointer hover:border-zinc-700"}`}>
                        <input type="checkbox" disabled={!supported} checked={checked}
                          onChange={() => toggleSport(s.key)}
                          data-testid={`odds-sport-${s.key}`} />
                        <span className="flex-1 truncate">{s.title}</span>
                        {!supported && <span className="badge text-[10px]">no map</span>}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {relevantSports.length === 0 && (
              <div className="text-zinc-500 text-sm">{lang === "es" ? "No se pudieron cargar deportes desde la API." : "Could not fetch sports list."}</div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <button onClick={saveCfg} disabled={busy} className="btn-outline" data-testid="odds-save-cfg">
            {busy ? "..." : (lang === "es" ? "Guardar config" : "Save config")}
          </button>

          <div className="flex-1" />

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={creatingPreds} onChange={(e) => setCreatingPreds(e.target.checked)} />
            Predictions
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={creatingMkts} onChange={(e) => setCreatingMkts(e.target.checked)} />
            Markets
          </label>
          <button onClick={syncNow} disabled={busy} className="btn-primary" data-testid="odds-sync-now">
            <CloudArrowDown size={16} weight="bold" />
            {busy ? "..." : (lang === "es" ? "Sincronizar ahora" : "Sync now")}
          </button>
          <button onClick={settleNow} disabled={busy} className="btn-secondary" data-testid="odds-settle-now">
            {busy ? "..." : (lang === "es" ? "Liquidar resultados" : "Settle results")}
          </button>
        </div>

        {cfg.last_settle_at && (
          <div className="border border-zinc-800 rounded-md p-3 text-xs text-zinc-400">
            <span className="label !mb-0">{lang === "es" ? "Última liquidación" : "Last settle"}:</span> {new Date(cfg.last_settle_at).toLocaleString()}
            {cfg.last_settle_summary && (
              <span className="ml-2 text-zinc-500">
                · settled: {cfg.last_settle_summary.settled} · void: {cfg.last_settle_summary.voided} · checked: {cfg.last_settle_summary.checked}
              </span>
            )}
          </div>
        )}

        {msg && (
          <div className={`text-sm ${msg.ok ? "text-[#00e676]" : "text-[#ff3b30]"}`} data-testid="odds-msg">{msg.text}</div>
        )}
      </div>
    </Section>
  );
}

// ---- Layout ----
const TABS = [
  { key: "metrics", icon: ChartBar, label: "admin.metrics", Comp: MetricsTab },
  { key: "predictions", icon: ListChecks, label: "admin.predictions", Comp: PredictionsTab },
  { key: "markets", icon: Lightning, label: "admin.markets", Comp: MarketsTab },
  { key: "odds", icon: CloudArrowDown, label: "admin.odds", Comp: OddsTab },
  { key: "bonuses", icon: Gift, label: "admin.bonuses", Comp: BonusTab },
  { key: "recharges", icon: Money, label: "admin.recharges", Comp: RechargesTab },
  { key: "payments", icon: CurrencyDollar, label: "admin.payments", Comp: PaymentMethodsTab },
  { key: "banners", icon: ImageIcon, label: "admin.banners", Comp: BannersTab },
  { key: "users", icon: Users, label: "admin.users", Comp: UsersTab },
  { key: "notifications", icon: Megaphone, label: "admin.notifications", Comp: NotificationsTab },
];

export default function Admin() {
  const { user, loading } = useAuth();
  const { t } = useLang();
  const nav = useNavigate();
  const [tab, setTab] = useState("metrics");

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) nav("/");
  }, [user, loading, nav]);

  if (!user || user.role !== "admin") return null;

  const Active = TABS.find((x) => x.key === tab)?.Comp || MetricsTab;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <span className="label">Admin</span>
        <h1 className="font-display font-black text-4xl sm:text-5xl uppercase tracking-tighter">{t("admin.title")}</h1>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        <aside className="pz-card p-3 self-start sticky top-20">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-thin">
            {TABS.map((x) => (
              <button
                key={x.key}
                onClick={() => setTab(x.key)}
                data-testid={`admin-tab-${x.key}`}
                className={`px-3 py-2 rounded-md text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition-colors ${
                  tab === x.key ? "bg-[#d4ff00] text-black" : "text-zinc-300 hover:bg-zinc-900"
                }`}
              >
                <x.icon size={16} weight="bold" /> {t(x.label)}
              </button>
            ))}
          </nav>
        </aside>
        <div className="min-w-0">
          <Active />
        </div>
      </div>
    </div>
  );
}
