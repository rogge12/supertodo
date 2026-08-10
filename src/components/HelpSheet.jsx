import { Bulb } from "./Icons.jsx";

/* Hjälpruta: visar hur man skriver datum, tid, prioritet och upprepning.
   Varje exempel går att trycka på — då fylls det i inmatningsrutan. */

const SECTIONS = [
  {
    title: "Datum",
    items: [
      ["idag", "dagens datum"],
      ["imorgon", "nästa dag"],
      ["i övermorgon", "om två dagar"],
      ["fredag", "nästa fredag (även: fre)"],
      ["nästa vecka", "kommande måndag"],
      ["12/8", "12 augusti"],
      ["12 aug", "samma sak, med månadsnamn"],
      ["2026-08-12", "exakt datum"],
    ],
  },
  {
    title: "Tid",
    items: [
      ["kl 16", "klockan 16:00"],
      ["16:00", "eller med kolon"],
      ["16.30", "punkt funkar också"],
      ["imorgon 16", "siffran sist blir klockslag"],
    ],
  },
  {
    title: "Prioritet",
    items: [
      ["!", "prioriterad (gul ring)"],
      ["!! eller !viktigt", "viktig (röd ring, hamnar överst)"],
    ],
  },
  {
    title: "Listor",
    items: [
      ["#vindskydd", "lägger uppgiften i listan Vindskydd"],
      ["#nytt-namn", "skapar listan om den inte finns"],
    ],
  },
  {
    title: "Upprepning",
    items: [
      ["varje dag", "varje dag (även: varannan dag)"],
      ["varje fredag", "veckovis på fredagar"],
      ["varannan fredag", "varannan vecka"],
      ["varje månad", "samma datum varje månad"],
    ],
  },
];

const EXAMPLES = [
  "ring Anna imorgon kl 10",
  "möte Vargstigen 12/8 kl 16 !viktigt",
  "vattna blommorna varje söndag",
  "betala hyran 25/8 varje månad",
  "köp virke #vindskydd imorgon kl 8",
];

export default function HelpSheet({ onPick, onClose }) {
  return (
    <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sheet">
        <h2><Bulb size={19} /> Så skriver du</h2>
        <div className="sub">
          Skriv allt på en rad — appen plockar ut datum, tid och prioritet, resten blir titeln.
          Tryck på ett exempel för att prova det.
        </div>
        <div className="plan-list">
          {EXAMPLES.map((ex) => (
            <button key={ex} className="help-example" onClick={() => onPick(ex)}>
              {ex}
            </button>
          ))}
          {SECTIONS.map((sec) => (
            <div key={sec.title}>
              <div className="group-label">{sec.title}</div>
              <table className="help-table">
                <tbody>
                  {sec.items.map(([syntax, desc]) => (
                    <tr key={syntax}>
                      <td><code>{syntax}</code></td>
                      <td>{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          <div className="set-note">
            Skriver du bara ett klockslag som redan passerat idag hamnar uppgiften imorgon.
            Vill du styra dagen själv — skriv ut datumet också.
          </div>
        </div>
        <div className="sheet-foot">
          <span className="counter" />
          <button className="go" onClick={onClose}>Klar</button>
        </div>
      </div>
    </div>
  );
}
