import { useState, useCallback } from "react";

// ─── Palette ───────────────────────────────────────────────────────────────
const C = {
  bg:      "#080c12",
  panel:   "#0d1220",
  border:  "#1a2535",
  htb:     "#ff6b35",   // 63 kV
  hta:     "#22d3ee",   // 20 kV
  ground:  "#4ade80",
  wire:    "#94a3b8",
  alert:   "#f43f5e",
  ok:      "#22d3ee",
  closed:  "#22d3ee",
  open:    "#f43f5e",
  text:    "#e2e8f0",
  dim:     "#475569",
  hi:      "#fbbf24",
  tgrid:   "#1e293b",
};

// ─── Primitives ─────────────────────────────────────────────────────────────

// Sectionneur (isolateur) – IEC 60617
const Sect = ({ x, y, color = C.wire, vertical = true }) => {
  if (vertical) return (
    <g>
      <line x1={x} y1={y - 12} x2={x} y2={y - 5} stroke={color} strokeWidth={1.8} />
      <line x1={x - 7} y1={y - 5} x2={x + 7} y2={y - 5} stroke={color} strokeWidth={1.8} />
      <line x1={x - 7} y1={y + 5} x2={x + 7} y2={y + 5} stroke={color} strokeWidth={1.8} />
      <line x1={x} y1={y + 5} x2={x} y2={y + 12} stroke={color} strokeWidth={1.8} />
    </g>
  );
  return (
    <g>
      <line x1={x - 12} y1={y} x2={x - 5} y2={y} stroke={color} strokeWidth={1.8} />
      <line x1={x - 5} y1={y - 7} x2={x - 5} y2={y + 7} stroke={color} strokeWidth={1.8} />
      <line x1={x + 5} y1={y - 7} x2={x + 5} y2={y + 7} stroke={color} strokeWidth={1.8} />
      <line x1={x + 5} y1={y} x2={x + 12} y2={y} stroke={color} strokeWidth={1.8} />
    </g>
  );
};

// Disjoncteur (circuit breaker)
const Disj = ({ x, y, open, color, onClick, hovered, onEnter, onLeave }) => {
  const clr = open ? C.open : (color || C.closed);
  return (
    <g onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave}
       style={{ cursor: "pointer" }}>
      <rect x={x - 10} y={y - 10} width={20} height={20} rx={3}
        fill={hovered ? "#1e293b" : "#0a1020"}
        stroke={hovered ? C.hi : clr} strokeWidth={hovered ? 2 : 1.5} />
      {open
        ? <>
            <line x1={x - 6} y1={y - 6} x2={x + 6} y2={y + 6} stroke={C.open} strokeWidth={1.5} />
            <line x1={x + 6} y1={y - 6} x2={x - 6} y2={y + 6} stroke={C.open} strokeWidth={1.5} />
          </>
        : <line x1={x} y1={y - 6} x2={x} y2={y + 6} stroke={clr} strokeWidth={2} />
      }
    </g>
  );
};

// Transformateur de courant (TC)
const TC = ({ x, y, color = C.wire }) => (
  <g>
    <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={1.4} />
    <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize={7} fontWeight="bold">TC</text>
  </g>
);

// Transformateur de tension (TT)
const TT = ({ x, y, color = C.wire }) => (
  <g>
    <circle cx={x - 4} cy={y} r={6} fill="none" stroke={color} strokeWidth={1.3} />
    <circle cx={x + 4} cy={y} r={6} fill="none" stroke={color} strokeWidth={1.3} />
    <text x={x} y={y + 12} textAnchor="middle" fill={color} fontSize={7}>TT</text>
  </g>
);

// Parafoudre (lightning arrester)
const Parafoudre = ({ x, y, color = C.wire }) => (
  <g>
    <line x1={x} y1={y - 10} x2={x} y2={y - 3} stroke={color} strokeWidth={1.5} />
    <polygon points={`${x},${y + 5} ${x - 5},${y - 3} ${x + 5},${y - 3}`}
      fill={color} opacity={0.7} />
    <line x1={x} y1={y + 5} x2={x} y2={y + 10} stroke={color} strokeWidth={1.5} />
    <line x1={x - 5} y1={y + 10} x2={x + 5} y2={y + 10} stroke={C.ground} strokeWidth={2} />
    <line x1={x - 3} y1={y + 13} x2={x + 3} y2={y + 13} stroke={C.ground} strokeWidth={1.5} />
    <line x1={x - 1} y1={y + 16} x2={x + 1} y2={y + 16} stroke={C.ground} strokeWidth={1} />
  </g>
);

