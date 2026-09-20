import styles from './product-nav.module.css';

const LINKS = [
  ['garage', '/garage', 'Garage'],
  ['credits', '/credits', 'Credits'],
  ['account', '/account', 'Account'],
];

// Единая навигация рабочих экранов. Баланс передаётся уже загруженной страницей,
// поэтому компонент не создаёт повторных запросов к API.
export default function ProductNav({ active, balance, maxWidth = '1120px' }) {
  return (
    <header className={styles.header} style={{ maxWidth }}>
      <a href="/" className={styles.brand} aria-label="Project Drive home">
        <span className={styles.mark}>PD</span>
        <span className={styles.brandText}>Project Drive</span>
      </a>
      <nav className={styles.links} aria-label="Main navigation">
        {LINKS.map(([key, href, label]) => (
          <a key={key} href={href} className={active === key ? styles.active : undefined} aria-current={active === key ? 'page' : undefined}>{label}</a>
        ))}
        {balance != null && (
          <a className={styles.balance} href="/credits" title="Local demonstration balance">
            <strong>{balance}</strong><span className={styles.balanceLabel}> demo credits</span>
          </a>
        )}
      </nav>
    </header>
  );
}

