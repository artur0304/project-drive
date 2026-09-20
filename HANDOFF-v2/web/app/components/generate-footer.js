import { InfoIcon } from './configurator-icons';

export default function GenerateFooter({ operations, total, pricingReady, isGenerating, error, onGenerate }) {
  return <footer className="configFoot">
    <p className="generateHint"><InfoIcon />You&apos;ll see it on your car after you press Generate</p>
    {error && <p className="generateError" role="alert">{error}</p>}
    <div className="operationList">{operations.length ? operations.map((operation) => <div key={operation.key}><span>{operation.label}</span><strong>{operation.cost} cr</strong></div>) : <span className="noChanges">No changes selected</span>}</div>
    <div className="generateRow"><div className="total">Total <strong>{pricingReady ? total : '—'}</strong> credits</div><button className="generateButton" type="button" disabled={!operations.length || !pricingReady || isGenerating} onClick={onGenerate}>{isGenerating ? 'Generating…' : pricingReady ? 'Generate' : 'Loading price…'}</button></div>
  </footer>;
}
