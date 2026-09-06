'use client';

import { useEffect, useMemo, useState } from 'react';
import styles from './page.module.css';

// --- a deliberately small slice of OpenAPI, enough to drive the form ---

interface Param {
  name: string;
  in: 'query' | 'path';
  required?: boolean;
  description?: string;
  schema?: { type?: string; enum?: string[]; default?: unknown };
  example?: unknown;
}

interface Operation {
  summary?: string;
  description?: string;
  tags?: string[];
  security?: Array<Record<string, string[]>>;
  parameters?: Param[];
  requestBody?: {
    required?: boolean;
    content?: Record<string, { schema?: unknown; example?: unknown }>;
  };
  responses?: Record<string, { description?: string }>;
}

export interface OpenApiSpec {
  info: { title: string; version: string; description?: string };
  servers?: Array<{ url: string; description?: string }>;
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, Record<string, Operation>>;
}

interface McpInfo {
  serverInfo: { name: string; version: string };
  tools: Array<{ name: string; description: string }>;
}

type Method = 'get' | 'post' | 'put' | 'patch' | 'delete';
const METHOD_ORDER: Method[] = ['get', 'post', 'put', 'patch', 'delete'];

interface Endpoint {
  path: string;
  method: Method;
  op: Operation;
  id: string;
}

function isPublic(op: Operation): boolean {
  return Array.isArray(op.security) && op.security.length === 0;
}

function jsonExample(op: Operation): string {
  const body = op.requestBody?.content?.['application/json'];
  if (!body) return '';
  const ex = body.example ?? {};
  return JSON.stringify(ex, null, 2);
}

