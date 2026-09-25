export function WrapTab({ draft, catalog, family, finish, onFamily, onFinish, onSelect }) {
  const families = [...new Set(catalog.wrapColors.map((color) => color.family))];
  const finishes = catalog.wrapFinishes.filter((item) => catalog.wrapOptions.some((option) => option.finish_code === item.code));
  const options = catalog.wrapOptions.filter((option) => (!family || option.family === family) && (!finish || option.finish_code === finish));
  return <section className="wrapCatalog" aria-label="Wrap settings">
    <div className="wrapCatalogIntro"><div><span>VEHICLE WRAP</span><strong>Material catalog</strong></div><small>{options.length} options</small></div>
    <p className="fieldLabel">Color family</p>
    <div className="filterPills wrapFamilyPills"><button type="button" className={!family ? 'active' : ''} onClick={() => onFamily('')}>All colors</button>{families.map((item) => <button type="button" key={item} className={family === item ? 'active' : ''} onClick={() => onFamily(item)}>{item}</button>)}</div>
    <p className="fieldLabel spaced">Surface</p>
    <div className="filterPills wrapFinishPills"><button type="button" className={!finish ? 'active' : ''} onClick={() => onFinish('')}>All finishes</button>{finishes.map((item) => <button type="button" key={item.code} className={finish === item.code ? 'active' : ''} onClick={() => onFinish(item.code)}>{item.display_name}</button>)}</div>
    <div className="wrapResults"><span>Color & finish</span><span>{options.length} shown</span></div>
    <div className="wrapGrid">{options.map((option) => <button key={option.id} type="button" aria-pressed={draft.wrap?.optionId === option.id} className={draft.wrap?.optionId === option.id ? 'wrapCard active' : 'wrapCard'} onClick={() => onSelect(option)}>
      <span className="wrapCardMedia" style={{ backgroundColor: option.hex }}>
        {option.preview_asset
          ? <><img src={option.preview_asset} alt={`${option.brand} ${option.series} ${option.color_name} automotive wrap film`} loading="lazy" referrerPolicy="no-referrer" /><span className="wrapPhotoBadge">OFFICIAL PHOTO</span></>
          : <span className={`materialSwatch materialSwatch--${option.finish_code}`} style={{ '--wrap-color': option.hex }}><em>COLOR SAMPLE</em></span>}
      </span>
      <span className="wrapCardMeta"><strong>{option.color_name}</strong><small className="wrapProductLine">{option.brand ? `${option.brand} ${option.series}${option.product_code ? ` · ${option.product_code}` : ''}` : 'Project Drive palette'}</small><small className="wrapFinishLine">{option.finish_name}</small></span>
      <span className="wrapColorDot" style={{ background: option.hex }} aria-hidden="true" />
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
  return <section className="wheelFinishCatalog" aria-label="Wheel color settings">
    <div className="wrapCatalogIntro"><div><span>WHEEL FINISH</span><strong>Real finish preview</strong></div><small>{options.length} finishes</small></div>
    <p className="wheelFinishHint">The wheel design stays the same. Only its coating changes.</p>
    <div className="wheelFinishGrid">{options.map((option) => <button key={option.id} type="button" aria-pressed={draft.wheel?.optionId === option.id} className={draft.wheel?.optionId === option.id ? 'wheelFinishCard active' : 'wheelFinishCard'} onClick={() => onSelect(option)}>
      <span className="wheelFinishMedia"><img src={option.preview_asset} alt={`${option.display_name} wheel finish`} loading="lazy" /></span>
      <span className="wrapCardMeta"><strong>{option.display_name.split(' · ')[0]}</strong><small>{option.display_name.split(' · ')[1] || option.finish_code}</small></span>
      <span className="wrapColorDot" style={{ background: option.preview_swatch }} aria-hidden="true" />
    </button>)}</div>
  </section>;
}
