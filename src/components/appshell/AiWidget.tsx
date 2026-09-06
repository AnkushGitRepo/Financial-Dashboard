'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { INSIGHTS } from '@/lib/dashboard/aiWidgetContent';
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

type KeyState = 'unknown' | 'present' | 'absent';

const BENTO_TILES = Array.from({ length: 9 });

/** New array with the last message's text replaced — keeps updates immutable
 * while a streamed reply fills in token by token. */
function withLastText(msgs: ChatMessage[], from: 'ai', text: string): ChatMessage[] {
  const out = msgs.slice();
  out[out.length - 1] = { from, text };
  return out;
}

// `open` lives here so the panel stays open/closed across section
// navigation, matching the source design. Chat/insight state lives in
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
  const [busy, setBusy] = useState(false);
  const [keyState, setKeyState] = useState<KeyState>('unknown');

  const insights = INSIGHTS[section];
  const insight = insights[insightIndex % insights.length];

  // Whether an AI provider key is configured — controls the composer hint.
  useEffect(() => {
    let alive = true;
    fetch('/api/settings/ai')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (alive) setKeyState(j?.data ? 'present' : 'absent');
      })
      .catch(() => {
        if (alive) setKeyState('absent');
      });
    return () => {
      alive = false;
    };
  }, []);

  const send = async () => {
    const text = draft.trim();
    if (!text || busy) return;

    const history: ChatMessage[] = [...messages, { from: 'user', text }];
    setMessages([...history, { from: 'ai', text: '' }]);
    setDraft('');
    setBusy(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history.map((m) => ({
            role: m.from === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        const msg =
          body?.error === 'no_ai_key'
            ? 'Add your AI provider key in Settings to chat with Mitra.'
            : 'Mitra could not answer just now. Try again shortly.';
        if (body?.error === 'no_ai_key') setKeyState('absent');
        setMessages((prev) => withLastText(prev, 'ai', msg));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => withLastText(prev, 'ai', acc));
      }
      if (!acc.trim()) {
        setMessages((prev) => withLastText(prev, 'ai', 'Mitra returned an empty response.'));
      }
    } catch {
      setMessages((prev) => withLastText(prev, 'ai', 'Mitra could not answer just now. Try again shortly.'));
    } finally {
      setBusy(false);
    }
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
            {messages.map((m, i) => {
              const isStreamingAi = busy && m.from === 'ai' && i === messages.length - 1;
              return (
                <div
                  key={i}
                  className={`${m.from === 'user' ? styles.msgUser : styles.msgAi} ${
                    isStreamingAi ? styles.msgTyping : ''
                  }`}
                >
                  {m.text || (isStreamingAi ? 'Thinking' : '')}
                </div>
              );
            })}
          </div>
        )}

        {keyState === 'absent' && (
          <p className={styles.keyHint}>
            Mitra needs your AI provider key. <Link href="/dashboard/settings">Add it in Settings</Link> — it
            stays on this deployment and nothing is charged by MarketMitra.
          </p>
        )}

        <div className={styles.composer}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send();
            }}
            disabled={busy}
            placeholder={section === 'stock' ? 'Ask about these fundamentals' : 'Ask Mitra about your portfolio'}
            className={styles.composerInput}
          />
          <button onClick={send} disabled={busy} className={styles.sendButton} type="button" aria-label="Send">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
