'use client';

import { useState } from 'react';
import { AI_REPLIES, INSIGHTS } from '@/lib/dashboard/aiWidgetContent';
import styles from './AiWidget.module.css';

export type Section = 'dashboard' | 'portfolio' | 'markets' | 'stock';

export function sectionFromPathname(pathname: string): Section {
  if (pathname.startsWith('/dashboard/portfolio')) return 'portfolio';
  if (pathname.startsWith('/dashboard/stock')) return 'stock';
  if (pathname.startsWith('/dashboard/markets')) return 'markets';
  return 'dashboard';
}

interface ChatMessage {
  from: 'user' | 'ai';
  text: string;
}

const BENTO_TILES = Array.from({ length: 9 });

// `open` lives here so the panel stays open/closed across section
// navigation, matching the source design. Insight/message state lives in
// AiPanelBody below, keyed by `section` from the parent (AppShell.tsx) so
// switching sections resets it by remounting — not via setState-in-effect.
export function AiWidget({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);

  return (
    <div className={styles.wrap}>
      {open && <AiPanelBody key={section} section={section} onClose={() => setOpen(false)} />}

      <button onClick={() => setOpen((o) => !o)} className={styles.launcher} type="button" aria-label="Toggle Mitra assistant">
        <span className={styles.launcherBar} />
        <span className={styles.launcherBar} />
      </button>
    </div>
  );
}

function AiPanelBody({ section, onClose }: { section: Section; onClose: () => void }) {
  const [insightIndex, setInsightIndex] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');

  const insights = INSIGHTS[section];
  const insight = insights[insightIndex % insights.length];

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const reply = AI_REPLIES[messages.length % AI_REPLIES.length];
    setDraft('');
    setMessages((prev) => [...prev, { from: 'user', text }]);
    setTimeout(() => {
      setMessages((prev) => [...prev, { from: 'ai', text: reply }]);
    }, 520);
  };

  return (
    <div className={styles.panel}>
      <div className={styles.panelBg} />
      <div className={styles.bentoGrid} aria-hidden="true">
        {BENTO_TILES.map((_, i) => (
          <div key={i} className={styles.bentoTile} />
        ))}
      </div>

      <div className={styles.panelContent}>
        <div className={styles.panelHeader}>
          <div className={styles.mitraBrand}>
            <span className={styles.mitraDot} />
            <span className={styles.mitraName}>Mitra</span>
          </div>
          <button onClick={onClose} className={styles.closeButton} type="button" aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.insightCard}>
          <p className={styles.insightEyebrow}>Proactive insight</p>
          <p className={styles.insightTitle}>{insight.title}</p>
          <p className={styles.insightBody}>{insight.body}</p>
          <div className={styles.insightFooter}>
            <span className={styles.insightLink}>View details ›</span>
            <button onClick={() => setInsightIndex((i) => i + 1)} className={styles.nextButton} type="button">
              Next {(insightIndex % insights.length) + 1}/{insights.length}
            </button>
          </div>
        </div>

        {messages.length > 0 && (
          <div className={styles.messages}>
            {messages.map((m, i) => (
              <div key={i} className={m.from === 'user' ? styles.msgUser : styles.msgAi}>
                {m.text}
              </div>
            ))}
          </div>
        )}

        <div className={styles.composer}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            placeholder={section === 'stock' ? 'Ask about these fundamentals' : 'Ask Mitra about your portfolio'}
            className={styles.composerInput}
          />
          <button onClick={send} className={styles.sendButton} type="button" aria-label="Send">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
