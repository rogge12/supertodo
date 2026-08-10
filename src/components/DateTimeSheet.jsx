import { useState } from "react";
import { isoDate, addDays, pad2 } from "../lib/parser.js";
import { DAY_NAMES, MONTH_NAMES, todayIso } from "../lib/format.js";
import { Chevron, Clock } from "./Icons.jsx";

const MONTHS_LONG = [
  "januari", "februari", "mars", "april", "maj", "juni",
  "juli", "augusti", "september", "oktober", "november", "december",
];
const WD_SHORT = ["M", "T", "O", "T", "F", "L", "S"]; // vecka börjar på måndag

/* Rutnätet för en månad: sex rader à sju dagar, måndag först */
function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const lead = (first.getDay() + 6) % 7; // hur många dagar från förra månaden
  const start = addDays(first, -lead);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

/* ---------- Urtavla ---------- */
function ClockFace({ hour, minute }) {
  const C = 100, R_OUT = 80, R_IN = 49;
  const pos = (angleDeg, r) => {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [C + r * Math.cos(a), C + r * Math.sin(a)];
  };
  const inner = hour === 0 || hour > 12;          // 13–24 ligger på inre ringen
  const hourAngle = (hour % 12) * 30 + minute * 0.5;
  const minAngle = minute * 6;
  const [hx, hy] = pos(hourAngle, inner ? 40 : 60);
  const [mx, my] = pos(minAngle, 74);

  return (
    <svg className="clockface" viewBox="0 0 200 200" role="img" aria-label={`Klockan ${pad2(hour)}:${pad2(minute)}`}>
      <circle cx={C} cy={C} r="94" className="cf-bg" />
      {/* minutstreck */}
      {Array.from({ length: 12 }, (_, i) => {
        const [x1, y1] = pos(i * 30, 93);
        const [x2, y2] = pos(i * 30, 88);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="cf-tick5" />;
      })}
      {/* yttre ring 1–12 */}
      {Array.from({ length: 12 }, (_, i) => {
        const h = i + 1;
        const [x, y] = pos(h * 30, R_OUT);
        return (
          <text key={"o" + h} x={x} y={y} className={"cf-num" + (hour % 12 === h % 12 && !inner ? " on" : "")}>
            {h}
          </text>
        );
      })}
      {/* inre ring 13–24 */}
      {Array.from({ length: 12 }, (_, i) => {
        const h = i + 13;              // 13…24, där 24 visas som 00
        const label = h === 24 ? "00" : String(h);
        const [x, y] = pos((h % 12) * 30, R_IN);
        const isOn = inner && (hour === 0 ? h === 24 : hour === h);
        return (
          <text key={"i" + h} x={x} y={y} className={"cf-num sm" + (isOn ? " on" : "")}>
            {label}
          </text>
        );
      })}
      <line x1={C} y1={C} x2={mx} y2={my} className="cf-hand-min" />
      <line x1={C} y1={C} x2={hx} y2={hy} className="cf-hand-hour" />
      <circle cx={C} cy={C} r="5" className="cf-pin" />
    </svg>
  );
}

export default function DateTimeSheet({ initialDue, initialTime, onApply, onClose }) {
  const today = todayIso();
  const start = initialDue || today;
  const [due, setDue] = useState(start);
  const [hasTime, setHasTime] = useState(!!initialTime);
  const [hour, setHour] = useState(initialTime ? +initialTime.slice(0, 2) : 9);
  const [minute, setMinute] = useState(initialTime ? +initialTime.slice(3, 5) : 0);
  const [view, setView] = useState(() => {
    const d = new Date(start + "T00:00:00");
    return { y: d.getFullYear(), m: d.getMonth() };
  });

  const days = monthGrid(view.y, view.m);
  const step = (n) => {
    const d = new Date(view.y, view.m + n, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  };
  const time = hasTime ? pad2(hour) + ":" + pad2(minute) : null;

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2>Välj datum &amp; tid</h2>
        <div className="plan-list">

          {/* ---- Kalender ---- */}
          <div className="dt-cal">
            <div className="dt-calhead">
              <button className="dt-nav" onClick={() => step(-1)} aria-label="Föregående månad">
                <span style={{ transform: "rotate(180deg)", display: "flex" }}><Chevron size={18} /></span>
              </button>
              <span className="dt-month">{MONTHS_LONG[view.m]} {view.y}</span>
              <button className="dt-nav" onClick={() => step(1)} aria-label="Nästa månad"><Chevron size={18} /></button>
            </div>
            <div className="dt-grid dt-wd">
              {WD_SHORT.map((w, i) => <span key={i}>{w}</span>)}
            </div>
            <div className="dt-grid">
              {days.map((d) => {
                const iso = isoDate(d);
                const other = d.getMonth() !== view.m;
                return (
                  <button
                    key={iso}
                    className={"dt-day" + (other ? " other" : "") + (iso === today ? " today" : "") + (iso === due ? " on" : "")}
                    onClick={() => setDue(iso)}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ---- Tid ---- */}
          <div className="dt-timehead">
            <span className="dt-tlabel"><Clock size={14} /> Tid</span>
            {hasTime && <span className="dt-readout">{pad2(hour)}:{pad2(minute)}</span>}
            <button className={"dt-toggle" + (hasTime ? " on" : "")} onClick={() => setHasTime(!hasTime)}>
              {hasTime ? "Ta bort tid" : "Lägg till tid"}
            </button>
          </div>

          {hasTime && (
            <div className="dt-time">
              <ClockFace hour={hour} minute={minute} />
              <label className="dt-slider">
                <span>Timme</span>
                <input type="range" min="0" max="23" step="1" value={hour}
                       onChange={(e) => setHour(+e.target.value)} />
                <b>{pad2(hour)}</b>
              </label>
              <label className="dt-slider">
                <span>Minut</span>
                <input type="range" min="0" max="55" step="5" value={minute}
                       onChange={(e) => setMinute(+e.target.value)} />
                <b>{pad2(minute)}</b>
              </label>
            </div>
          )}
        </div>

        <div className="sheet-foot">
          <button className="dt-clear" onClick={() => onApply(null, null)}>Rensa</button>
          <button className="skip" onClick={onClose}>Avbryt</button>
          <button className="go" onClick={() => onApply(due, time)}>Klar</button>
        </div>
      </div>
    </div>
  );
}
