import {
  attentionTrial5,
  attentionTrial6,
  comprehensionTrials,
} from "./specialTrials";

const MAX_SUBMISSION_LIMIT = 2;
const NUM_COMPREHENSION_TRIALS = 2;

const BONUS_THRESHOLD = {
  5: 6, // 5-object condition: start to get bonus for at least 6 correct
  6: 6, // 6-object condition: start to get bonus for at least 6 correct
};

const SHUFFLE_MAX_ID_BY_OBJECT_COUNT = {
  5: 34, // shuffle trials with id 0–34 (i.e., first 35 trials)
  6: 19, // shuffle trials with id 0–19 (i.e., first 20 trials)
};

export const globalState = {
  AI_HELP: 0,

  objectCount: 5,

  questions: [],
  curTrialIndex: 0,
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
  comprehensionCheckShown: false,
};

export const AI_HELP_TYPE = {
  NO_AI: 0,
  OPTIMAL_AI_BEFORE: 1,
  OPTIMAL_AI_AFTER: 2,
  SUB_AI_AFTER: 3,
  SUBAI_REQUEST: 4,
};

/**
 * objectCount
 */
export function setObjCount(objCnt) {
  globalState.objectCount = objCnt;
}

export function getObjCount() {
  return globalState.objectCount;
}

/**
 *
 */
export function getShuffleMaxId() {
  const objCount = getObjCount();
  return SHUFFLE_MAX_ID_BY_OBJECT_COUNT[objCount] ?? 20;
}
/**
 * Trials
 */
export function setQuestionsData(data) {
  globalState.questions = data;
}

export function getCurQuestionData() {
  let cur;
  if (isAttentionCheck()) {
    cur = getObjCount() === 5 ? attentionTrial5 : attentionTrial6;
  } else if (isComprehensionCheck()) {
    cur = comprehensionTrials[getCurTrialIndex() - 1];
  } else {
    cur = globalState.questions[globalState.curQuestionId - 1];
  }
  return cur;
}

export function getCurTrialIndex() {
  // attention check also counts
  return globalState.curTrialIndex;
}

export function getCurQuestionId() {
  // attention check does not count
  return globalState.curQuestionId;
}

export function advanceTrial(shouldShowSpecialTrials) {
  globalState.curTrialIndex++;

  if (shouldShowSpecialTrials) {
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

export function resetTrialID() {
  globalState.curTrialIndex = 0;
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

export function resetTrialPerformance() {
  resetSubmissionPerformance();
  globalState.performance.submissionCount = 0;
}

export function resetSubmissionPerformance() {
  globalState.performance.lastSubmission.correctChoice = 0;
  globalState.performance.lastSubmission.score = 0;
  globalState.performance.lastSubmission.steps = 0;
}

export function updatePerformanceAfterSubmission(correctChoice, score) {
  globalState.performance.lastSubmission.correctChoice = correctChoice;
  globalState.performance.lastSubmission.score = score;
  globalState.performance.submissionCount++;
  if (score === 100 && !isAttentionCheck() && !isComprehensionCheck()) {
    globalState.performance.correctTrialCount++;
  }
}

export function getPerformance() {
  return globalState.performance;
}

export function getTotalCorrectTrials() {
  return globalState.performance.correctTrialCount;
}

export function getBonusThreshold() {
  const objCount = getObjCount();
  return BONUS_THRESHOLD[objCount];
}

/**
 * Attention Check
 */
export function shouldShowAttentionCheck() {
  if (
    globalState.attentionCheckPending &&
    !globalState.comprehensionCheckShown &&
    !globalState.attentionCheckShown
  ) {
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
export function getComprehensionTrialsNum() {
  return NUM_COMPREHENSION_TRIALS;
}

export function shouldShowComprehensionCheck() {
  if (!globalState.comprehensionCheckShown) {
    globalState.comprehensionCheckShown = true;
    return true;
  }
  return false;
}

export function isComprehensionCheck() {
  return globalState.comprehensionCheckShown;
}

export function shouldEndComprehensionCheck() {
  if (globalState.comprehensionCheckShown) {
    globalState.comprehensionCheckShown = false;
    return true;
  }
  return false;
}
