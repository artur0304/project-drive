import { WheelIcon } from './configurator-icons';

export const COLORS = [
  ['Jet Black', '#161616'], ['Alpine White', '#D9D2C4'], ['Racing Green', '#3E5B44'],
  ['Ember Red', '#9C2B2B'], ['Deep Navy', '#232C3D'], ['Stealth Grey', '#54565C'],
  ['Bronze', '#8A5A2E'], ['Champagne', '#C7B389'], ['Slate Blue', '#3A4B5C'],
  ['Graphite', '#3A3C40'], ['Copper', '#A9662F'], ['Titanium', '#7A7D82'],
];
export const FINISHES = ['Gloss', 'Satin', 'Matte', 'Metallic', 'Pearl'];
export const TINTS = [
  ['No tint', 'Clear glass', '#2A333C', null], ['Light', '~50% light', '#222A31', '50'],
  ['Medium', '~35% light', '#1B2228', '35'], ['Limo', '~20% light', '#141A1F', '20'],
  ['Black-out', '~5% light', '#0C1013', '5'],
];
export const WHEELS = [
  ['BMW 437M', 'R20 · Ferric', '#9A9C9F'], ['Vossen HF-3', 'R21 · Black', '#161616'],
  ['BBS CH-R', 'R19 · Titanium', '#8B8D92'], ['Rotiform TMB', 'R19 · Bronze', '#8A5A2E'],
];
export const WHEEL_COLORS = [
  ['Silver', '#9A9C9F'], ['Black', '#161616'], ['Bronze', '#8A5A2E'],
  ['Gunmetal', '#42454A'], ['Gold', '#C7A24E'], ['White', '#D9D2C4'],
];

export function WrapTab({ draft, onColor, onFinish }) {
  return <section aria-label="Wrap settings">
    <p className="fieldLabel">Color</p>
    <div className="swatchGrid">{COLORS.map(([name, hex]) => <button key={name} type="button" className={draft.wrap?.color === name ? 'swatch active' : 'swatch'} style={{ background: hex }} title={name} aria-label={name} onClick={() => onColor(name, hex)} />)}</div>
    <p className="fieldLabel spaced">Finish</p>
    <div className="finishGrid">{FINISHES.map((finish) => <button key={finish} type="button" className={draft.wrap?.finish === finish ? 'active' : ''} onClick={() => onFinish(finish)}>{finish}</button>)}</div>
  </section>;
}
export function TintTab({ draft, onSelect }) {
  return <section aria-label="Tint settings"><p className="fieldLabel">Window tint</p>
    {TINTS.map(([name, detail, color, level]) => {
      const selected = level ? draft.tint?.level === level : !draft.tint;
      return <button key={name} type="button" className={selected ? 'tintOption active' : 'tintOption'} onClick={() => onSelect(name, level)}><span className="tintChip" style={{ background: color }} /><span><strong>{name}</strong><small>{detail}</small></span></button>;
    })}
  </section>;
}

export function WheelsTab({ draft, onSelect }) {
  return <section aria-label="Wheel replacement settings"><p className="fieldLabel">Popular wheels</p>
    <div className="wheelGrid">{WHEELS.map(([name, detail, color]) => <button key={name} type="button" className={draft.wheel?.kind === 'wheel_replace' && draft.wheel.name === name ? 'wheelCard active' : 'wheelCard'} onClick={() => onSelect(name, detail, color)}><WheelIcon color={color} /><strong>{name}</strong><small>{detail}</small></button>)}</div>
  </section>;
}

export function WheelColorTab({ draft, onSelect }) {
  return <section aria-label="Wheel color settings"><p className="fieldLabel">Recolor current wheels</p>
    <div className="swatchGrid">{WHEEL_COLORS.map(([name, color]) => <button key={name} type="button" className={draft.wheel?.kind === 'wheel_recolor' && draft.wheel.name === name ? 'swatch active' : 'swatch'} style={{ background: color }} title={name} aria-label={name} onClick={() => onSelect(name, color)} />)}</div>
  </section>;
}
