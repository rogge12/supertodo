import { useRef, useState } from "react";
import { addStep, renameStep, removeStep, toggleStep } from "../lib/steps.js";
import { Plus, Trash } from "./Icons.jsx";

/* Delstegen i redigeringsläget.

   Enter sparar och öppnar nästa tomma fält, så man kan mata in en hel
   rad delsteg utan att lyfta händerna. Enter på tomt fält stänger.

   Alla tangenttryck stoppas här: annars bubblar Enter upp till
   uppgiftens eget fält, som sparar och stänger hela redigeringen. */
export default function StepEditor({ steps, onChange, pendingRef }) {
  const [draft, setDraftState] = useState(null); // null = inmatningen är stängd
  const draftRef = useRef(null);
  // Ett påbörjat delsteg som ännu inte bekräftats speglas uppåt, så att
  // Spara får med det utan att behöva lita på att blur hinner före klicket
  const setDraft = (v) => { if (pendingRef) pendingRef.current = v; setDraftState(v); };

  const commitDraft = (keepOpen) => {
    const t = (draft || "").trim();
    if (t) onChange(addStep(steps, t));
    if (keepOpen && t) {
      setDraft("");
      setTimeout(() => draftRef.current?.focus(), 0);
    } else {
      setDraft(null);
    }
  };

  const openDraft = () => {
    setDraft("");
    setTimeout(() => draftRef.current?.focus(), 0);
  };

  return (
    <div className="steps-edit" onClick={(e) => e.stopPropagation()}>
      <div className="steps-label">Delsteg</div>
      {steps.map((s) => (
        <div key={s.id} className="step-row">
          <button
            type="button"
            className={"step-check" + (s.done ? " on" : "")}
            aria-label={s.done ? "Markera som ej klar" : "Klar"}
            onClick={() => onChange(toggleStep(steps, s.id))}
          />
          <input
            className={"step-input" + (s.done ? " done" : "")}
            value={s.title}
            onChange={(e) => onChange(renameStep(steps, s.id, e.target.value))}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); openDraft(); }
            }}
          />
          <button type="button" className="step-del" aria-label="Ta bort delsteg"
                  onClick={() => onChange(removeStep(steps, s.id))}><Trash /></button>
        </div>
      ))}

      {draft === null ? (
        <button type="button" className="step-add" onClick={openDraft}>
          <Plus size={15} /> Lägg till delsteg
        </button>
      ) : (
        <div className="step-row">
          <span className="step-check ghost" />
          <input
            ref={draftRef}
            className="step-input"
            placeholder="Vad är nästa steg?"
            enterKeyHint="next"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onFocus={() => { if (pendingRef) pendingRef.current = draft; }}
            onBlur={() => commitDraft(false)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") { e.preventDefault(); commitDraft(true); }
              else if (e.key === "Escape") { e.preventDefault(); setDraft(null); }
            }}
          />
        </div>
      )}
    </div>
  );
}