function fmt(value: unknown): string {
  if (typeof value !== 'string') return JSON.stringify(value, null, 2);
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

interface RunResult {
  status: number;
  statusText: string;
  ms: number;
  body: string;
  rateLimit?: string;
  ok: boolean;
}

export function ApiExplorerClient({ spec, mcp }: { spec: OpenApiSpec; mcp: McpInfo }) {
  const endpoints = useMemo<Endpoint[]>(() => {
    const list: Endpoint[] = [];
    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const method of METHOD_ORDER) {
        const op = ops[method];
        if (op) list.push({ path, method, op, id: `${method.toUpperCase()} ${path}` });
      }
    }
    return list;
  }, [spec]);

  const groups = useMemo(() => {
    const byTag = new Map<string, Endpoint[]>();
    for (const ep of endpoints) {
      const tag = ep.op.tags?.[0] ?? 'Other';
      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag)!.push(ep);
    }
    return [...byTag.entries()];
  }, [endpoints]);

  const [selectedId, setSelectedId] = useState(endpoints[0]?.id ?? '');
  const selected = endpoints.find((e) => e.id === selectedId) ?? endpoints[0];

  return (
    <div className={styles.explorer}>
      <McpCard mcp={mcp} />

      <div className={styles.cols}>
        <nav className={styles.sidebar} aria-label="Endpoints">
          {groups.map(([tag, eps]) => (
            <div key={tag} className={styles.navGroup}>
              <p className={styles.navGroupTitle}>{tag}</p>
              {eps.map((ep) => (
                <button
                  key={ep.id}
                  type="button"
                  className={`${styles.navRow} ${ep.id === selectedId ? styles.navRowActive : ''}`}
                  onClick={() => setSelectedId(ep.id)}
                >
                  <span className={`${styles.method} ${styles[`m_${ep.method}`]}`}>
                    {ep.method.toUpperCase()}
                  </span>
                  <span className={styles.navPath}>{ep.path.replace('/api', '')}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>

        {selected && <EndpointPanel key={selected.id} endpoint={selected} />}
      </div>
    </div>
  );
}

function McpCard({ mcp }: { mcp: McpInfo }) {
  // Start relative so SSR and first client render match; upgrade to an
  // absolute URL after mount.
  const [url, setUrl] = useState('/api/mcp');
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- deliberate: relative for SSR match, absolute after mount
    setUrl(`${window.location.origin}/api/mcp`);
  }, []);
  const config = JSON.stringify({ marketmitra: { url } }, null, 2);
  return (
    <section className={styles.mcpCard}>
      <h2 className={styles.mcpTitle}>MCP server</h2>
      <p className={styles.mcpText}>
        Streamable HTTP. Point any MCP client at <code className={styles.code}>{url}</code>. All
        tools are read-only public data &mdash; no auth, fair-use rate limited.
      </p>
      <pre className={styles.pre}>
        <code>{config}</code>
      </pre>
      <ul className={styles.toolList}>
        {mcp.tools.map((t) => {
          const brief =
            t.description.length > 96 ? `${t.description.slice(0, 96).trimEnd()}…` : t.description;
          return (
            <li key={t.name}>
              <code className={styles.code}>{t.name}</code>
              <span className={styles.toolDesc}>{brief}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function EndpointPanel({ endpoint }: { endpoint: Endpoint }) {
  const { path, method, op } = endpoint;
  const pathParams = (op.parameters ?? []).filter((p) => p.in === 'path');
  const queryParams = (op.parameters ?? []).filter((p) => p.in === 'query');
  const hasBody = Boolean(op.requestBody);

  const [pathVals, setPathVals] = useState<Record<string, string>>({});
  const [queryVals, setQueryVals] = useState<Record<string, string>>({});
  const [body, setBody] = useState<string>(jsonExample(op));
  const [result, setResult] = useState<RunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUrl = (): string => {
    let p = path;
    for (const pp of pathParams) {
      p = p.replace(`{${pp.name}}`, encodeURIComponent(pathVals[pp.name] ?? ''));
    }
    const qs = new URLSearchParams();
    for (const qp of queryParams) {
      const v = queryVals[qp.name];
      if (v) qs.set(qp.name, v);
    }
    const q = qs.toString();
    return q ? `${p}?${q}` : p;
  };

  // The MCP endpoint (2026-07-28 spec) rejects a request that doesn't accept
  // both JSON and the SSE stream.
  const isMcp = path === '/api/mcp';

  const curl = useMemo(() => {
    const url = buildUrl();
    const parts = [`curl -X ${method.toUpperCase()} '${url}'`];
    if (isMcp) parts.push(`-H 'Accept: application/json, text/event-stream'`);
    if (hasBody && body.trim()) {
      parts.push(`-H 'Content-Type: application/json'`);
      parts.push(`-d '${body.replace(/\n\s*/g, ' ')}'`);
    }
    if (!isPublic(op)) parts.push(`--cookie 'your Clerk session'`);
    return parts.join(' \\\n  ');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, method, body, hasBody, pathVals, queryVals]);

  const run = async () => {
    setRunning(true);
    setError(null);
    setResult(null);
    // eslint-disable-next-line react-hooks/purity -- inside an async event handler, not render
    const started = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (isMcp) headers['Accept'] = 'application/json, text/event-stream';
      const init: RequestInit = { method: method.toUpperCase(), credentials: 'include' };
      if (hasBody && body.trim()) {
        try {
          JSON.parse(body);
        } catch {
          setError('Request body is not valid JSON.');
          setRunning(false);
          return;
        }
        headers['Content-Type'] = 'application/json';
        init.body = body;
      }
      if (Object.keys(headers).length) init.headers = headers;
      const res = await fetch(buildUrl(), init);
      const text = await res.text();
      const rl = res.headers.get('RateLimit-Limit')
        ? `${res.headers.get('RateLimit-Remaining')}/${res.headers.get('RateLimit-Limit')} left`
        : undefined;
      setResult({
        status: res.status,
        statusText: res.statusText,
        // eslint-disable-next-line react-hooks/purity -- inside an async event handler, not render
        ms: Date.now() - started,
        body: fmt(text),
        rateLimit: rl,
        ok: res.ok,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setRunning(false);
    }
  };

  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <span className={`${styles.method} ${styles[`m_${method}`]}`}>{method.toUpperCase()}</span>
        <code className={styles.panelPath}>{path}</code>
        <span className={`${styles.authBadge} ${isPublic(op) ? styles.authPublic : ''}`}>
          {isPublic(op) ? 'public' : 'session'}
        </span>
      </div>
      {op.summary && <p className={styles.panelSummary}>{op.summary}</p>}
      {op.description && <p className={styles.panelDesc}>{op.description}</p>}

      {pathParams.length > 0 && (
        <div className={styles.fieldGroup}>
          <p className={styles.fieldGroupTitle}>Path parameters</p>
          {pathParams.map((pp) => (
            <label key={pp.name} className={styles.field}>
              <span className={styles.fieldLabel}>
                {pp.name}
                {pp.required && <em className={styles.req}> *</em>}
              </span>
              <input
                className={styles.input}
                value={pathVals[pp.name] ?? ''}
                placeholder={pp.description}
                onChange={(e) => setPathVals((v) => ({ ...v, [pp.name]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      )}

      {queryParams.length > 0 && (
        <div className={styles.fieldGroup}>
          <p className={styles.fieldGroupTitle}>Query parameters</p>
          {queryParams.map((qp) => (
            <label key={qp.name} className={styles.field}>
              <span className={styles.fieldLabel}>
                {qp.name}
                {qp.required && <em className={styles.req}> *</em>}
                {qp.description && <span className={styles.fieldHint}> — {qp.description}</span>}
              </span>
              {qp.schema?.enum ? (
                <select
                  className={styles.input}
                  value={queryVals[qp.name] ?? ''}
                  onChange={(e) => setQueryVals((v) => ({ ...v, [qp.name]: e.target.value }))}
                >
                  <option value="">(none)</option>
                  {qp.schema.enum.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={styles.input}
                  value={queryVals[qp.name] ?? ''}
                  placeholder={qp.example != null ? String(qp.example) : undefined}
                  onChange={(e) => setQueryVals((v) => ({ ...v, [qp.name]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
      )}

      {hasBody && (
        <div className={styles.fieldGroup}>
          <p className={styles.fieldGroupTitle}>
            Request body <span className={styles.fieldHint}>(JSON)</span>
          </p>
          <textarea
            className={styles.textarea}
            rows={Math.min(14, Math.max(4, body.split('\n').length + 1))}
            value={body}
            spellCheck={false}
            onChange={(e) => setBody(e.target.value)}
          />
        </div>
      )}

      <div className={styles.panelActions}>
        <button type="button" className={styles.btnPrimary} onClick={run} disabled={running}>
          {running ? 'Sending…' : 'Send'}
        </button>
        <button
          type="button"
          className={styles.btnSecondary}
          onClick={() => navigator.clipboard?.writeText(curl)}
        >
          Copy as curl
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {result && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <span className={`${styles.status} ${result.ok ? styles.statusOk : styles.statusBad}`}>
              {result.status} {result.statusText}
            </span>
            <span className={styles.resultMeta}>{result.ms} ms</span>
            {result.rateLimit && <span className={styles.resultMeta}>{result.rateLimit}</span>}
          </div>
          <pre className={styles.pre}>
            <code>{result.body || '(empty response)'}</code>
          </pre>
        </div>
      )}
    </section>
  );
}
