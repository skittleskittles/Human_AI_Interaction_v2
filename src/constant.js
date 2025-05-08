const MAX_TIMER_INTERVAL = 1200;
const MAX_SUBMISSION_LIMIT = 3;

export const state = {
  timer: MAX_TIMER_INTERVAL,
  interval: null,
  steps: 0,

  submissionLimit: MAX_SUBMISSION_LIMIT,
  remainingSubmissions: MAX_SUBMISSION_LIMIT,
};

/**
 * Timer
 */
export function resetTimer() {
  state.timer = MAX_TIMER_INTERVAL;
}

/**
 * Steps
 */
export function incrementSteps() {
  state.steps++;
}

export function resetSteps() {
  state.steps = 0;
}

/**
 * Submissions
 */
export function remainingSubmissions() {
  return state.remainingSubmissions;
}
export function resetSubmissions() {
  state.remainingSubmissions = state.submissionLimit;
}

export function decrementSubmissions() {
  if (state.remainingSubmissions > 0) {
    state.remainingSubmissions--;
  }
}
