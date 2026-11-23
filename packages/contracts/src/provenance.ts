import { z } from 'zod';

/**
 * Where a provider result came from. Every adapter result carries this so the UI and
 * reports can never present a mock as a live integration (D-004).
 */
export const ResultSourceSchema = z.enum(['live', 'mock']);
export type ResultSource = z.infer<typeof ResultSourceSchema>;

/** Verification status vocabulary used in reports and the in-app diagnostics screen. */
export const SpikeStatusSchema = z.enum(['VERIFIED', 'MOCKED', 'BLOCKED', 'UNTESTED']);
export type SpikeStatus = z.infer<typeof SpikeStatusSchema>;
