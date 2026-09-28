export function Stat({ label, value, note, icon: Icon, tone, className = "" }) {
  return (
    <section className={`stat-card ${className}`}>
      <div className={`stat-icon ${tone}`}>
        <Icon size={19} />
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <b className="stat-value">{value}</b>
        {note && <small className="stat-note" title={typeof note === "string" ? note : undefined}>{note}</small>}
      </div>
    </section>
  );
}

export function Field({label,value}){return <label className="field"><span>{label}</span><input defaultValue={value}/></label>}
