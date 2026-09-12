// AI-assisted extraction for images, PDFs, and DOCX (ADR 0022, part C) —
// unlike XLSX/CSV, these formats don't have a fixed row/column shape a
// deterministic parser can rely on, so a broker screenshot, statement PDF,
// or Word doc goes through the user's own AI key via `generateObject`
// (structured output), same BYO-key cost model as every other AI surface
// (ADR 0018 §2). PDF/DOCX text is extracted first and handed to the model
// as text; images are passed to the model directly (vision).

import { generateObject, type ImagePart, type TextPart } from 'ai';
import { z } from 'zod';
import mammoth from 'mammoth';
import { getDocumentProxy, extractText } from 'unpdf';
import { resolveModel, type AiConfig } from '@/lib/ai/providers';
import { normalizeAiError } from '@/lib/ai/generate';
import type { ExtractedHolding } from './types';

const extractedHoldingSchema = z.object({
  rawName: z.string().nullable().describe('Company name exactly as shown, or null if only a ticker is given.'),
  rawSymbol: z.string().nullable().describe('Ticker/symbol exactly as shown, or null if only a name is given.'),
  quantity: z.number().positive(),
  avgPrice: z.number().positive().describe('Average buy price per share.'),
});

const extractionResultSchema = z.object({
  holdings: z.array(extractedHoldingSchema),
});

const EXTRACTION_SYSTEM = [
  'You extract stock holdings from a broker portfolio statement, screenshot, or document.',
  'For each distinct equity holding, report the company name and/or ticker exactly as shown, the quantity held, and the average buy price per share.',
  'Ignore totals, summaries, cash balances, mutual funds, and anything that is not an individual listed-equity holding.',
  'If a value is missing or you are not confident it is a holding, omit that entry rather than guessing.',
].join(' ');

// Keeps a large statement from ballooning the prompt/cost — holdings
// tables are near the top of virtually every broker statement format.
const MAX_TEXT_CHARS = 20_000;

export type ExtractionResult = { ok: true; holdings: ExtractedHolding[] } | { ok: false; error: string };

async function runExtraction(
  config: AiConfig,
  content: Array<TextPart | ImagePart>
): Promise<ExtractionResult> {
  try {
    const model = resolveModel(config);
    const { object } = await generateObject({
      model,
      schema: extractionResultSchema,
      system: EXTRACTION_SYSTEM,
      messages: [{ role: 'user', content }],
    });
    return { ok: true, holdings: object.holdings };
  } catch (err) {
    return { ok: false, error: normalizeAiError(err) };
  }
}

export async function extractFromImage(
  config: AiConfig,
  buffer: Buffer,
  mediaType: string
): Promise<ExtractionResult> {
  return runExtraction(config, [
    { type: 'text', text: 'Extract every stock holding visible in this broker app screenshot.' },
    { type: 'image', image: buffer, mediaType },
  ]);
}

export async function extractFromPdf(config: AiConfig, buffer: Buffer): Promise<ExtractionResult> {
  let text: string;
  try {
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    ({ text } = await extractText(pdf, { mergePages: true }));
  } catch {
    return { ok: false, error: 'Could not read that PDF — it may be scanned/image-only, password-protected, or corrupted.' };
  }
  if (!text.trim()) {
    return { ok: false, error: 'That PDF has no extractable text — it may be a scanned image rather than a text PDF.' };
  }
  return runExtraction(config, [
    {
      type: 'text',
      text: `Extract every stock holding from this broker statement text:\n\n${text.slice(0, MAX_TEXT_CHARS)}`,
    },
  ]);
}

export async function extractFromDocx(config: AiConfig, buffer: Buffer): Promise<ExtractionResult> {
  let text: string;
  try {
    ({ value: text } = await mammoth.extractRawText({ buffer }));
  } catch {
    return { ok: false, error: 'Could not read that document — it may be corrupted or not a valid .docx file.' };
  }
  if (!text.trim()) {
    return { ok: false, error: 'That document has no readable text.' };
  }
  return runExtraction(config, [
    { type: 'text', text: `Extract every stock holding from this document text:\n\n${text.slice(0, MAX_TEXT_CHARS)}` },
  ]);
}