// Mise à la terre neutre (résistance de mise à la terre)
const NeutralGround = ({ x, y }) => (
  <g>
    <line x1={x} y1={y} x2={x} y2={y + 10} stroke={C.ground} strokeWidth={1.5} />
    <rect x={x - 5} y={y + 10} width={10} height={14} rx={1}
      fill="none" stroke={C.ground} strokeWidth={1.5} />
    <text x={x + 9} y={y + 19} fill={C.ground} fontSize={7}>R</text>
    <line x1={x} y1={y + 24} x2={x} y2={y + 32} stroke={C.ground} strokeWidth={1.5} />
    <line x1={x - 8} y1={y + 32} x2={x + 8} y2={y + 32} stroke={C.ground} strokeWidth={2} />
    <line x1={x - 5} y1={y + 36} x2={x + 5} y2={y + 36} stroke={C.ground} strokeWidth={1.5} />
    <line x1={x - 2} y1={y + 40} x2={x + 2} y2={y + 40} stroke={C.ground} strokeWidth={1} />
  </g>
);

// Grand transformateur HTB/HTA
const BigTransformer = ({ cx, cy, hovered, onClick, onEnter, onLeave, label }) => (
  <g onClick={onClick} onMouseEnter={onEnter} onMouseLeave={onLeave} style={{ cursor: "pointer" }}>
    <rect x={cx - 38} y={cy - 52} width={76} height={104} rx={6}
      fill="#080f18" stroke={hovered ? C.hi : C.border} strokeWidth={hovered ? 2 : 1.5} />
    <circle cx={cx} cy={cy - 22} r={22}
      fill="none" stroke={hovered ? C.htb : "#b45309"} strokeWidth={hovered ? 2.5 : 2} />
    <circle cx={cx} cy={cy + 22} r={22}
      fill="none" stroke={hovered ? C.hta : "#0e7490"} strokeWidth={hovered ? 2.5 : 2} />
    <text x={cx} y={cy - 18} textAnchor="middle" fill={C.htb} fontSize={9} fontWeight="bold">Y</text>
    <text x={cx} y={cy - 8} textAnchor="middle" fill={C.htb} fontSize={7}>N</text>
    <text x={cx} y={cy + 26} textAnchor="middle" fill={C.hta} fontSize={9} fontWeight="bold">yn</text>
    <text x={cx} y={cy + 62} textAnchor="middle" fill={hovered ? C.hi : C.dim} fontSize={8}
      fontFamily="monospace">{label}</text>
  </g>
);

// Régleur en charge (OLTC) indicator
const OLTC = ({ x, y }) => (
  <g>
    <rect x={x - 12} y={y - 7} width={24} height={14} rx={3}
      fill="#1e1a06" stroke="#d97706" strokeWidth={1.2} />
    <text x={x} y={y + 4} textAnchor="middle" fill="#d97706" fontSize={7} fontWeight="bold">OLTC</text>
  </g>
);

// Relais de protection
const Relay = ({ x, y, type, color = "#8b5cf6" }) => (
  <g>
    <rect x={x - 10} y={y - 7} width={20} height={14} rx={2}
      fill="#120e1e" stroke={color} strokeWidth={1.2} />
    <text x={x} y={y + 4} textAnchor="middle" fill={color} fontSize={7} fontWeight="bold">{type}</text>
  </g>
);

// Comptage
const Comptage = ({ x, y }) => (
  <g>
    <rect x={x - 12} y={y - 8} width={24} height={16} rx={2}
      fill="#06161a" stroke="#06b6d4" strokeWidth={1.2} />
    <text x={x} y={y + 4} textAnchor="middle" fill="#06b6d4" fontSize={7} fontWeight="bold">CPT</text>
  </g>
);

// Ground
const Gnd = ({ x, y }) => (
  <g>
    <line x1={x} y1={y} x2={x} y2={y + 8} stroke={C.ground} strokeWidth={1.5} />
    <line x1={x - 8} y1={y + 8} x2={x + 8} y2={y + 8} stroke={C.ground} strokeWidth={2} />
    <line x1={x - 5} y1={y + 12} x2={x + 5} y2={y + 12} stroke={C.ground} strokeWidth={1.5} />
    <line x1={x - 2} y1={y + 16} x2={x + 2} y2={y + 16} stroke={C.ground} strokeWidth={1} />
  </g>
);

