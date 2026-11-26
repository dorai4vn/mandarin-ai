import type { SessionMode } from './queue.js';
import type { MeaningQuizType } from './queue.js';

/** A quiz session in progress; persisted locally so a tab reload resumes it (M3). */
export interface QuizSessionState {
  id: string;
  mode: SessionMode;
  studyDate: string;
  startedAt: string;
  /** Words to ask, in order; a wrongly answered word is appended once for a retry. */
  queue: { itemId: string; quizType: MeaningQuizType }[];
  /** One entry per answered question (index = position in `queue`). */
  answers: { itemId: string; correct: boolean; attemptId: string }[];
  completed: boolean;
}
