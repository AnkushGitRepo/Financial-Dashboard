'use client';

import { useState } from 'react';
import type { SearchResultOut } from '@/lib/dashboard/fundamentalsApi';
import { useSymbolSearch } from '@/lib/dashboard/useSymbolSearch';
import { SearchResultsDropdown } from '@/components/dashboard-charts/SearchResultsDropdown';
import type { ConfirmedChange, ProposedChange } from '@/lib/portfolio-import/types';
import styles from './ImportPreviewCard.module.css';

// The mandatory preview-and-confirm step for Mitra file-based portfolio
// import (ADR 0022, part D). Nothing has been written yet when this
// renders — `changes` came straight back from POST
// /api/portfolio-import/extract. The only way anything reaches the
// portfolio is the explicit "Add N holdings" click below, which POSTs to
// /api/portfolio-import/confirm. Closing the chat before that click is
// safe by construction: this component (and the diff it holds) simply
// unmounts, nothing was ever persisted server-side.

interface RowState {
  included: boolean;
  resolvedSymbol: string | null;
  resolvedName: string | null;
  searching: boolean;
}

function initialRowState(change: ProposedChange): RowState {
  return {
    included: change.matchStatus === 'matched',
    resolvedSymbol: change.matchedSymbol,
    resolvedName: change.matchedName,
    searching: false,
  };
}

export function ImportPreviewCard({ changes, onDone }: { changes: ProposedChange[]; onDone: () => void }) {
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(changes.map((c) => [c.tempId, initialRowState(c)]))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState<number | null>(null);

  const toggleIncluded = (tempId: string) =>
    setRows((r) => ({ ...r, [tempId]: { ...r[tempId], included: !r[tempId].included } }));

  const resolveRow = (tempId: string, picked: SearchResultOut) =>
    setRows((r) => ({
      ...r,
      [tempId]: {
        ...r[tempId],
        resolvedSymbol: picked.symbol,
        resolvedName: picked.name,
        included: true,
        searching: false,
      },
    }));

  const toggleSearch = (tempId: string) =>
    setRows((r) => ({ ...r, [tempId]: { ...r[tempId], searching: !r[tempId].searching } }));

  const includedChanges = changes.filter((c) => rows[c.tempId]?.included && rows[c.tempId]?.resolvedSymbol);

  const confirm = async () => {
    if (includedChanges.length === 0) return;
    const approved: ConfirmedChange[] = includedChanges.map((c) => ({
      matchedSymbol: rows[c.tempId].resolvedSymbol as string,
      action: c.action,
      existingHoldingId: c.existingHoldingId,
      after: c.after,
    }));

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/portfolio-import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ changes: approved }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        setError(body?.message ?? 'Could not add those holdings. Try again.');
        return;
      }
      setAddedCount(body?.data?.succeeded ?? approved.length);
    } catch {
      setError('Could not add those holdings. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (addedCount !== null) {
    return (
      <div className={styles.card}>
        <p className={styles.doneText}>
          Added {addedCount} holding{addedCount === 1 ? '' : 's'} to your portfolio.
        </p>
        <button type="button" className={styles.btnPrimary} onClick={onDone}>
          Done
        </button>
      </div>
    );
  }

  return (
    <div className={styles.card}>
      <p className={styles.title}>
        Found {changes.length} holding{changes.length === 1 ? '' : 's'} — review before adding
      </p>

      <div className={styles.rows}>
        {changes.map((change) => {
          const row = rows[change.tempId];
          const label = row.resolvedName ?? change.extracted.rawName ?? change.extracted.rawSymbol ?? 'Unknown';
          return (
            <div key={change.tempId} className={styles.row}>
              <label className={styles.rowMain}>
                <input
                  type="checkbox"
                  checked={row.included}
                  disabled={!row.resolvedSymbol}
                  onChange={() => toggleIncluded(change.tempId)}
                />
                <span className={styles.rowText}>
                  <span className={styles.rowName}>{label}</span>
                  <span className={styles.rowNums}>
                    {change.action === 'update' && change.before
                      ? `${change.before.quantity} @ ₹${change.before.avgPrice} → ${change.after.quantity} @ ₹${change.after.avgPrice}`
                      : `${change.after.quantity} @ ₹${change.after.avgPrice}`}
                  </span>
                </span>
                <span className={change.action === 'update' ? styles.tagUpdate : styles.tagNew}>
                  {change.action === 'update' ? 'Update' : 'New'}
                </span>
              </label>

              {!row.resolvedSymbol && (
                <div className={styles.resolve}>
                  {change.candidates.length > 0 && !row.searching && (
                    <div className={styles.candidatePills}>
                      {change.candidates.map((candidate) => (
                        <button
                          key={candidate.symbol}
                          type="button"
                          className={styles.candidatePill}
                          onClick={() => resolveRow(change.tempId, candidate)}
                          title={candidate.name}
                        >
                          {candidate.symbol}
                        </button>
                      ))}
                      <button
                        type="button"
                        className={styles.searchToggle}
                        onClick={() => toggleSearch(change.tempId)}
                      >
                        Search…
                      </button>
                    </div>
                  )}
                  {(change.candidates.length === 0 || row.searching) && (
                    <RowSearch onResolve={(picked) => resolveRow(change.tempId, picked)} />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.actions}>
        <button type="button" className={styles.btnSecondary} onClick={onDone} disabled={submitting}>
          Cancel
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          onClick={confirm}
          disabled={submitting || includedChanges.length === 0}
        >
          {submitting ? 'Adding…' : `Add ${includedChanges.length} holding${includedChanges.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}

function RowSearch({ onResolve }: { onResolve: (result: SearchResultOut) => void }) {
  const { query, setQuery, results, loading } = useSymbolSearch();
  const companyResults = results.filter((r) => r.type === 'company');
  return (
    <div className={styles.searchWrap}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for the right stock…"
        className={styles.searchInput}
      />
      {query.trim().length > 0 && (
        <SearchResultsDropdown results={companyResults} loading={loading} onSelect={onResolve} />
      )}
    </div>
  );
}