// Pylône / Arrivée ligne
const ArriveeLigne = ({ x, y, label, color }) => (
  <g>
    <line x1={x - 30} y1={y + 20} x2={x} y2={y} stroke={color} strokeWidth={2} strokeDasharray="5 3" />
    <line x1={x + 30} y1={y + 20} x2={x} y2={y} stroke={color} strokeWidth={2} strokeDasharray="5 3" />
    <line x1={x} y1={y} x2={x} y2={y + 45} stroke={color} strokeWidth={2} />
    <polygon points={`${x - 3},${y + 2} ${x + 3},${y + 2} ${x},${y - 6}`}
      fill={color} opacity={0.8} />
    <text x={x} y={y - 14} textAnchor="middle" fill={color} fontSize={9} fontWeight="bold"
      fontFamily="monospace">{label}</text>
  </g>
);

// ─── Tooltip ────────────────────────────────────────────────────────────────
const Tooltip = ({ x, y, data, onClose }) => {
  const bx = Math.min(Math.max(x - 90, 8), 720);
  const by = Math.max(y - 100, 8);
  return (
    <g onClick={onClose} style={{ cursor: "pointer" }}>
      <rect x={bx} y={by} width={180} height={data.details.length * 15 + 32} rx={6}
        fill="#0f1e30" stroke="#334155" strokeWidth={1.5}
        filter="url(#shadow)" />
      <text x={bx + 90} y={by + 18} textAnchor="middle"
        fill={data.color || C.hi} fontSize={10} fontWeight="bold">{data.name}</text>
      {data.details.map((d, i) => (
        <text key={i} x={bx + 90} y={by + 33 + i * 15}
          textAnchor="middle" fill={C.text} fontSize={9}>{d}</text>
      ))}
    </g>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function PosteSource() {
  const [breakers, setBreakers] = useState({
    // HTB line breakers
    linA: false, linB: false,
    // HTB bus coupler
    copHTB: false,
    // Transformer breakers (HTB side)
    t1htb: false, t2htb: false,
    // Transformer breakers (HTA side)
    t1hta: false, t2hta: false,
    // HTA bus coupler
    copHTA: false,
    // Départs HTA (8 feeders)
    d1: false, d2: false, d3: false, d4: false,
    d5: false, d6: false, d7: false, d8: false,
  });

  const [tooltip, setTooltip] = useState(null);
  const [hovered, setHovered] = useState(null);

  const toggle = useCallback((id) =>
    setBreakers(p => ({ ...p, [id]: !p[id] })), []);

  const tip = (id, x, y) =>
    setTooltip(prev => prev?.id === id ? null : { id, x, y });

  const TIPS = {
    linA: { name: "Arrivée Ligne 1", color: C.htb, details: ["63 kV – Ligne aérienne", "Imax = 400 A", "Câble ACSR 240mm²", "Protection: distance Z"] },
    linB: { name: "Arrivée Ligne 2", color: C.htb, details: ["63 kV – Ligne aérienne", "Imax = 400 A", "Câble ACSR 240mm²", "Protection: distance Z"] },
    copHTB: { name: "Coupleur HTB", color: C.htb, details: ["Jeu de barres 63 kV", "Couplage normalement ouvert", "Bascule automatique"] },
    t1htb: { name: "Disj. HTB – T1", color: C.htb, details: ["63 kV – 400 A", "Pouvoir de coupure: 25 kA", "SF6 – CEI 62271-100"] },
    t2htb: { name: "Disj. HTB – T2", color: C.htb, details: ["63 kV – 400 A", "Pouvoir de coupure: 25 kA", "SF6 – CEI 62271-100"] },
    t1: { name: "Transformateur T1", color: C.hi, details: ["40 MVA – 63/20 kV", "Couplage YNyn0", "Ucc = 12%", "OLTC ±10% / 17 prises", "Refroidissement ONAN"] },
    t2: { name: "Transformateur T2", color: C.hi, details: ["40 MVA – 63/20 kV", "Couplage YNyn0", "Ucc = 12%", "OLTC ±10% / 17 prises", "Refroidissement ONAN"] },
    t1hta: { name: "Disj. HTA – T1", color: C.hta, details: ["20 kV – 1250 A", "Pouvoir de coupure: 25 kA", "Vide – CEI 62271-100"] },
    t2hta: { name: "Disj. HTA – T2", color: C.hta, details: ["20 kV – 1250 A", "Pouvoir de coupure: 25 kA", "Vide – CEI 62271-100"] },
    copHTA: { name: "Coupleur HTA", color: C.hta, details: ["Jeu de barres 20 kV", "Normalement ouvert (NO)", "Télécommandable"] },
    d1: { name: "Départ D1 – Zone Nord", color: C.hta, details: ["20 kV – 400 A", "Câble souterrain XR-HTA", "Protection: 50/51, 67N", "P = 8 MW, Q = 3 MVAr"] },
    d2: { name: "Départ D2 – Zone Sud", color: C.hta, details: ["20 kV – 400 A", "Ligne aérienne HTA", "Protection: 50/51, 67N", "P = 6 MW"] },
    d3: { name: "Départ D3 – Industriel", color: C.hta, details: ["20 kV – 630 A", "Câble souterrain", "Protection: 50/51N, 21", "P = 12 MW"] },
    d4: { name: "Départ D4 – Rural Est", color: C.hta, details: ["20 kV – 400 A", "Ligne aérienne HTA", "Protection: 50/51, 67N", "P = 4 MW"] },
    d5: { name: "Départ D5 – Zone Ouest", color: C.hta, details: ["20 kV – 400 A", "Câble souterrain", "Protection: 50/51, 67N", "P = 7 MW"] },
    d6: { name: "Départ D6 – Périurbain", color: C.hta, details: ["20 kV – 400 A", "Mixte câble/ligne", "Protection: 50/51, 67N", "P = 5 MW"] },
    d7: { name: "Départ D7 – Rural Ouest", color: C.hta, details: ["20 kV – 400 A", "Ligne aérienne HTA", "Protection: 50/51, 67N", "P = 3 MW"] },
    d8: { name: "Services Auxiliaires", color: C.hta, details: ["20 kV – 160 A", "Transfo SA 160 kVA", "Alimentation interne", "400V/230V"] },
  };

  const W = 900, H = 980;
  // Layout X positions
  const X_L1 = 200, X_L2 = 700;   // Lignes arrivées
  const X_T1 = 270, X_T2 = 630;   // Transformateurs
  const X_COP = 450;               // Coupleurs
  // Feeder positions (4 gauche, 4 droite)
  const FX = [110, 210, 310, 410, 500, 600, 700, 800];
  // Y levels
  const Y_TOP    = 60;
  const Y_SECT1  = 130;  // Sectionneur ligne
  const Y_DISJ_L = 170;  // Disjoncteur ligne
  const Y_TC1    = 210;  // TC côté ligne
  const Y_HTB    = 270;  // Jeu de barres HTB
  const Y_DISJ_T = 330;  // Disjoncteur HTB transfo
  const Y_TC2    = 370;  // TC côté transfo
  const Y_TRAFO  = 470;  // Transformateurs
  const Y_TC3    = 560;  // TC côté HTA
  const Y_DISJ_H = 600;  // Disjoncteur HTA
  const Y_HTA    = 650;  // Jeu de barres HTA
  const Y_DISJ_D = 700;  // Disjoncteurs départs
  const Y_TC_D   = 740;  // TC départs
  const Y_RELAY  = 770;  // Relais départs
  const Y_BOTTOM = 940;  // Bas

  // Wire color helper
  const wC = (id) => breakers[id] ? C.open : undefined;

  return (
    <div style={{
      background: C.bg, minHeight: "100vh", display: "flex",
      flexDirection: "column", alignItems: "center",
      fontFamily: "'Courier New', monospace", padding: "16px 8px",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 12, textAlign: "center" }}>
        <div style={{
          color: C.htb, fontSize: 13, letterSpacing: 6,
          textTransform: "uppercase", fontWeight: "bold"
        }}>
          Schéma Unifilaire — Poste Source
        </div>
        <div style={{ color: C.dim, fontSize: 10, marginTop: 4 }}>
          63 kV / 20 kV  ·  2×40 MVA  ·  8 Départs HTA  ·  CEI 61850 / CEI 60617
        </div>
        <div style={{ color: C.dim, fontSize: 9, marginTop: 2 }}>
          Cliquer sur les disjoncteurs pour ouvrir/fermer · Cliquer sur les équipements pour les détails
        </div>
      </div>

      {/* Main SVG */}
      <div style={{
        background: C.panel, borderRadius: 12, border: `1px solid ${C.border}`,
        padding: 4, boxShadow: "0 16px 48px rgba(0,0,0,0.7)",
        overflowX: "auto", maxWidth: "100%"
      }}>
        <svg width={W} height={H}>
          <defs>
            <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000" floodOpacity="0.6" />
            </filter>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* ══════════════ ZONE HTB ══════════════ */}
          <rect x={8} y={55} width={W - 16} height={240} rx={6}
            fill="#120a04" stroke="#7c2d12" strokeWidth={1} strokeDasharray="5 4" opacity={0.6} />
          <text x={20} y={74} fill={C.htb} fontSize={9} opacity={0.9} letterSpacing={2}>
            ZONE HTB — 63 kV
          </text>

          {/* ── Arrivée Ligne 1 ── */}
          <ArriveeLigne x={X_L1} y={Y_TOP} label="LIGNE 1" color={C.htb} />
          {/* Parafoudre L1 */}
          <line x1={X_L1 - 20} y1={Y_TOP + 35} x2={X_L1 - 20} y2={Y_TOP + 35} stroke={C.htb} strokeWidth={0} />
          <Parafoudre x={X_L1 - 28} y={Y_TOP + 28} color={C.htb} />

          {/* Sectionneur L1 */}
          <Sect x={X_L1} y={Y_SECT1} color={C.htb} />
          {/* TT L1 */}
          <TT x={X_L1 + 20} y={Y_SECT1 - 5} color={C.htb} />
          {/* Disjoncteur ligne L1 */}
          <line x1={X_L1} y1={Y_SECT1 + 12} x2={X_L1} y2={Y_DISJ_L - 10} stroke={C.htb} strokeWidth={2} />
          <Disj x={X_L1} y={Y_DISJ_L} open={breakers.linA}
            color={C.htb}
            hovered={hovered === "linA"}
            onClick={() => { toggle("linA"); tip("linA", X_L1, Y_DISJ_L - 20); }}
            onEnter={() => setHovered("linA")} onLeave={() => setHovered(null)} />
          <text x={X_L1 + 16} y={Y_DISJ_L + 4} fill={C.dim} fontSize={8}>DJ-L1</text>
          {/* TC L1 */}
          <line x1={X_L1} y1={Y_DISJ_L + 10} x2={X_L1} y2={Y_TC1 - 7} stroke={C.htb} strokeWidth={2} />
          <TC x={X_L1} y={Y_TC1} color={C.htb} />

          {/* ── Arrivée Ligne 2 ── */}
          <ArriveeLigne x={X_L2} y={Y_TOP} label="LIGNE 2" color={C.htb} />
          <Parafoudre x={X_L2 + 28} y={Y_TOP + 28} color={C.htb} />
          <Sect x={X_L2} y={Y_SECT1} color={C.htb} />
          <TT x={X_L2 - 28} y={Y_SECT1 - 5} color={C.htb} />
          <line x1={X_L2} y1={Y_SECT1 + 12} x2={X_L2} y2={Y_DISJ_L - 10} stroke={C.htb} strokeWidth={2} />
          <Disj x={X_L2} y={Y_DISJ_L} open={breakers.linB}
            color={C.htb}
            hovered={hovered === "linB"}
            onClick={() => { toggle("linB"); tip("linB", X_L2, Y_DISJ_L - 20); }}
            onEnter={() => setHovered("linB")} onLeave={() => setHovered(null)} />
          <text x={X_L2 - 36} y={Y_DISJ_L + 4} fill={C.dim} fontSize={8}>DJ-L2</text>
          <line x1={X_L2} y1={Y_DISJ_L + 10} x2={X_L2} y2={Y_TC1 - 7} stroke={C.htb} strokeWidth={2} />
          <TC x={X_L2} y={Y_TC1} color={C.htb} />

          {/* ── Jeu de barres HTB (2 sections) ── */}
          <line x1={X_L1} y1={Y_TC1 + 7} x2={X_L1} y2={Y_HTB} stroke={C.htb} strokeWidth={2} />
          <line x1={X_L2} y1={Y_TC1 + 7} x2={X_L2} y2={Y_HTB} stroke={C.htb} strokeWidth={2} />
          {/* Section A */}
          <rect x={60} y={Y_HTB - 5} width={370} height={10} rx={4}
            fill={C.htb} opacity={0.85} />
          <text x={245} y={Y_HTB - 12} textAnchor="middle"
            fill={C.htb} fontSize={8} fontWeight="bold">JB-HTB — SECTION A</text>
          {/* Section B */}
          <rect x={470} y={Y_HTB - 5} width={370} height={10} rx={4}
            fill={C.htb} opacity={0.85} />
          <text x={655} y={Y_HTB - 12} textAnchor="middle"
            fill={C.htb} fontSize={8} fontWeight="bold">JB-HTB — SECTION B</text>
          {/* Coupleur HTB */}
          <line x1={X_COP} y1={Y_HTB - 5} x2={X_COP} y2={Y_DISJ_T - 10}
            stroke={breakers.copHTB ? C.open : C.htb} strokeWidth={2} />
          <Disj x={X_COP} y={Y_DISJ_T - 20} open={breakers.copHTB}
            color={C.htb}
            hovered={hovered === "copHTB"}
            onClick={() => { toggle("copHTB"); tip("copHTB", X_COP, Y_DISJ_T - 45); }}
            onEnter={() => setHovered("copHTB")} onLeave={() => setHovered(null)} />
          <text x={X_COP + 14} y={Y_DISJ_T - 16} fill={C.dim} fontSize={7}>COP-HTB</text>
          <text x={X_COP} y={Y_HTB + 22} textAnchor="middle"
            fill="#f97316" fontSize={8} fontWeight="bold">NO</text>

          {/* ══════════════ TRANSFORMATEURS ══════════════ */}
          <rect x={8} y={300} width={W - 16} height={310} rx={6}
            fill="#080a06" stroke="#4a5568" strokeWidth={1} strokeDasharray="4 4" opacity={0.5} />
          <text x={20} y={318} fill={C.dim} fontSize={8} opacity={0.8} letterSpacing={2}>
            TRANSFORMATEURS HTB / HTA
          </text>

          {/* ── T1 ── */}
          {/* Fil HTB → Disj T1 */}
          <line x1={X_T1} y1={Y_HTB + 5} x2={X_T1} y2={Y_DISJ_T - 10}
            stroke={C.htb} strokeWidth={2} />
          <Sect x={X_T1} y={Y_DISJ_T - 30} color={C.htb} />
          <line x1={X_T1} y1={Y_DISJ_T - 18} x2={X_T1} y2={Y_DISJ_T - 10} stroke={C.htb} strokeWidth={2} />
          <Disj x={X_T1} y={Y_DISJ_T} open={breakers.t1htb}
            color={C.htb}
            hovered={hovered === "t1htb"}
            onClick={() => { toggle("t1htb"); tip("t1htb", X_T1, Y_DISJ_T - 25); }}
            onEnter={() => setHovered("t1htb")} onLeave={() => setHovered(null)} />
          <text x={X_T1 + 14} y={Y_DISJ_T + 4} fill={C.dim} fontSize={8}>DJ-T1 HTB</text>
          <line x1={X_T1} y1={Y_DISJ_T + 10} x2={X_T1} y2={Y_TC2 - 7} stroke={C.htb} strokeWidth={2} />
          <TC x={X_T1} y={Y_TC2} color={C.htb} />
          <line x1={X_T1} y1={Y_TC2 + 7} x2={X_T1} y2={Y_TRAFO - 52} stroke={C.htb} strokeWidth={2} />
          <BigTransformer cx={X_T1} cy={Y_TRAFO}
            label="T1 – 40 MVA"
            hovered={hovered === "t1"}
            onClick={() => tip("t1", X_T1 + 60, Y_TRAFO)}
            onEnter={() => setHovered("t1")} onLeave={() => setHovered(null)} />
          <OLTC x={X_T1 + 42} y={Y_TRAFO} />
          {/* Neutre T1 */}
          <line x1={X_T1 - 38} y1={Y_TRAFO + 22} x2={X_T1 - 60} y2={Y_TRAFO + 22} stroke={C.ground} strokeWidth={1.5} />
          <NeutralGround x={X_T1 - 60} y={Y_TRAFO + 22} />
          {/* Fil HTA → Disj T1 */}
          <line x1={X_T1} y1={Y_TRAFO + 52} x2={X_T1} y2={Y_TC3 - 7} stroke={C.hta} strokeWidth={2.5} />
          <TC x={X_T1} y={Y_TC3} color={C.hta} />
          <line x1={X_T1} y1={Y_TC3 + 7} x2={X_T1} y2={Y_DISJ_H - 10} stroke={C.hta} strokeWidth={2.5} />
          <Disj x={X_T1} y={Y_DISJ_H} open={breakers.t1hta}
            color={C.hta}
            hovered={hovered === "t1hta"}
            onClick={() => { toggle("t1hta"); tip("t1hta", X_T1, Y_DISJ_H - 25); }}
            onEnter={() => setHovered("t1hta")} onLeave={() => setHovered(null)} />
          <text x={X_T1 + 14} y={Y_DISJ_H + 4} fill={C.dim} fontSize={8}>DJ-T1 HTA</text>
          <line x1={X_T1} y1={Y_DISJ_H + 10} x2={X_T1} y2={Y_HTA + 5} stroke={C.hta} strokeWidth={2.5} />

          {/* ── T2 ── */}
          <line x1={X_T2} y1={Y_HTB + 5} x2={X_T2} y2={Y_DISJ_T - 10} stroke={C.htb} strokeWidth={2} />
          <Sect x={X_T2} y={Y_DISJ_T - 30} color={C.htb} />
          <line x1={X_T2} y1={Y_DISJ_T - 18} x2={X_T2} y2={Y_DISJ_T - 10} stroke={C.htb} strokeWidth={2} />
          <Disj x={X_T2} y={Y_DISJ_T} open={breakers.t2htb}
            color={C.htb}
            hovered={hovered === "t2htb"}
            onClick={() => { toggle("t2htb"); tip("t2htb", X_T2 - 180, Y_DISJ_T - 25); }}
            onEnter={() => setHovered("t2htb")} onLeave={() => setHovered(null)} />
          <text x={X_T2 - 68} y={Y_DISJ_T + 4} fill={C.dim} fontSize={8}>DJ-T2 HTB</text>
          <line x1={X_T2} y1={Y_DISJ_T + 10} x2={X_T2} y2={Y_TC2 - 7} stroke={C.htb} strokeWidth={2} />
          <TC x={X_T2} y={Y_TC2} color={C.htb} />
          <line x1={X_T2} y1={Y_TC2 + 7} x2={X_T2} y2={Y_TRAFO - 52} stroke={C.htb} strokeWidth={2} />
          <BigTransformer cx={X_T2} cy={Y_TRAFO}
            label="T2 – 40 MVA"
            hovered={hovered === "t2"}
            onClick={() => tip("t2", X_T2 - 180, Y_TRAFO)}
            onEnter={() => setHovered("t2")} onLeave={() => setHovered(null)} />
          <OLTC x={X_T2 + 42} y={Y_TRAFO} />
          <line x1={X_T2 + 38} y1={Y_TRAFO + 22} x2={X_T2 + 60} y2={Y_TRAFO + 22} stroke={C.ground} strokeWidth={1.5} />
          <NeutralGround x={X_T2 + 60} y={Y_TRAFO + 22} />
          <line x1={X_T2} y1={Y_TRAFO + 52} x2={X_T2} y2={Y_TC3 - 7} stroke={C.hta} strokeWidth={2.5} />
          <TC x={X_T2} y={Y_TC3} color={C.hta} />
          <line x1={X_T2} y1={Y_TC3 + 7} x2={X_T2} y2={Y_DISJ_H - 10} stroke={C.hta} strokeWidth={2.5} />
          <Disj x={X_T2} y={Y_DISJ_H} open={breakers.t2hta}
            color={C.hta}
            hovered={hovered === "t2hta"}
            onClick={() => { toggle("t2hta"); tip("t2hta", X_T2 - 180, Y_DISJ_H - 25); }}
            onEnter={() => setHovered("t2hta")} onLeave={() => setHovered(null)} />
          <text x={X_T2 - 68} y={Y_DISJ_H + 4} fill={C.dim} fontSize={8}>DJ-T2 HTA</text>
          <line x1={X_T2} y1={Y_DISJ_H + 10} x2={X_T2} y2={Y_HTA + 5} stroke={C.hta} strokeWidth={2.5} />

          {/* ══════════════ ZONE HTA ══════════════ */}
          <rect x={8} y={635} width={W - 16} height={330} rx={6}
            fill="#040c12" stroke="#164e63" strokeWidth={1} strokeDasharray="5 4" opacity={0.6} />
          <text x={20} y={652} fill={C.hta} fontSize={9} opacity={0.9} letterSpacing={2}>
            TABLEAU HTA — 20 kV  ·  TGBT Source
          </text>

          {/* ── Jeu de barres HTA ── */}
          <rect x={60} y={Y_HTA - 5} width={345} height={10} rx={4}
            fill={C.hta} opacity={0.9} />
          <text x={232} y={Y_HTA - 12} textAnchor="middle"
            fill={C.hta} fontSize={8} fontWeight="bold">JB-HTA — SECTION A</text>
          <rect x={495} y={Y_HTA - 5} width={345} height={10} rx={4}
            fill={C.hta} opacity={0.9} />
          <text x={668} y={Y_HTA - 12} textAnchor="middle"
            fill={C.hta} fontSize={8} fontWeight="bold">JB-HTA — SECTION B</text>
          {/* Coupleur HTA */}
          <line x1={X_COP} y1={Y_HTA - 5} x2={X_COP} y2={Y_DISJ_D - 30}
            stroke={breakers.copHTA ? C.open : C.hta} strokeWidth={2.5} />
          <Disj x={X_COP} y={Y_DISJ_D - 20} open={breakers.copHTA}
            color={C.hta}
            hovered={hovered === "copHTA"}
            onClick={() => { toggle("copHTA"); tip("copHTA", X_COP - 100, Y_DISJ_D - 50); }}
            onEnter={() => setHovered("copHTA")} onLeave={() => setHovered(null)} />
          <text x={X_COP + 14} y={Y_DISJ_D - 17} fill={C.dim} fontSize={7}>COP-HTA</text>
          <text x={X_COP} y={Y_HTA + 22} textAnchor="middle"
            fill="#06b6d4" fontSize={8} fontWeight="bold">NO</text>

          {/* ── 8 DÉPARTS HTA ── */}
          {["d1","d2","d3","d4","d5","d6","d7","d8"].map((id, i) => {
            const fx = FX[i];
            const isOpen = breakers[id];
            const wc = isOpen ? C.open : C.hta;
            const labels = ["D1 Nord","D2 Sud","D3 Indus","D4 Rural E","D5 Ouest","D6 Périurb","D7 Rural O","D8 SA"];
            const amps   = ["400A","400A","630A","400A","400A","400A","400A","160A"];
            const isHov  = hovered === id;
            return (
              <g key={id}>
                <line x1={fx} y1={Y_HTA + 5} x2={fx} y2={Y_DISJ_D - 10} stroke={wc} strokeWidth={2} />
                <Sect x={fx} y={Y_DISJ_D - 22} color={wc} />
                <line x1={fx} y1={Y_DISJ_D - 10} x2={fx} y2={Y_DISJ_D - 10} stroke={wc} strokeWidth={2} />
                <Disj x={fx} y={Y_DISJ_D} open={isOpen}
                  color={C.hta}
                  hovered={isHov}
                  onClick={() => { toggle(id); tip(id, Math.min(Math.max(fx - 80, 10), 720), Y_DISJ_D - 30); }}
                  onEnter={() => setHovered(id)} onLeave={() => setHovered(null)} />
                <line x1={fx} y1={Y_DISJ_D + 10} x2={fx} y2={Y_TC_D - 7} stroke={wc} strokeWidth={2} />
                <TC x={fx} y={Y_TC_D} color={wc} />
                <line x1={fx} y1={Y_TC_D + 7} x2={fx} y2={Y_RELAY - 8} stroke={wc} strokeWidth={2} />
                <Relay x={fx} y={Y_RELAY} type="P" color={isHov ? C.hi : "#8b5cf6"} />
                <line x1={fx} y1={Y_RELAY + 7} x2={fx} y2={Y_RELAY + 30} stroke={wc} strokeWidth={2} />
                {/* Comptage sur D1 et D5 uniquement */}
                {(i === 0 || i === 4) && <Comptage x={fx + 20} y={Y_RELAY + 10} />}
                {/* Flèche départ */}
                <polygon
                  points={`${fx - 5},${Y_RELAY + 36} ${fx + 5},${Y_RELAY + 36} ${fx},${Y_RELAY + 46}`}
                  fill={isOpen ? C.open : C.hta} opacity={0.8} />
                <text x={fx} y={Y_RELAY + 62} textAnchor="middle"
                  fill={isHov ? C.hi : C.hta} fontSize={8} fontWeight="bold">{labels[i]}</text>
                <text x={fx} y={Y_RELAY + 74} textAnchor="middle"
                  fill={C.dim} fontSize={7}>{amps[i]}</text>
              </g>
            );
          })}

          {/* ══════════════ TOOLTIP ══════════════ */}
          {tooltip && TIPS[tooltip.id] && (
            <Tooltip x={tooltip.x} y={tooltip.y}
              data={TIPS[tooltip.id]}
              onClose={() => setTooltip(null)} />
          )}

          {/* ══ Filigrane normes ══ */}
          <text x={W / 2} y={H - 12} textAnchor="middle"
            fill={C.dim} fontSize={8} opacity={0.5}>
            IEC 60617 · IEC 61850 · IEC 60909 · CEI 62271  —  Poste Source 63/20 kV
          </text>
        </svg>
      </div>

      {/* État des disjoncteurs */}
      <div style={{
        marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap",
        justifyContent: "center", maxWidth: 900
      }}>
        {Object.entries(breakers).map(([id, open]) => (
          <div key={id} onClick={() => toggle(id)} style={{
            padding: "4px 10px", borderRadius: 20, cursor: "pointer",
            background: open ? "#2d0a12" : "#051a14",
            border: `1px solid ${open ? C.open : C.closed}`,
            color: open ? C.open : C.closed,
            fontSize: 9, fontFamily: "monospace",
            transition: "all 0.2s"
          }}>
            {id.toUpperCase()} {open ? "⚡ O" : "✓ F"}
          </div>
        ))}
      </div>
      <div style={{ color: C.dim, fontSize: 9, marginTop: 6 }}>
        O = Ouvert · F = Fermé — Cliquer pour commuter
      </div>
    </div>
  );
}
