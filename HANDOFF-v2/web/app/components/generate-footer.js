import { InfoIcon } from './configurator-icons';

// Новая модель цен: показываем ОДНУ цену за всю генерацию, без построчных цен.
// total — число AI-проходов. Машина, reference-диск и остальные изменения
// отправляются вместе и стоят один кредит.
export default function GenerateFooter({ operations, total, pricingReady, isGenerating, error, onGenerate }) {
  const creditWord = total === 1 ? 'credit' : 'credits';
  return <footer className="configFoot">
    <p className="generateHint"><InfoIcon />You&apos;ll see it on your car after you press Generate</p>
    {error && <p className="generateError" role="alert">{error}</p>}
    <div className="operationList">
      {operations.length
        ? operations.map((operation) => <div key={operation.key}><span>{operation.label}</span></div>)
        : <span className="noChanges">No changes selected</span>}
    </div>
    <div className="generateRow">
      <div className="total">Generation <strong>{pricingReady ? total : '—'}</strong> {pricingReady ? creditWord : 'credits'}</div>
      <button className="generateButton" type="button" disabled={!operations.length || !pricingReady || isGenerating} onClick={onGenerate}>{isGenerating ? 'Generating…' : pricingReady ? 'Generate' : 'Loading price…'}</button>
    </div>
    <p className="generateSubnote generateSubnoteMuted">Wrap, tint and one wheel reference — one generation.</p>
  </footer>;
}
