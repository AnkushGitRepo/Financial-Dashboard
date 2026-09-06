import type { NextConfig } from 'next';

// The onnxruntime-node addon (pulled in by @huggingface/transformers for
// Phase 10 retrieval embeddings) dynamically links `libonnxruntime.so.1`,
// which sits next to the .node file. Next's file tracing bundles the .node
// binary but misses that sidecar, so on Vercel the routes that embed 500
// with "libonnxruntime.so.1: cannot open shared object file". Force the
// Linux x64 runtime files into the trace for every route that reaches
// src/lib/rag/embed.ts.
const ONNX_RUNTIME_FILES = ['./node_modules/onnxruntime-node/bin/napi-v6/linux/x64/*'];

const nextConfig: NextConfig = {
  // Dev-only route indicator badge — not part of the brand, off entirely.
  devIndicators: false,
  outputFileTracingIncludes: {
    '/api/cron/index-corpus': ONNX_RUNTIME_FILES,
    '/api/ai/chat': ONNX_RUNTIME_FILES,
    '/api/insights/stock': ONNX_RUNTIME_FILES,
    '/api/insights/portfolio': ONNX_RUNTIME_FILES,
    '/api/insights/ipo': ONNX_RUNTIME_FILES,
    '/api/notes': ONNX_RUNTIME_FILES,
    '/api/notes/[id]': ONNX_RUNTIME_FILES,
    '/api/holdings': ONNX_RUNTIME_FILES,
    '/api/holdings/[id]': ONNX_RUNTIME_FILES,
  },
};

export default nextConfig;
