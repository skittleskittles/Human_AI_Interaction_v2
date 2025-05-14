const MAX_TIMER_INTERVAL = 1200;
const MAX_SUBMISSION_LIMIT = 3;

export const globalState = {
  timer: MAX_TIMER_INTERVAL,
  interval: null,
  steps: 0,

  submissionLimit: MAX_SUBMISSION_LIMIT,
  remainingSubmissions: MAX_SUBMISSION_LIMIT,

  performance: { correctChoice: 0, accuracy: 0, correctTrialCount: 0 },
};

/**
 * Timer
 */
export function resetTimer() {
  globalState.timer = MAX_TIMER_INTERVAL;
}

/**
 * Steps
 */
export function incrementSteps() {
  globalState.steps++;
}

export function resetSteps() {
  globalState.steps = 0;
}

/**
 * Submissions
 */
export function remainingSubmissions() {
  return globalState.remainingSubmissions;
}
export function resetSubmissions() {
  globalState.remainingSubmissions = globalState.submissionLimit;
}
export function hasSubmittedThisTrial() {
  return globalState.remainingSubmissions !== globalState.submissionLimit;
}

export function decrementSubmissions() {
  if (globalState.remainingSubmissions > 0) {
    globalState.remainingSubmissions--;
  }
}

/**
 * Performance
 */
export function getAccuracy() {
  return globalState.performance.accuracy;
}

export function getCorrectCount() {
  return globalState.performance.correctChoice;
}

export function setAccuracyState({ correctChoice = 0, accuracy = 0 } = {}) {
  globalState.performance.correctChoice = correctChoice;
  globalState.performance.accuracy = accuracy;
}

export function incrementCorrectTrialCount() {
  globalState.performance.correctTrialCount++;
}

export function getCorrectTrialCount() {
  return globalState.performance.correctTrialCount;
}
