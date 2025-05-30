import { pauseTimer, resumeTimer } from "../timer";

const MAX_SUBMISSION_LIMIT = 3;

export const globalState = {
  objectCount: 5,

  questions: [],
  curTrialId: 0,
  curQuestionId: 0,

  performance: {
    lastSubmission: {
      correctChoice: 0, // Number of correctly placed objects in the most recent submission
      score: 0, // Accuracy score of the most recent submission (0–100)
      steps: 0, // Number of drag steps made in the most recent submission
    },
    submissionCount: 0, // Total number of submissions in the current trial
    totalSteps: 0, // Total number of drag steps across all submissions in the current trial
    correctTrialCount: 0, // Total number of 100% correct trials
  },

  remainingSubmissions: MAX_SUBMISSION_LIMIT,

  /* attention check */
  attentionCheckPending: false,
  attentionCheckShown: false,

  /* comprehension check */
  isComprehensionCheck: false,
};

/**
 * objectCount
 */
export function setObjCount(objCnt) {
  globalState.objectCount = objCnt;
}

export function getObjCount(objCnt) {
  return globalState.objectCount;
}

/**
 * Trials
 */
export function setQuestionsData(data) {
  globalState.questions = data;
}

export function getCurQuestionData() {
  return globalState.questions[globalState.curQuestionId - 1];
}

export function getCurTrialId() {
  // attention check also counts
  return globalState.curTrialId;
}

export function advanceTrial(shouldShowAttentionCheck) {
  globalState.curTrialId++;

  if (shouldShowAttentionCheck) {
    return true;
  }

  // normal trial, use questions from questions list
  globalState.curQuestionId++;
  if (globalState.curQuestionId > globalState.questions.length) {
    alert("All trials completed!");
    return false;
  }
  return true;
}

/**
 * Submissions Count
 */
export function getSubmissionLimit() {
  if (globalState.attentionCheckShown) {
    return 1;
  }
  return MAX_SUBMISSION_LIMIT;
}

export function remainingSubmissions() {
  return globalState.remainingSubmissions;
}

export function resetSubmissions() {
  if (globalState.attentionCheckShown) {
    // attention check only allows submit once
    globalState.remainingSubmissions = getSubmissionLimit();
  } else {
    globalState.remainingSubmissions = getSubmissionLimit();
  }
}

export function hasSubmittedThisTrial() {
  return globalState.remainingSubmissions !== getSubmissionLimit();
}

export function decrementSubmissions(score) {
  if (globalState.remainingSubmissions > 0) {
    globalState.remainingSubmissions--;
  }
  if (score == 100) {
    globalState.remainingSubmissions = 0;
  }
}

export function getTrialTotalSubmissions() {
  return getSubmissionLimit() - globalState.remainingSubmissions;
}

/**
 * Performance
 */
export function incrementSteps() {
  globalState.performance.totalSteps++;
  globalState.performance.lastSubmission.steps++;
}

export function resetTrialSteps() {
  globalState.performance.totalSteps = 0;
}

export function resetSubmissionPerformance() {
  globalState.performance.lastSubmission.correctChoice = 0;
  globalState.performance.lastSubmission.score = 0;
  globalState.performance.lastSubmission.steps = 0;
}

export function updatePerformanceAfterSubmission(correctChoice, score) {
  globalState.performance.lastSubmission.correctChoice = correctChoice;
  globalState.performance.lastSubmission.score = score;
  globalState.performance.submissionCount = getTrialTotalSubmissions();
  if (score === 100 && !isAttentionCheck()) {
    globalState.performance.correctTrialCount++;
  }
}

export function getPerformance() {
  return globalState.performance;
}

/**
 * Attention Check
 */
export function shouldShowAttentionCheck() {
  if (globalState.attentionCheckPending && !globalState.attentionCheckShown) {
    globalState.attentionCheckPending = false;
    globalState.attentionCheckShown = true;
    return true;
  }
  return false;
}

export function isAttentionCheck() {
  return globalState.attentionCheckShown;
}

export function shouldEndAttentionCheck() {
  if (globalState.attentionCheckShown) {
    globalState.attentionCheckShown = false;
    return true;
  }
  return false;
}

/**
 * Comprehension Check
 */
export function isComprehensionCheck() {
  return globalState.isComprehensionCheck;
}
