'use client';

import styles from './PillTabs.module.css';

interface PillTabsProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
  labels?: Partial<Record<T, string>>;
}

export function PillTabs<T extends string>({ options, value, onChange, labels }: PillTabsProps<T>) {
  return (
    <div className={styles.group}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={`${styles.pill} ${option === value ? styles.pillActive : ''}`}
        >
          {labels?.[option] ?? option}
        </button>
      ))}
    </div>
  );
}
