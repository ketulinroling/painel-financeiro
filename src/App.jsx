import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Plus, Trash2, TrendingUp, Wallet, Target, PiggyBank, BarChart3, ChevronDown, ChevronRight, Lock, Eye, EyeOff, CreditCard, CheckCircle, Clock } from "lucide-react";

const SUPABASE_URL = "https://dnushvahwynsrfopwdvs.supabase.co";
const SUPABASE_KEY = "sb_publishable_TMhAtMIkhoOYODcjhYw4Xg_yZgEEa8K";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const APP_PASSWORD = "0495";
const fmt = (n) => "R$ " + (n || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const mKey = (d) => d.slice(0, 7);
const COLORS = ["#a78bfa","#818cf8","#38bdf8","#34d399","#fbbf24","#f472b6","#fb923c","#94a3b8","#4ade80","#e879f9"];

const num = (v) => v == null ? 0 : Number(v);
const isUuid = (v) => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Row mappers: Supabase (snake_case) -> app (camelCase), with numeric coercion
const txFrom = r => ({ id: r.id, type: r.type, amount: num(r.amount), category: r.category, date: r.date });
const goalFrom = r => ({ id: r.id, name: r.name, target: num(r.target), saved: num(r.saved) });
const investFrom = r => ({ id: r.id, amount: num(r.amount), type: r.type, date: r.date });
const cardFrom = r => ({ id: r.id, name: r.name, bank: r.bank, limit: num(r.limit), closeDay: num(r.close_day), dueDay: num(r.due_day) });
const purchaseFrom = r => ({ id: r.id, name: r.name, category: r.category, total: num(r.total), installments: num(r.installments), installmentValue: num(r.installment_value), date: r.date, cardId: r.card_id });

function monthsBetween(a, b) {
  const [ay, am] = a.split("-").map(Number);
  const [by, bm] = b.split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

const GROUPS = [
  { key: "essenciais", label: "Essenciais", pct: 50, bar: "#a78bfa",
    subs: [
      { key: "Moradia", hint: "aluguel, condomínio, financiamento" },
      { key: "Alimentação", hint: "mercado, restaurantes do dia a dia" },
      { key: "Transporte", hint: "combustível, transporte público" },
      { key: "Saúde", hint: "plano, medicamentos, consultas" },
      { key: "Educação", hint: "mensalidades, cursos" },
      { key: "Contas fixas", hint: "água, luz, internet, telefone" },
    ]},
  { key: "estilo", label: "Estilo de vida", pct: 30, bar: "#38bdf8",
    subs: [
      { key: "Lazer", hint: "streaming, passeios, hobbies" },
      { key: "Restaurantes", hint: "saídas e delivery" },
      { key: "Vestuário", hint: "roupas, calçados, acessórios" },
      { key: "Viagens", hint: "hospedagem, passagens" },
      { key: "Assinaturas", hint: "apps, revistas, serviços" },
      { key: "Compras / E-commerce", hint: "compras online e lojas" },
      { key: "Outros", hint: "gastos pessoais variados" },
    ]},
  { key: "investir", label: "Investir", pct: 20, bar: "#34d399",
    subs: [
      { key: "Renda Variável", hint: "ações, ETFs, FIIs" },
      { key: "Renda Fixa", hint: "Tesouro Direto, CDB, LCI/LCA" },
      { key: "Imóveis", hint: "aquisição ou fundos imobiliários" },
      { key: "Previdência", hint: "PGBL, VGBL" },
      { key: "Criptomoedas", hint: "Bitcoin, Ethereum e outros" },
      { key: "Reserva de emergência", hint: "fundo de liquidez imediata" },
    ]},
];

const ALL_CATS = GROUPS.flatMap(g => g.subs.map(s => s.key));
const INVEST_TYPES = GROUPS[2].subs.map(s => s.key);
const S = { bg: "#0f1117", card: "#1a1d27", border: "#2a2d3a", muted: "#6b7280", text: "#e2e8f0", sub: "#94a3b8" };
const iStyle = { background: "#0f1117", border: "1px solid #2a2d3a", color: "#e2e8f0" };

function Inp({ label, ...p }) {
  return (
    <div>
      {label && <label className="text-xs mb-1 block" style={{ color: S.muted }}>{label}</label>}
      <input className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={iStyle} {...p} />
    </div>
  );
}
function Sel({ label, children, ...p }) {
  return (
    <div>
      {label && <label className="text-xs mb-1 block" style={{ color: S.muted }}>{label}</label>}
      <select className="w-full px-3 py-2.5 rounded-xl text-sm outline-none" style={iStyle} {...p}>{children}</select>
    </div>
  );
}
function Card({ children, style }) {
  return <div className="rounded-2xl p-4 mb-4" style={{ background: S.card, border: "1px solid " + S.border, ...style }}>{children}</div>;
}
function Empty({ msg }) {
  return <div className="h-36 flex items-center justify-center text-sm" style={{ color: S.muted }}>{msg}</div>;
}
function Btn({ children, grad, onClick, full }) {
  return (
    <button onClick={onClick} className={`${full ? "w-full" : ""} py-3 px-4 rounded-xl text-sm font-semibold text-white hover:opacity-90 transition`} style={{ background: grad || "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
      {children}
    </button>
  );
}

// ── Auth ──────────────────────────────────────────────────────────────
function Auth({ onAuth }) {
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState(false);

  const submit = () => {
    if (pw === APP_PASSWORD) {
      onAuth();
    } else {
      setErr(true);
      setPw("");
      setTimeout(() => setErr(false), 1500);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}>
      <div className="rounded-2xl p-8 w-full max-w-sm mx-4" style={{ background: S.card, border: "1px solid " + S.border }}>
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
            <Lock size={24} color="white" />
          </div>
          <h1 className="text-xl font-semibold text-white">Painel Financeiro</h1>
          <p className="text-sm mt-1" style={{ color: S.muted }}>Digite sua senha para continuar</p>
        </div>
        <div className="relative mb-4">
          <input
            type={show ? "text" : "password"}
            value={pw}
            onChange={e => setPw(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Senha"
            className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none pr-10"
            style={{ background: S.bg, border: "1px solid " + (err ? "#ef4444" : S.border) }}
          />
          <button onClick={() => setShow(v => !v)} className="absolute right-3 top-3.5" style={{ color: S.muted }}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {err && <p className="text-xs text-red-400 mb-3 text-center">Senha incorreta</p>}
        <button onClick={submit} className="w-full py-3 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition" style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
          Entrar
        </button>
      </div>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────────
export default function App() {
  const [auth, setAuth] = useState(false);
  const [tab, setTab] = useState("visao");
  const [tx, setTx] = useState([]);
  const [goals, setGoals] = useState([]);
  const [invest, setInvest] = useState([]);
  const [budget, setBudget] = useState({ essenciais: 50, estilo: 30, investir: 20 });
  const [emergency, setEmergency] = useState({ months: 6, saved: 0 });
  const [cards, setCards] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [t, g, iv, b, e, c, p] = await Promise.all([
          supabase.from("transactions").select("*").order("created_at", { ascending: true }),
          supabase.from("goals").select("*").order("created_at", { ascending: true }),
          supabase.from("investments").select("*").order("created_at", { ascending: true }),
          supabase.from("budget").select("*").eq("id", 1).maybeSingle(),
          supabase.from("emergency").select("*").eq("id", 1).maybeSingle(),
          supabase.from("cards").select("*").order("created_at", { ascending: true }),
          supabase.from("purchases").select("*").order("created_at", { ascending: true }),
        ]);
        if (t.data) setTx(t.data.map(txFrom));
        if (g.data) setGoals(g.data.map(goalFrom));
        if (iv.data) setInvest(iv.data.map(investFrom));
        if (b.data) setBudget({ essenciais: num(b.data.essenciais), estilo: num(b.data.estilo), investir: num(b.data.investir) });
        if (e.data) setEmergency({ months: num(e.data.months), saved: num(e.data.saved) });
        if (c.data) setCards(c.data.map(cardFrom));
        if (p.data) setPurchases(p.data.map(purchaseFrom));
      } catch (err) { console.error("load error", err); }
      setLoaded(true);
    };
    load();
  }, []);

  // budget / emergency are single-row tables (id = 1), persisted via upsert
  const save = async (k, v) => {
    try {
      if (k === "budget") await supabase.from("budget").upsert({ id: 1, essenciais: v.essenciais, estilo: v.estilo, investir: v.investir });
      else if (k === "emergency") await supabase.from("emergency").upsert({ id: 1, months: v.months, saved: v.saved });
    } catch (err) { console.error("save error", err); }
  };

  const addRow = (table, set, toDb, fromDb) => async (item) => {
    const { data, error } = await supabase.from(table).insert(toDb(item)).select().single();
    if (!error && data) set(prev => [...prev, fromDb(data)]);
    else if (error) console.error("insert " + table, error);
  };
  const delRow = (table, set) => async (id) => {
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (!error) set(prev => prev.filter(x => x.id !== id));
    else console.error("delete " + table, error);
  };

  const addTx = addRow("transactions", setTx, i => ({ type: i.type, amount: i.amount, category: i.category, date: i.date }), txFrom);
  const delTx = delRow("transactions", setTx);
  const addGoal = addRow("goals", setGoals, i => ({ name: i.name, target: i.target, saved: i.saved }), goalFrom);
  const delGoal = delRow("goals", setGoals);
  const addInvest = addRow("investments", setInvest, i => ({ amount: i.amount, type: i.type, date: i.date }), investFrom);
  const delInvest = delRow("investments", setInvest);
  const addCard = addRow("cards", setCards, i => ({ name: i.name, bank: i.bank, limit: i.limit, close_day: i.closeDay, due_day: i.dueDay }), cardFrom);
  const delCard = delRow("cards", setCards);
  const addPurchase = addRow("purchases", setPurchases, i => ({ name: i.name, category: i.category, total: i.total, installments: i.installments, installment_value: i.installmentValue, date: i.date, card_id: isUuid(i.cardId) ? i.cardId : null }), purchaseFrom);
  const delPurchase = delRow("purchases", setPurchases);

  const now = new Date().toISOString().slice(0, 10);
  const curMonth = mKey(now);
  const monthTx = tx.filter(t => mKey(t.date) === curMonth);
  const income = monthTx.filter(t => t.type === "in").reduce((s, t) => s + t.amount, 0);
  const expense = monthTx.filter(t => t.type === "out").reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const months = [...new Set(tx.map(t => mKey(t.date)))].sort();
  const avgOf = (type) => {
    const vals = months.map(m => tx.filter(t => mKey(t.date) === m && t.type === type).reduce((s, t) => s + t.amount, 0)).filter(Boolean);
    return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
  };
  const avgIncome = avgOf("in");
  const avgExpense = avgOf("out");

  const totalInvested = invest.reduce((s, i) => s + i.amount, 0);
  const byCat = ALL_CATS.map((c, i) => ({ name: c, color: COLORS[i % COLORS.length], value: monthTx.filter(t => t.type === "out" && t.category === c).reduce((s, t) => s + t.amount, 0) })).filter(d => d.value > 0);
  const monthlyData = months.map(m => ({ month: m.slice(5) + "/" + m.slice(2, 4), Entradas: tx.filter(t => mKey(t.date) === m && t.type === "in").reduce((s, t) => s + t.amount, 0), Saídas: tx.filter(t => mKey(t.date) === m && t.type === "out").reduce((s, t) => s + t.amount, 0) }));
  let cum = 0;
  const investData = [...invest].sort((a, b) => a.date.localeCompare(b.date)).map(i => { cum += i.amount; return { date: i.date.slice(5), Acumulado: cum }; });
  const emergencyTarget = avgExpense * emergency.months;
  const emergencyPct = emergencyTarget > 0 ? Math.min(100, (emergency.saved / emergencyTarget) * 100) : 0;
  const monthsCovered = avgExpense > 0 ? emergency.saved / avgExpense : 0;

  const faturaTotal = purchases.reduce((s, p) => {
    const diff = monthsBetween(mKey(p.date), curMonth);
    return (diff >= 0 && diff < p.installments) ? s + p.installmentValue : s;
  }, 0);

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" style={{ background: S.bg }}><p style={{ color: S.muted }} className="text-sm">Carregando…</p></div>;
  if (!auth) return <Auth onAuth={() => setAuth(true)} />;

  const TABS = [
    { id: "visao", label: "Visão", Icon: Wallet },
    { id: "transacoes", label: "Transações", Icon: Plus },
    { id: "cartao", label: "Cartão", Icon: CreditCard },
    { id: "orcamento", label: "Orçamento", Icon: BarChart3 },
    { id: "reserva", label: "Reserva", Icon: PiggyBank },
    { id: "invest", label: "Investimentos", Icon: TrendingUp },
    { id: "metas", label: "Metas", Icon: Target },
  ];

  const shared = { tx, monthTx, goals, invest, budget, setBudget, emergency, setEmergency, income, expense, balance, avgIncome, avgExpense, byCat, monthlyData, investData, totalInvested, emergencyTarget, emergencyPct, monthsCovered, addTx, delTx, addGoal, delGoal, addInvest, delInvest, save, now, curMonth, cards, purchases, addCard, delCard, addPurchase, delPurchase, faturaTotal };

  return (
    <div className="min-h-screen pb-24" style={{ background: S.bg, color: S.text }}>
      <div className="max-w-2xl mx-auto px-4 pt-8 pb-4">
        <div className="mb-8">
          <p className="text-xs font-semibold tracking-widest uppercase mb-1" style={{ color: "#7c3aed" }}>Painel Financeiro</p>
          <h1 className="text-2xl font-bold" style={{ color: S.text }}>Olá, Bruna e Ketulin</h1>
          <p className="text-sm mt-1" style={{ color: S.muted }}>{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        {tab === "visao" && <Visao {...shared} />}
        {tab === "transacoes" && <Transacoes {...shared} />}
        {tab === "cartao" && <Cartao {...shared} />}
        {tab === "orcamento" && <Orcamento {...shared} />}
        {tab === "reserva" && <Reserva {...shared} />}
        {tab === "invest" && <Investimentos {...shared} />}
        {tab === "metas" && <Metas {...shared} />}
      </div>
      <nav className="fixed bottom-0 left-0 right-0 border-t overflow-x-auto" style={{ background: S.card, borderColor: S.border }}>
        <div className="flex min-w-max mx-auto px-1">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button key={id} onClick={() => setTab(id)} className="flex flex-col items-center gap-1 py-3 px-3 transition">
                <Icon size={18} color={active ? "#a78bfa" : S.muted} />
                <span className="text-xs whitespace-nowrap" style={{ color: active ? "#a78bfa" : S.muted, fontWeight: active ? 600 : 400 }}>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ── Visão ─────────────────────────────────────────────────────────────
function Visao({ income, expense, balance, avgIncome, byCat, monthlyData, totalInvested, faturaTotal }) {
  const ttStyle = { background: S.card, border: "1px solid " + S.border, borderRadius: 12, color: S.text };
  return (
    <div>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg,#4c1d95,#1e1b4b)", border: "1px solid #3730a3" }}>
        <p className="text-xs mb-1" style={{ color: "#a5b4fc" }}>Saldo do mês</p>
        <p className="text-4xl font-bold text-white mb-4">{fmt(balance)}</p>
        <div className="flex gap-4 flex-wrap">
          {[["Entradas","#86efac",income],["Gastos","#fca5a5",expense],["Fatura cartão","#c4b5fd",faturaTotal],["Média entrada","#a5b4fc",avgIncome]].map(([l,c,v]) => (
            <div key={l}><p className="text-xs mb-0.5" style={{ color: c }}>{l}</p><p className="text-sm font-semibold text-white">{fmt(v)}</p></div>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4" style={{ background: S.card, border: "1px solid " + S.border }}>
          <TrendingUp size={18} color="#34d399" className="mb-2" />
          <p className="text-xs mb-1" style={{ color: S.muted }}>Total investido</p>
          <p className="text-lg font-bold" style={{ color: "#34d399" }}>{fmt(totalInvested)}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: S.card, border: "1px solid " + S.border }}>
          <CreditCard size={18} color="#f472b6" className="mb-2" />
          <p className="text-xs mb-1" style={{ color: S.muted }}>Fatura do mês</p>
          <p className="text-lg font-bold" style={{ color: "#f472b6" }}>{fmt(faturaTotal)}</p>
        </div>
      </div>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Gastos por categoria</p>
        {byCat.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={75} label={e => e.name} labelLine={false}>
                {byCat.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip formatter={v => fmt(v)} contentStyle={ttStyle} />
            </PieChart>
          </ResponsiveContainer>
        ) : <Empty msg="Sem gastos neste mês ainda" />}
      </Card>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Entradas vs. Saídas</p>
        {monthlyData.length ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="month" fontSize={11} tick={{ fill: S.muted }} />
              <YAxis fontSize={11} tick={{ fill: S.muted }} />
              <Tooltip formatter={v => fmt(v)} contentStyle={ttStyle} />
              <Legend wrapperStyle={{ color: S.sub, fontSize: 12 }} />
              <Bar dataKey="Entradas" fill="#34d399" radius={[4,4,0,0]} />
              <Bar dataKey="Saídas" fill="#f472b6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : <Empty msg="Registre transações para ver o gráfico" />}
      </Card>
    </div>
  );
}

// ── Transações ────────────────────────────────────────────────────────
function Transacoes({ monthTx, addTx, delTx, now }) {
  const [type, setType] = useState("out");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(GROUPS[0].subs[0].key);
  const [source, setSource] = useState("");
  const [date, setDate] = useState(now);

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    addTx({ type, amount: a, category: type === "out" ? category : (source || "Entrada"), date });
    setAmount(""); setSource("");
  };

  return (
    <div>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Nova transação</p>
        <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: S.bg }}>
          <button onClick={() => setType("in")} className="flex-1 py-2 rounded-lg text-sm font-medium transition" style={{ background: type === "in" ? "#065f46" : "transparent", color: type === "in" ? "#34d399" : S.muted }}>+ Entrada</button>
          <button onClick={() => setType("out")} className="flex-1 py-2 rounded-lg text-sm font-medium transition" style={{ background: type === "out" ? "#4c0519" : "transparent", color: type === "out" ? "#f472b6" : S.muted }}>− Saída</button>
        </div>
        <div className="space-y-3">
          <Inp label="Valor (R$)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          {type === "out" ? (
            <Sel label="Categoria" value={category} onChange={e => setCategory(e.target.value)}>
              {GROUPS.map(g => <optgroup key={g.key} label={"— " + g.label}>{g.subs.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}</optgroup>)}
            </Sel>
          ) : (
            <Inp label="Fonte" value={source} onChange={e => setSource(e.target.value)} placeholder="Ex: Cliente, Freela" />
          )}
          <Inp label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="mt-4"><Btn onClick={submit} full>Adicionar</Btn></div>
      </Card>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Transações do mês</p>
        {monthTx.length ? (
          <div>
            {[...monthTx].sort((a, b) => b.date.localeCompare(a.date)).map(t => (
              <div key={t.id} className="flex items-center justify-between py-3 border-b" style={{ borderColor: S.border }}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: t.type === "in" ? "#065f46" : "#4c0519" }}>
                    <span style={{ color: t.type === "in" ? "#34d399" : "#f472b6" }}>{t.type === "in" ? "↑" : "↓"}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: S.text }}>{t.category}</p>
                    <p className="text-xs" style={{ color: S.muted }}>{t.date.split("-").reverse().join("/")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color: t.type === "in" ? "#34d399" : "#f472b6" }}>{t.type === "in" ? "+" : "−"} {fmt(t.amount)}</span>
                  <button onClick={() => delTx(t.id)} style={{ color: "#374151" }}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        ) : <Empty msg="Nenhuma transação neste mês" />}
      </Card>
    </div>
  );
}

// ── Cartão ────────────────────────────────────────────────────────────
function Cartao({ cards, purchases, addCard, delCard, addPurchase, delPurchase, now, curMonth }) {
  const [sec, setSec] = useState("compras");
  const [showForm, setShowForm] = useState(false);
  const [cName, setCName] = useState(""); const [cBank, setCBank] = useState("");
  const [cLimit, setCLimit] = useState(""); const [cClose, setCClose] = useState("");
  const [cDue, setCDue] = useState("");
  const [pName, setPName] = useState(""); const [pCat, setPCat] = useState(GROUPS[0].subs[0].key);
  const [pTotal, setPTotal] = useState(""); const [pInst, setPInst] = useState("1");
  const [pDate, setPDate] = useState(now); const [pCard, setPCard] = useState("");

  const submitCard = () => {
    if (!cName) return;
    addCard({ name: cName, bank: cBank, limit: parseFloat(cLimit) || 0, closeDay: parseInt(cClose) || 1, dueDay: parseInt(cDue) || 10 });
    setCName(""); setCBank(""); setCLimit(""); setCClose(""); setCDue(""); setShowForm(false);
  };

  const submitPurchase = () => {
    const total = parseFloat(pTotal); const inst = parseInt(pInst) || 1;
    if (!pName || !total) return;
    addPurchase({ name: pName, category: pCat, total, installments: inst, installmentValue: total / inst, date: pDate, cardId: pCard || (cards[0] ? cards[0].id : "avulso") });
    setPName(""); setPTotal(""); setPInst("1"); setPDate(now);
  };

  const faturaCard = (cid) => purchases.reduce((s, p) => {
    const diff = monthsBetween(mKey(p.date), curMonth);
    if ((cid === "all" || p.cardId === cid) && diff >= 0 && diff < p.installments) return s + p.installmentValue;
    return s;
  }, 0);

  const totalFatura = faturaCard("all");
  const totalAberto = purchases.reduce((s, p) => {
    const paid = monthsBetween(mKey(p.date), curMonth);
    const rem = p.installments - Math.max(0, paid);
    return s + (rem > 0 ? rem * p.installmentValue : 0);
  }, 0);
  const ativas = purchases.filter(p => { const d = monthsBetween(mKey(p.date), curMonth); return d >= 0 && d < p.installments; }).length;
  const ttStyle = { background: S.card, border: "1px solid " + S.border, borderRadius: 12, color: S.text };

  return (
    <div>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg,#4c0519,#1f1235)", border: "1px solid #be185d" }}>
        <p className="text-xs mb-1" style={{ color: "#f9a8d4" }}>Fatura total do mês</p>
        <p className="text-4xl font-bold text-white mb-3">{fmt(totalFatura)}</p>
        <div className="flex gap-4">
          {[["Em aberto","#f9a8d4",fmt(totalAberto)],["Cartões","#f9a8d4",cards.length],["Compras ativas","#f9a8d4",ativas]].map(([l,c,v]) => (
            <div key={l}><p className="text-xs mb-0.5" style={{ color: c }}>{l}</p><p className="text-sm font-semibold text-white">{v}</p></div>
          ))}
        </div>
      </div>

      <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: S.card }}>
        {[["compras","Compras"],["fatura","Fatura do mês"],["cartoes","Cartões"]].map(([id, label]) => (
          <button key={id} onClick={() => setSec(id)} className="flex-1 py-2 rounded-lg text-xs font-medium transition"
            style={{ background: sec === id ? "#4c0519" : "transparent", color: sec === id ? "#f472b6" : S.muted }}>{label}</button>
        ))}
      </div>

      {sec === "compras" && (
        <div>
          <Card>
            <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Nova compra parcelada</p>
            <div className="space-y-3">
              <Inp label="Nome da compra" value={pName} onChange={e => setPName(e.target.value)} placeholder="Ex: Televisão, Notebook" />
              <Sel label="Categoria" value={pCat} onChange={e => setPCat(e.target.value)}>
                {GROUPS.map(g => <optgroup key={g.key} label={"— " + g.label}>{g.subs.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}</optgroup>)}
              </Sel>
              <div className="grid grid-cols-2 gap-3">
                <Inp label="Valor total (R$)" type="number" value={pTotal} onChange={e => setPTotal(e.target.value)} placeholder="0,00" />
                <Inp label="Nº de parcelas" type="number" value={pInst} onChange={e => setPInst(e.target.value)} placeholder="1" />
              </div>
              {pTotal && pInst && (
                <div className="rounded-xl px-3 py-2" style={{ background: S.bg }}>
                  <p className="text-xs" style={{ color: S.muted }}>Valor por parcela: <span className="font-bold" style={{ color: "#f472b6" }}>{fmt(parseFloat(pTotal) / (parseInt(pInst) || 1))}</span></p>
                </div>
              )}
              <Inp label="Data da compra" type="date" value={pDate} onChange={e => setPDate(e.target.value)} />
              {cards.length > 0 && (
                <Sel label="Cartão" value={pCard} onChange={e => setPCard(e.target.value)}>
                  <option value="">Selecione o cartão</option>
                  {cards.map(c => <option key={c.id} value={c.id}>{c.name}{c.bank ? " — " + c.bank : ""}</option>)}
                </Sel>
              )}
            </div>
            <div className="mt-4"><Btn onClick={submitPurchase} grad="linear-gradient(135deg,#9d174d,#7c3aed)" full>Adicionar compra</Btn></div>
          </Card>
          {purchases.length > 0 ? (
            <div className="space-y-3">
              {[...purchases].sort((a, b) => b.date.localeCompare(a.date)).map(p => {
                const paidCount = Math.min(p.installments, Math.max(0, monthsBetween(mKey(p.date), curMonth) + 1));
                const remaining = p.installments - paidCount;
                const pct = (paidCount / p.installments) * 100;
                const done = remaining <= 0;
                const cardName = (cards.find(c => c.id === p.cardId) || {}).name || "";
                return (
                  <div key={p.id} className="rounded-2xl p-4" style={{ background: S.card, border: "1px solid " + (done ? "#1a3a2a" : S.border) }}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 mr-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          {done ? <CheckCircle size={14} color="#34d399" /> : <Clock size={14} color="#f472b6" />}
                          <p className="text-sm font-semibold" style={{ color: S.text }}>{p.name}</p>
                        </div>
                        <p className="text-xs" style={{ color: S.muted }}>{p.category}{cardName ? " · " + cardName : ""} · {p.date.split("-").reverse().join("/")}</p>
                      </div>
                      <button onClick={() => delPurchase(p.id)} style={{ color: "#374151" }}><Trash2 size={14} /></button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                      {[["Total",fmt(p.total),S.text],["Parcela",fmt(p.installmentValue),"#f472b6"],["Restam",done?"Quitada":remaining+"x",done?"#34d399":"#fbbf24"]].map(([l,v,c]) => (
                        <div key={l} className="rounded-xl py-2" style={{ background: S.bg }}>
                          <p className="text-xs mb-0.5" style={{ color: S.muted }}>{l}</p>
                          <p className="text-sm font-bold" style={{ color: c }}>{v}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: S.bg }}>
                        <div className="h-full rounded-full" style={{ width: pct + "%", background: done ? "#34d399" : "#f472b6" }} />
                      </div>
                      <span className="text-xs" style={{ color: S.muted }}>{paidCount}/{p.installments}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <Empty msg="Nenhuma compra registrada" />}
        </div>
      )}

      {sec === "fatura" && (
        <div>
          {cards.length === 0 && purchases.length === 0 && <Empty msg="Cadastre cartões e compras para ver a fatura" />}
          {cards.map(c => {
            const fatura = faturaCard(c.id);
            const parcelas = purchases.filter(p => p.cardId === c.id && (() => { const d = monthsBetween(mKey(p.date), curMonth); return d >= 0 && d < p.installments; })());
            return (
              <Card key={c.id}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold" style={{ color: S.text }}>{c.name}</p>
                    {c.bank && <p className="text-xs" style={{ color: S.muted }}>{c.bank} · fecha dia {c.closeDay} · vence dia {c.dueDay}</p>}
                  </div>
                  <p className="text-lg font-bold" style={{ color: "#f472b6" }}>{fmt(fatura)}</p>
                </div>
                {parcelas.length > 0 ? parcelas.map(p => {
                  const pc = Math.min(p.installments, Math.max(0, monthsBetween(mKey(p.date), curMonth) + 1));
                  return (
                    <div key={p.id} className="flex justify-between items-center py-2 border-t" style={{ borderColor: S.border }}>
                      <div>
                        <p className="text-sm" style={{ color: S.text }}>{p.name}</p>
                        <p className="text-xs" style={{ color: S.muted }}>{p.category} · parcela {pc}/{p.installments}</p>
                      </div>
                      <p className="text-sm font-semibold" style={{ color: "#f472b6" }}>{fmt(p.installmentValue)}</p>
                    </div>
                  );
                }) : <p className="text-xs" style={{ color: S.muted }}>Nenhuma parcela neste mês</p>}
              </Card>
            );
          })}
        </div>
      )}

      {sec === "cartoes" && (
        <div>
          <div className="mb-4"><Btn onClick={() => setShowForm(v => !v)} grad="linear-gradient(135deg,#9d174d,#7c3aed)" full>{showForm ? "Cancelar" : "+ Adicionar cartão"}</Btn></div>
          {showForm && (
            <Card>
              <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Novo cartão</p>
              <div className="space-y-3">
                <Inp label="Nome do cartão" value={cName} onChange={e => setCName(e.target.value)} placeholder="Ex: Nubank, Inter" />
                <Inp label="Banco / bandeira" value={cBank} onChange={e => setCBank(e.target.value)} placeholder="Ex: Mastercard, Visa" />
                <Inp label="Limite (R$)" type="number" value={cLimit} onChange={e => setCLimit(e.target.value)} placeholder="0,00" />
                <div className="grid grid-cols-2 gap-3">
                  <Inp label="Dia de fechamento" type="number" value={cClose} onChange={e => setCClose(e.target.value)} placeholder="Ex: 25" />
                  <Inp label="Dia de vencimento" type="number" value={cDue} onChange={e => setCDue(e.target.value)} placeholder="Ex: 5" />
                </div>
              </div>
              <div className="mt-4"><Btn onClick={submitCard} grad="linear-gradient(135deg,#9d174d,#7c3aed)" full>Salvar cartão</Btn></div>
            </Card>
          )}
          {cards.length > 0 ? cards.map(c => {
            const fatura = faturaCard(c.id);
            const used = c.limit > 0 ? (fatura / c.limit) * 100 : 0;
            return (
              <Card key={c.id}>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold" style={{ color: S.text }}>{c.name}</p>
                    {c.bank && <p className="text-xs mt-0.5" style={{ color: S.muted }}>{c.bank}</p>}
                    <p className="text-xs mt-0.5" style={{ color: S.muted }}>Fecha dia {c.closeDay} · Vence dia {c.dueDay}</p>
                  </div>
                  <button onClick={() => delCard(c.id)} style={{ color: "#374151" }}><Trash2 size={14} /></button>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="rounded-xl p-3" style={{ background: S.bg }}>
                    <p className="text-xs mb-1" style={{ color: S.muted }}>Fatura do mês</p>
                    <p className="font-bold" style={{ color: "#f472b6" }}>{fmt(fatura)}</p>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: S.bg }}>
                    <p className="text-xs mb-1" style={{ color: S.muted }}>Limite</p>
                    <p className="font-bold" style={{ color: S.text }}>{c.limit > 0 ? fmt(c.limit) : "—"}</p>
                  </div>
                </div>
                {c.limit > 0 && (
                  <>
                    <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: S.bg }}>
                      <div className="h-full rounded-full" style={{ width: Math.min(100, used) + "%", background: used > 80 ? "#f43f5e" : "#f472b6" }} />
                    </div>
                    <p className="text-xs" style={{ color: S.muted }}>{used.toFixed(0)}% do limite utilizado</p>
                  </>
                )}
              </Card>
            );
          }) : <Empty msg="Nenhum cartão cadastrado" />}
        </div>
      )}
    </div>
  );
}

// ── Orçamento ─────────────────────────────────────────────────────────
function Orcamento({ budget, setBudget, save, income, monthTx }) {
  const update = (k, v) => { const n = { ...budget, [k]: Math.max(0, parseInt(v) || 0) }; setBudget(n); save("budget", n); };
  const total = budget.essenciais + budget.estilo + budget.investir;

  return (
    <div>
      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ background: S.card, border: "1px solid " + S.border }}>
        <div>
          <p className="text-xs mb-1" style={{ color: S.muted }}>Entradas do mês</p>
          <p className="text-xl font-bold" style={{ color: "#34d399" }}>{fmt(income)}</p>
        </div>
        {total !== 100 && (
          <span className="text-xs px-3 py-1.5 rounded-full" style={{ background: total > 100 ? "#4c0519" : "#422006", color: total > 100 ? "#f472b6" : "#fbbf24" }}>
            {total}% {total > 100 ? "acima" : "abaixo"} de 100%
          </span>
        )}
      </div>
      {GROUPS.map((g, i) => <GrupoBudget key={g.key} g={g} budget={budget} income={income} monthTx={monthTx} onUpdate={update} defaultOpen={i === 0} />)}
    </div>
  );
}

