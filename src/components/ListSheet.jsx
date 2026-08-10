import { useEffect, useRef, useState } from "react";

/* Skapa en ny lista, eller byt namn på och ta bort en befintlig. */
export default function ListSheet({ initialName = "", taskCount = 0, onSave, onDelete, onClose }) {
  const [name, setName] = useState(initialName);
  const ref = useRef(null);
  const isNew = !onDelete;

  useEffect(() => { setTimeout(() => ref.current?.focus(), 60); }, []);

  const save = () => {
    const n = name.trim();
    if (n) onSave(n);
  };

  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2>{isNew ? "Ny lista" : "Byt namn"}</h2>
        <div className="plan-list">
          <input
            ref={ref}
            className="edit-input list-name"
            enterKeyHint="done"
            placeholder="t.ex. Vindskydd"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") save(); else if (e.key === "Escape") onClose(); }}
          />
          {!isNew && (
            <button className="list-delete" onClick={onDelete}>
              Ta bort listan
              {taskCount > 0 && <span> · {taskCount} uppgifter flyttas till Inkorgen</span>}
            </button>
          )}
        </div>
        <div className="sheet-foot">
          <span className="counter" />
          <button className="skip" onClick={onClose}>Avbryt</button>
          <button className="go" disabled={!name.trim()} onClick={save}>{isNew ? "Skapa" : "Spara"}</button>
        </div>
      </div>
    </div>
  );
}
