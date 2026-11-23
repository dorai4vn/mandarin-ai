import { z } from 'zod';

/** Skills that own an independent review schedule (D-007). */
export const SKILLS = ['meaning', 'writing', 'listening', 'speaking'] as const;
export const SkillSchema = z.enum(SKILLS);
export type Skill = z.infer<typeof SkillSchema>;