function GrupoBudget({ g, budget, income, monthTx, onUpdate, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false);
  const pct = budget[g.key];
  const limit = (income * pct) / 100;
  const spent = monthTx.filter(t => t.type === "out" && g.subs.some(s => s.key === t.category)).reduce((s, t) => s + t.amount, 0);
  const gPct = limit > 0 ? Math.min(100, (spent / limit) * 100) : 0;
  const over = spent > limit && limit > 0;

  return (
    <div className="rounded-2xl mb-3 overflow-hidden" style={{ background: S.card, border: "1px solid " + S.border }}>
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={15} color={S.muted} /> : <ChevronRight size={15} color={S.muted} />}
          <span className="text-sm font-semibold" style={{ color: S.text }}>{g.label}</span>
          <span className="text-xs" style={{ color: S.muted }}>{pct}%</span>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold" style={{ color: over ? "#f472b6" : g.bar }}>{fmt(spent)}</p>
          <p className="text-xs" style={{ color: S.muted }}>de {fmt(limit)}</p>
        </div>
      </button>
      <div className="px-4 pb-3">
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg }}>
          <div className="h-full rounded-full" style={{ width: gPct + "%", background: over ? "#f472b6" : g.bar }} />
        </div>
        {over && <p className="text-xs mt-1" style={{ color: "#f472b6" }}>Limite ultrapassado</p>}
      </div>
      {open && (
        <div style={{ borderTop: "1px solid " + S.border }}>
          <div className="px-4 py-2 flex items-center gap-2" style={{ background: S.bg }}>
            <span className="text-xs" style={{ color: S.muted }}>Percentual:</span>
            <input type="number" value={pct} onChange={e => onUpdate(g.key, e.target.value)} className="w-14 px-2 py-1 rounded-lg text-xs text-center outline-none" style={iStyle} />
            <span className="text-xs" style={{ color: S.muted }}>%</span>
          </div>
          {g.subs.map(sub => {
            const subSpent = monthTx.filter(t => t.type === "out" && t.category === sub.key).reduce((s, t) => s + t.amount, 0);
            return (
              <div key={sub.key} className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid " + S.border }}>
                <div>
                  <p className="text-sm" style={{ color: S.text }}>{sub.key}</p>
                  <p className="text-xs" style={{ color: S.muted }}>{sub.hint}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: subSpent > 0 ? S.text : S.muted }}>{fmt(subSpent)}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Reserva ───────────────────────────────────────────────────────────
function Reserva({ emergency, setEmergency, save, emergencyTarget, emergencyPct, monthsCovered, avgExpense }) {
  const update = (k, v) => { const n = { ...emergency, [k]: parseFloat(v) || 0 }; setEmergency(n); save("emergency", n); };
  return (
    <div>
      <Card>
        <p className="text-sm font-semibold mb-1" style={{ color: S.text }}>Reserva de emergência</p>
        <p className="text-xs mb-4" style={{ color: S.muted }}>Gasto médio mensal: {fmt(avgExpense)}</p>
        <div className="space-y-3">
          <Inp label="Meses de cobertura desejados" type="number" value={emergency.months} onChange={e => update("months", e.target.value)} />
          <Inp label="Quanto já tem guardado (R$)" type="number" value={emergency.saved} onChange={e => update("saved", e.target.value)} />
        </div>
      </Card>
      <div className="rounded-2xl p-5" style={{ background: "linear-gradient(135deg,#064e3b,#065f46)", border: "1px solid #059669" }}>
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-xs mb-1" style={{ color: "#6ee7b7" }}>Reserva atual</p>
            <p className="text-3xl font-bold text-white">{fmt(emergency.saved)}</p>
            <p className="text-xs mt-1" style={{ color: "#6ee7b7" }}>meta: {fmt(emergencyTarget)}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-white">{monthsCovered.toFixed(1)}</p>
            <p className="text-xs" style={{ color: "#6ee7b7" }}>meses cobertos</p>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "#065f46" }}>
          <div className="h-full rounded-full" style={{ width: emergencyPct + "%", background: "#34d399" }} />
        </div>
        <p className="text-xs mt-2" style={{ color: "#6ee7b7" }}>{emergencyPct.toFixed(0)}% da meta</p>
      </div>
    </div>
  );
}

// ── Investimentos ─────────────────────────────────────────────────────
function Investimentos({ invest, addInvest, delInvest, totalInvested, investData, now }) {
  const [amount, setAmount] = useState("");
  const [type, setType] = useState(INVEST_TYPES[0]);
  const [date, setDate] = useState(now);
  const [years, setYears] = useState(10);
  const [rate, setRate] = useState(10);
  const [monthly, setMonthly] = useState("");
  const subs = GROUPS[2].subs;
  const ttStyle = { background: S.card, border: "1px solid " + S.border, borderRadius: 12, color: S.text };

  const submit = () => {
    const a = parseFloat(amount);
    if (!a || a <= 0) return;
    addInvest({ amount: a, type, date });
    setAmount("");
  };

  const byType = INVEST_TYPES.map(t => ({ name: t, value: invest.filter(i => i.type === t).reduce((s, i) => s + i.amount, 0) })).filter(d => d.value > 0);
  let proj = totalInvested;
  const projection = [];
  for (let y = 1; y <= years; y++) {
    proj = proj * (1 + rate / 100) + (parseFloat(monthly) || 0) * 12;
    projection.push({ ano: "Ano " + y, Projeção: Math.round(proj) });
  }

  return (
    <div>
      <div className="rounded-2xl p-5 mb-4" style={{ background: "linear-gradient(135deg,#1e3a5f,#1e4d3a)", border: "1px solid #1d4ed8" }}>
        <p className="text-xs mb-1" style={{ color: "#93c5fd" }}>Total investido acumulado</p>
        <p className="text-3xl font-bold text-white">{fmt(totalInvested)}</p>
      </div>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Registrar aporte</p>
        <div className="space-y-3">
          <Inp label="Valor (R$)" type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
          <Sel label="Tipo de investimento" value={type} onChange={e => setType(e.target.value)}>
            {subs.map(s => <option key={s.key} value={s.key}>{s.key}</option>)}
          </Sel>
          <Inp label="Data" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className="mt-4"><Btn onClick={submit} grad="linear-gradient(135deg,#065f46,#0f766e)" full>Adicionar aporte</Btn></div>
      </Card>
      {byType.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Distribuição por tipo</p>
          <div className="space-y-3">
            {byType.map((t, i) => {
              const pct = totalInvested > 0 ? (t.value / totalInvested) * 100 : 0;
              return (
                <div key={t.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: S.text }}>{t.name}</span>
                    <span style={{ color: S.muted }}>{fmt(t.value)} · {pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg }}>
                    <div className="h-full rounded-full" style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
      {investData.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Evolução acumulada</p>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={investData}>
              <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
              <XAxis dataKey="date" fontSize={10} tick={{ fill: S.muted }} />
              <YAxis fontSize={10} tick={{ fill: S.muted }} />
              <Tooltip formatter={v => fmt(v)} contentStyle={ttStyle} />
              <Line type="monotone" dataKey="Acumulado" stroke="#a78bfa" strokeWidth={2} dot={{ r: 3, fill: "#a78bfa" }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      )}
      <Card>
        <p className="text-sm font-semibold mb-1" style={{ color: S.text }}>Projeção de longo prazo</p>
        <p className="text-xs mb-4" style={{ color: S.muted }}>Estimativa — não é garantia de retorno</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <Inp label="Aporte mensal" type="number" value={monthly} onChange={e => setMonthly(e.target.value)} placeholder="R$" />
          <Inp label="Taxa anual %" type="number" value={rate} onChange={e => setRate(parseFloat(e.target.value) || 0)} placeholder="10" />
          <Inp label="Anos" type="number" value={years} onChange={e => setYears(parseInt(e.target.value) || 1)} placeholder="10" />
        </div>
        {projection.length > 0 && (
          <>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={projection}>
                <CartesianGrid strokeDasharray="3 3" stroke={S.border} />
                <XAxis dataKey="ano" fontSize={10} tick={{ fill: S.muted }} />
                <YAxis fontSize={10} tick={{ fill: S.muted }} />
                <Tooltip formatter={v => fmt(v)} contentStyle={ttStyle} />
                <Line type="monotone" dataKey="Projeção" stroke="#34d399" strokeWidth={2} dot={{ r: 3, fill: "#34d399" }} />
              </LineChart>
            </ResponsiveContainer>
            <p className="text-sm text-center mt-3" style={{ color: S.sub }}>
              Em {years} anos: <span className="font-bold" style={{ color: "#34d399" }}>{fmt(projection[projection.length - 1].Projeção)}</span>
            </p>
          </>
        )}
      </Card>
      {invest.length > 0 && (
        <Card>
          <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Histórico de aportes</p>
          {[...invest].sort((a, b) => b.date.localeCompare(a.date)).map(i => (
            <div key={i.id} className="flex items-center justify-between py-3" style={{ borderBottom: "1px solid " + S.border }}>
              <div>
                <p className="text-sm" style={{ color: S.text }}>{i.type}</p>
                <p className="text-xs" style={{ color: S.muted }}>{i.date.split("-").reverse().join("/")}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold" style={{ color: "#a78bfa" }}>{fmt(i.amount)}</span>
                <button onClick={() => delInvest(i.id)} style={{ color: "#374151" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

// -- Metas --------------------------------------------------------------
function Metas({ goals, addGoal, delGoal }) {
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [saved, setSaved] = useState("");

  const submit = () => {
    const t = parseFloat(target);
    if (!name || !t) return;
    addGoal({ name, target: t, saved: parseFloat(saved) || 0 });
    setName(""); setTarget(""); setSaved("");
  };

  return (
    <div>
      <Card>
        <p className="text-sm font-semibold mb-3" style={{ color: S.text }}>Nova meta</p>
        <div className="space-y-3">
          <Inp label="Nome da meta" value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Viagem, Carro" />
          <div className="grid grid-cols-2 gap-3">
            <Inp label="Meta (R$)" type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder="0,00" />
            <Inp label="Já tem (R$)" type="number" value={saved} onChange={e => setSaved(e.target.value)} placeholder="0,00" />
          </div>
        </div>
        <div className="mt-4"><Btn onClick={submit} full>Criar meta</Btn></div>
      </Card>
      {goals.length > 0 ? goals.map((g, i) => {
        const pct = g.target > 0 ? Math.min(100, (g.saved / g.target) * 100) : 0;
        return (
          <div key={g.id} className="rounded-2xl p-4 mb-3" style={{ background: S.card, border: "1px solid " + S.border }}>
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold" style={{ color: S.text }}>{g.name}</p>
                <p className="text-xs mt-0.5" style={{ color: S.muted }}>{fmt(g.saved)} de {fmt(g.target)}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{pct.toFixed(0)}%</span>
                <button onClick={() => delGoal(g.id)} style={{ color: "#374151" }}><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: S.bg }}>
              <div className="h-full rounded-full" style={{ width: pct + "%", background: COLORS[i % COLORS.length] }} />
            </div>
          </div>
        );
      }) : <Empty msg="Nenhuma meta ainda" />}
    </div>
  );
}
