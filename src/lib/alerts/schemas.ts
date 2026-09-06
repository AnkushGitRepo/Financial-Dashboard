import { z } from 'zod';
import type { AlertType } from './types';

// Wire-shape validation for the /api/alerts routes (ADR 0014 §5, §6).

const symbolSchema = z.string().trim().min(1).max(20).toUpperCase();

export const priceThresholdParamsSchema = z.object({
  direction: z.enum(['above', 'below']),
  threshold: z.number().positive(),
});

export const percentMoveParamsSchema = z.object({
  direction: z.enum(['up', 'down', 'either']),
  pct: z.number().positive().max(100),
});

export const week52BreachParamsSchema = z.object({
  edge: z.enum(['high', 'low']),
  withinPct: z.number().min(0).max(50).optional(),
});

export const portfolioPnlParamsSchema = z.object({
  metric: z.enum(['total_value', 'unrealized_pnl', 'unrealized_pnl_pct']),
  direction: z.enum(['above', 'below']),
  threshold: z.number(),
});

/** The params validator for a given alert type — used by POST (via the
 * discriminated union below) and by PATCH (which knows the type only after
 * loading the existing alert). */
export function paramsSchemaForType(type: AlertType) {
  switch (type) {
    case 'price_threshold':
      return priceThresholdParamsSchema;
    case 'percent_move':
      return percentMoveParamsSchema;
    case 'week52_breach':
      return week52BreachParamsSchema;
    case 'portfolio_pnl':
      return portfolioPnlParamsSchema;
  }
}

const commonCreateFields = z.object({
  note: z.string().trim().max(200).optional(),
  rearm: z.boolean().optional(),
  cooldownMinutes: z.number().int().min(5).max(1440).optional(),
});

export const createAlertSchema = z
  .discriminatedUnion('type', [
    z.object({
      type: z.literal('price_threshold'),
      symbol: symbolSchema,
      params: priceThresholdParamsSchema,
    }),
    z.object({
      type: z.literal('percent_move'),
      symbol: symbolSchema,
      params: percentMoveParamsSchema,
    }),
    z.object({
      type: z.literal('week52_breach'),
      symbol: symbolSchema,
      params: week52BreachParamsSchema,
    }),
    z.object({
      type: z.literal('portfolio_pnl'),
      // Optional: present = scoped to that one holding's P&L; absent = whole book.
      symbol: symbolSchema.nullish(),
      params: portfolioPnlParamsSchema,
    }),
  ])
  .and(commonCreateFields);

export const updateAlertSchema = z.object({
  note: z.string().trim().max(200).nullable().optional(),
  status: z.enum(['active', 'paused']).optional(),
  rearm: z.boolean().optional(),
  cooldownMinutes: z.number().int().min(5).max(1440).optional(),
  // Validated against the existing alert's type in the route handler.
  params: z.unknown().optional(),
});
