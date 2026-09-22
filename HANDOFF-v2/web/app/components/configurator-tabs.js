export function WrapTab({ draft, catalog, family, onFamily, onSelect }) {
  const families = [...new Set(catalog.wrapColors.map((color) => color.family))];
  const options = catalog.wrapOptions.filter((option) => !family || option.family === family);
  return <section aria-label="Wrap settings">
    <p className="fieldLabel">Color family</p>
    <div className="filterPills"><button type="button" className={!family ? 'active' : ''} onClick={() => onFamily('')}>All</button>{families.map((item) => <button type="button" key={item} className={family === item ? 'active' : ''} onClick={() => onFamily(item)}>{item}</button>)}</div>
    <p className="fieldLabel spaced">Color & finish</p>
    <div className="catalogSwatches">{options.map((option) => <button key={option.id} type="button" className={draft.wrap?.optionId === option.id ? 'catalogSwatch active' : 'catalogSwatch'} onClick={() => onSelect(option)}>
      <span style={{ background: option.hex }} /><strong>{option.color_name}</strong><small>{option.finish_name}</small>
    </button>)}</div>
  </section>;
}

export function TintTab({ draft, catalog, onZone, onLevel }) {
  return <section aria-label="Tint settings">
    <p className="fieldLabel">Windows</p>
    <div className="zoneGrid">{catalog.tintZones.map((zone) => <button key={zone.id} type="button" className={draft.tint?.zoneId === zone.id ? 'active' : ''} onClick={() => onZone(zone)}>{zone.display_name}</button>)}</div>
    <p className="fieldLabel spaced">Light transmission</p>
    {catalog.tintLevels.map((level) => <button key={level.id} type="button" className={draft.tint?.levelId === level.id ? 'tintOption active' : 'tintOption'} onClick={() => onLevel(level)}>
      <span className="tintChip" style={{ background: level.preview_swatch }} /><span><strong>{level.display_name}</strong><small>VLT {level.vlt_percent}%</small></span>
    </button>)}
    <p className="legalHint">Tint laws differ by country. This is a visual preview; check your local rules before installation.</p>
  </section>;
}

export function WheelColorTab({ draft, options, onSelect }) {
  return <section aria-label="Wheel color settings"><p className="fieldLabel">Recolor current wheels</p>
    <div className="catalogSwatches">{options.map((option) => <button key={option.id} type="button" className={draft.wheel?.optionId === option.id ? 'catalogSwatch active' : 'catalogSwatch'} onClick={() => onSelect(option)}>
      <span style={{ background: option.preview_swatch }} /><strong>{option.display_name.split(' · ')[0]}</strong><small>{option.display_name.split(' · ')[1] || option.finish_code}</small>
    </button>)}</div>
  </section>;
}
