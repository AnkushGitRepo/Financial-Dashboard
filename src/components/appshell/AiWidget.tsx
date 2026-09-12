'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { useEffect, useRef, useState } from 'react';
import { usePageContext } from '@/lib/dashboard/PageContext';
import styles from './AiWidget.module.css';

// Starter prompts per section. These are questions, not claims — Mitra
// answers them from the real server-built context (portfolio + news), so
// nothing here fabricates data.
const SUGGESTIONS: Record<Section, string[]> = {
  dashboard: [
    'How did my portfolio do today?',
    'What moved my holdings?',
    'Any recent news on my stocks?',
  ],
  portfolio: [
    'How is my portfolio doing?',
    "What's my largest position?",
    'Is any holding a concentration risk?',
  ],
  markets: [
    'How are the markets today?',
    'Which of my holdings are up or down?',
    "What's the latest market news?",
  ],
  stock: [
    "Summarise this company's fundamentals",
    'How has its margin trend looked?',
    "What's the shareholding pattern?",
  ],
};

export type Section = 'dashboard' | 'portfolio' | 'markets' | 'stock';

export function sectionFromPathname(pathname: string): Section {
  if (pathname.startsWith('/dashboard/portfolio')) return 'portfolio';
  if (pathname.startsWith('/dashboard/stock')) return 'stock';
  if (pathname.startsWith('/dashboard/markets')) return 'markets';
  return 'dashboard';
}

type KeyState = 'unknown' | 'present' | 'absent';

// ADR 0022: routes the client reacts to when the model calls one of the
// navigation tools. Must stay in sync with `chatTools.ts`'s `execute()`
// return values (`to`) — kept here as a static map instead of trusting the
// tool output directly, so the client's own routing intent is explicit.
const NAVIGATION_ROUTES: Record<string, string> = {
  'tool-navigate_to_dashboard': '/dashboard',
  'tool-navigate_to_portfolio': '/dashboard/portfolio',
  'tool-navigate_to_markets': '/dashboard/markets',
};

const BENTO_TILES = Array.from({ length: 9 });

/** Plain text of a message, for rendering (joins text parts). */
function textOf(message: UIMessage): string {
  return message.parts
    .filter((p): p is Extract<UIMessage['parts'][number], { type: 'text' }> => p.type === 'text')
    .map((p) => p.text)
    .join('');
}

/** Best-effort recovery of a structured `{ error, hint }` body from a
 * useChat `onError` Error — the transport throws `new Error(responseText)`
 * on a non-2xx response, and our route's error responses are JSON. */
function parseErrorBody(error: Error): { error?: string; hint?: string } | null {
  try {
    return JSON.parse(error.message);
  } catch {
    return null;
  }
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
  const router = useRouter();
  const { pageContext } = usePageContext();
  const [draft, setDraft] = useState('');
  const [keyState, setKeyState] = useState<KeyState>('unknown');
  const [errorText, setErrorText] = useState<string | null>(null);
  const handledToolCallIds = useRef(new Set<string>());

  const { messages, sendMessage, status, setMessages } = useChat({
    transport: new DefaultChatTransport({ api: '/api/ai/chat' }),
    onError: (err) => {
      const body = parseErrorBody(err);
      if (body?.error === 'no_ai_key') {
        setKeyState('absent');
        setErrorText('Add your AI provider key in Settings to chat with Mitra.');
      } else {
        setErrorText('Mitra could not answer just now. Try again shortly.');
      }
    },
  });
  const busy = status === 'submitted' || status === 'streaming';

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

  // React to navigation tool calls (ADR 0022) — `execute()` on the server
  // only confirms the destination; moving the browser is a client concern.
  useEffect(() => {
    for (const message of messages) {
      if (message.role !== 'assistant') continue;
      for (const part of message.parts) {
        if (!('toolCallId' in part)) continue;
        const route = NAVIGATION_ROUTES[part.type];
        if (!route) continue;
        if (!('state' in part) || part.state !== 'output-available') continue;
        if (handledToolCallIds.current.has(part.toolCallId)) continue;
        handledToolCallIds.current.add(part.toolCallId);
        router.push(route);
      }
      // open_stock carries a dynamic ticker in its output rather than a
      // fixed route, so it isn't in the static map — handle separately.
      for (const part of message.parts) {
        if (part.type !== 'tool-open_stock') continue;
        if (!('state' in part) || part.state !== 'output-available') continue;
        if (handledToolCallIds.current.has(part.toolCallId)) continue;
        handledToolCallIds.current.add(part.toolCallId);
        const output = part.output as { to?: string } | undefined;
        if (output?.to) router.push(output.to);
      }
    }
  }, [messages, router]);

  const send = (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setErrorText(null);
    setDraft('');
    void sendMessage({ text: clean }, { body: { pageContext } });
  };

  // Wipe the visible transcript and the server-side history (which also
  // feeds the per-user retrieval corpus). Best-effort — a failed DELETE
  // still clears the panel.
  const clearChat = async () => {
    setMessages([]);
    setDraft('');
    setErrorText(null);
    try {
      await fetch('/api/ai/chat', { method: 'DELETE' });
    } catch {
      /* the panel is already cleared */
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
          <div className={styles.headerActions}>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className={styles.clearButton}
                type="button"
                disabled={busy}
              >
                Clear
              </button>
            )}
            <button onClick={onClose} className={styles.closeButton} type="button" aria-label="Close">
              ×
            </button>
          </div>
        </div>

        {messages.length === 0 && (
          <div className={styles.starters}>
            <p className={styles.startersEyebrow}>Ask Mitra</p>
            <div className={styles.starterChips}>
              {SUGGESTIONS[section].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={styles.starterChip}
                  onClick={() => send(s)}
                  disabled={busy}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.length > 0 && (
          <div className={styles.messages}>
            {messages.map((m, i) => {
              const isStreamingAi = busy && m.role === 'assistant' && i === messages.length - 1;
              const text = textOf(m);
              return (
                <div
                  key={m.id}
                  className={`${m.role === 'user' ? styles.msgUser : styles.msgAi} ${
                    isStreamingAi ? styles.msgTyping : ''
                  }`}
                >
                  {text || (isStreamingAi ? 'Thinking' : '')}
                </div>
              );
            })}
            {errorText && !busy && <div className={styles.msgAi}>{errorText}</div>}
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
              if (e.key === 'Enter') send(draft);
            }}
            disabled={busy}
            placeholder={section === 'stock' ? 'Ask about these fundamentals' : 'Ask Mitra about your portfolio'}
            className={styles.composerInput}
          />
          <button onClick={() => send(draft)} disabled={busy} className={styles.sendButton} type="button" aria-label="Send">
            ↑
          </button>
        </div>
      </div>
    </div>
  );
}
