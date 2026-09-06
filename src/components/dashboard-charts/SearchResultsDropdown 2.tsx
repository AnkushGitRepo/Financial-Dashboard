'use client';

import type { SearchResultOut } from '@/lib/dashboard/fundamentalsApi';
import { CompanyLogo } from './CompanyLogo';
import styles from './SearchResultsDropdown.module.css';

interface SearchResultsDropdownProps {
  results: SearchResultOut[];
  loading: boolean;
  onSelect: (result: SearchResultOut) => void;
}

export function SearchResultsDropdown({ results, loading, onSelect }: SearchResultsDropdownProps) {
  if (results.length === 0 && !loading) return null;

  return (
    <div className={styles.dropdown}>
      {results.length === 0 && loading && <div className={styles.empty}>Searching…</div>}
      {results.map((result) => (
        <button
          key={`${result.type}-${result.symbol}`}
          type="button"
          className={styles.row}
          // Prevents the input from blurring (and this dropdown from
          // closing) before the click actually registers.
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onSelect(result)}
        >
          <span className={styles.iconWrap}>
            {result.type === 'company' ? (
              <CompanyLogo symbol={result.symbol} size={18} />
            ) : (
              <span className={styles.indexBadge}>IDX</span>
            )}
          </span>
          <span className={styles.text}>
            <span className={styles.name}>{result.name}</span>
            <span className={styles.symbol}>{result.type === 'company' ? result.symbol : 'Index'}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
