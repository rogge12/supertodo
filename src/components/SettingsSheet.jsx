import { Gear } from "./Icons.jsx";
import { useRef, useState } from "react";
import { todayIso } from "../lib/format.js";

function notifStatus() {
  if (typeof Notification === "undefined") return "unsupported";
  return Notification.permission; // "default" | "granted" | "denied"
}

export default function SettingsSheet({ tasks, meta, onImport, onClose, onToast }) {
  const fileRef = useRef(null);
  const [status, setStatus] = useState(notifStatus());

  const exportData = () => {
    const blob = new Blob(
      [JSON.stringify({ app: "supertodo", version: 4, exportedAt: new Date().toISOString(), tasks, meta }, null, 2)],
      { type: "application/json" }
    );
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "supertodo-backup-" + todayIso() + ".json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const importFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const list = Array.isArray(data) ? data : data.tasks;
        if (!Array.isArray(list)) throw new Error("fel format");
        onImport(list);
      } catch {
        onToast("Kunde inte läsa filen — är det en Super-todo-backup?");
      }
      e.target.value = "";
    };
    reader.readAsText(f);
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2><Gear size={19} /> Inställningar</h2>
        <div className="sub" />
        <div className="set-row">
          <div className="lbl">
            <b>Påminnelser</b>
            <span>Notis när en uppgift med tid är på väg att missas. Fungerar när appen är öppen eller installerad.</span>
          </div>
          {status === "granted" && <span className="status-ok">På ✓</span>}
          {status === "denied" && <span className="set-note">Blockerade — ändra i webbläsarens inställningar.</span>}
          {status === "unsupported" && <span className="set-note">Stöds ej här.</span>}
          {status === "default" && (
            <button className="primary" onClick={async () => { await Notification.requestPermission(); setStatus(notifStatus()); }}>
              Aktivera
            </button>
          )}
        </div>
        <div className="set-row">
          <div className="lbl">
            <b>Exportera</b>
            <span>Ladda ner alla uppgifter som en backupfil.</span>
          </div>
          <button id="export-btn" onClick={exportData}>Ladda ner</button>
        </div>
        <div className="set-row">
          <div className="lbl">
            <b>Importera</b>
            <span>Läs in en backupfil — uppgifter läggs till, inget skrivs över.</span>
          </div>
          <button onClick={() => fileRef.current?.click()}>Välj fil</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importFile} />
        </div>
        <div className="set-note">
          Dina uppgifter sparas lokalt i den här webbläsaren. Exportera då och då som säkerhetskopia, eller för att flytta till en annan enhet.
        </div>
        <div className="sheet-foot">
          <span className="counter" />
          <button className="go" onClick={onClose}>Klar</button>
        </div>
      </div>
    </div>
  );
}
