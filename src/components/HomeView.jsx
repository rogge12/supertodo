import { Sun, Inbox, CalendarBig, ListIcon, Plus, Chevron } from "./Icons.jsx";

function NavRow({ icon, label, count, onClick, tone }) {
  return (
    <li className="task">
      <button className={"nav-row" + (tone ? " " + tone : "")} onClick={onClick}>
        <span className="nav-icon">{icon}</span>
        <span className="nav-label">{label}</span>
        {count > 0 && <span className="nav-count">{count}</span>}
        <span className="nav-chev"><Chevron size={16} /></span>
      </button>
    </li>
  );
}

export default function HomeView({ counts, lists, listCounts, onOpen, onNewList }) {
  return (
    <>
      <ul className="tasks">
        <NavRow icon={<Sun size={19} />} label="Idag" count={counts.today} tone="today" onClick={() => onOpen({ kind: "today" })} />
        <NavRow icon={<Inbox size={19} />} label="Inkorg" count={counts.inbox} onClick={() => onOpen({ kind: "inbox" })} />
        <NavRow icon={<CalendarBig size={19} />} label="Kommande" count={counts.upcoming} onClick={() => onOpen({ kind: "upcoming" })} />
      </ul>

      <div className="group-label">Mina listor</div>
      <ul className="tasks">
        {lists.map((l) => (
          <NavRow
            key={l.id}
            icon={<ListIcon size={18} />}
            label={l.name}
            count={listCounts[l.id] || 0}
            onClick={() => onOpen({ kind: "list", id: l.id })}
          />
        ))}
        <li className="task">
          <button className="nav-row new" onClick={onNewList}>
            <span className="nav-icon"><Plus size={18} /></span>
            <span className="nav-label">Ny lista</span>
          </button>
        </li>
      </ul>

      {lists.length === 0 && (
        <div className="set-note" style={{ textAlign: "center" }}>
          Listor samlar allt som hör ihop — ett bygge, ett jobb, en resa.
          Du kan också skriva <code>#namn</code> direkt i en uppgift.
        </div>
      )}
    </>
  );
}
