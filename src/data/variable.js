import { solutionLabel } from "./domElements";
import {
  attentionTrial5,
  attentionTrial6,
  comprehensionTrials,
} from "./specialTrials";

const MAX_SUBMISSION_LIMIT = 2;
const NUM_COMPREHENSION_TRIALS = 2;

const NO_AI_PHASE_TRIALS_LIMIT = 1; // todo fsy: default 4

// if CAN_ASK_AI_UNLIMITES == false, MAX_ASK_AI_LIMIT takes effect
const MAX_ASK_AI_LIMIT = 5;
const CAN_ASK_AI_UNLIMITES = true;

const BONUS_THRESHOLD = {
  5: 6, // 5-object condition: start to get bonus for at least 6 correct
  6: 6, // 6-object condition: start to get bonus for at least 6 correct
};

const SHUFFLE_MAX_ID_BY_OBJECT_COUNT = {
  5: 34, // shuffle trials with id 0–34 (i.e., first 35 trials)
  6: 19, // shuffle trials with id 0–19 (i.e., first 20 trials)
};

export const PHASE_NAME = {
  PHASE1: "phase1",
  PHASE2: "phase2",
  PHASE3: "phase3",
};

export const phaseState = {
  PHASE_QUESTIONS: {
    phase1: [],
    phase2: [],
    phase3: [],
    extra: [], // not shuffled
  },
  phaseIndexMap: {
    phase1: -1, // [-1, PHASE_QUESTIONS.length]
    phase2: -1,
    phase3: -1,
    extra: -1,
  },
};

export const AI_HELP_TYPE = {
  NO_AI: 0,
  LOW_COST_AI: 1,
  HIGH_COST_AI: 2,
  AI_QUESTION_A: 3,
  AI_QUESTION_B: 4,
};
export const GROUP_TYPE_MAP = {
  [AI_HELP_TYPE.NO_AI]: "no_ai",
  [AI_HELP_TYPE.LOW_COST_AI]: "low_cost_ai",
  [AI_HELP_TYPE.HIGH_COST_AI]: "high_cost_ai",
  [AI_HELP_TYPE.AI_QUESTION_A]: "ai_question_a",
  [AI_HELP_TYPE.AI_QUESTION_B]: "ai_question_b",
};

export const globalState = {
  objectCount: 5,
  curTrialIndex: 0, // 1 based

  curQuestionIndex: 0, // 1 based, for NO AI group
  questions: [], //  for NO AI group

  /* phase */
  curPhase: PHASE_NAME.PHASE1, // phase1 | phase2 | phase3
  phaseTimerEnded: false,
  currentPhaseTrialCount: 0,

  performance: {
    lastSubmission: {
      correctChoice: 0, // Number of correctly placed objects in the most recent submission
      score: 0, // Accuracy score of the most recent submission (0–100)
      steps: 0, // Number of drag steps made in the most recent submission
      askAICount: 0,
    },
    curTrialAskAICount: 0, // Number of ask ai count in this trial
    submissionCount: 0, // Total number of submissions in the current trial
    totalSteps: 0, // Total number of drag steps across all submissions in the current trial
    correctTrialCount: 0, // Total number of 100% correct trials
    totalAskAICount: 0,
  },
  remainingSubmissions: MAX_SUBMISSION_LIMIT,

  /* AI */
  AI_HELP: AI_HELP_TYPE.NO_AI,
  NUM_REVEAL_OBJECTS: 1,
  remainingAskAICount: MAX_ASK_AI_LIMIT,
  revealedIndicesThisTrial: new Set(), // 记录这一轮AI返回的idx

  /* attention check */
  attentionCheckPending: false,
  attentionCheckShown: false,
  isAttentionCheckVisible: false,

  /* comprehension check */
  comprehensionCheckShown: false,
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
 * Shuffle Count
 */
export function getShuffleMaxId() {
  const objCount = getObjCount();
  return SHUFFLE_MAX_ID_BY_OBJECT_COUNT[objCount] ?? 20;
}

/**
 * Phase
 */
export function getCurPhase() {
  return globalState.curPhase;
}

export function setCurPhase(phaseName) {
  globalState.curPhase = phaseName;
}

export function phaseTimerEnded() {
  return globalState.phaseTimerEnded;
}

export function setPhaseTimerEnded(phaseEnded) {
  globalState.phaseTimerEnded = phaseEnded;
}

export function getNoAIPhaseTrialsLimit() {
  return NO_AI_PHASE_TRIALS_LIMIT;
}

export function incrementCurrentPhaseTrialCount() {
  globalState.currentPhaseTrialCount++;
}

export function resetCurrentPhaseTrialCount() {
  globalState.currentPhaseTrialCount = 0;
}

export function getCurrentPhaseTrialCount() {
  return globalState.currentPhaseTrialCount;
}

export function canEndPhase() {
  // NoAI Phase
  if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE3].includes(getCurPhase())) {
    return (
      phaseTimerEnded() &&
      getCurrentPhaseTrialCount() >= getNoAIPhaseTrialsLimit()
    );
  }
  return phaseTimerEnded();
}

/**
 * Trials
 */
export function setQuestionsData(data) {
  // for NO AI group
  globalState.questions = data;
}

export function advanceTrial(shouldShowSpecialTrials) {
  globalState.curTrialIndex++;

  if (shouldShowSpecialTrials) {
    return true;
  }

  // if (isNoAIExpGroup()) {
  //   // normal trial, use questions from questions list
  //   globalState.curQuestionIndex++;
  //   if (globalState.curQuestionIndex > globalState.questions.length) {
  //     alert("All trials completed!");
  //     return false;
  //   }
  //   return true;
  // }

  const phase = getCurPhase();
  if (
    phaseState.phaseIndexMap[phase] <
    phaseState.PHASE_QUESTIONS[phase].length - 1
  ) {
    phaseState.phaseIndexMap[phase]++;
  } else {
    phaseState.phaseIndexMap[phase] = phaseState.PHASE_QUESTIONS[phase].length;
    phaseState.phaseIndexMap.extra++;
    if (
      phaseState.phaseIndexMap.extra >= phaseState.PHASE_QUESTIONS.extra.length
    ) {
      alert("All trials completed!");
      return false;
    }
  }

  return true;
}

// Get current question data based on trial phase and index
export function getCurQuestionData() {
  if (isAttentionCheck()) {
    return getObjCount() === 5 ? attentionTrial5 : attentionTrial6;
  }
  if (isComprehensionCheck()) {
    return comprehensionTrials[getCurTrialIndex() - 1];
  }

  // if (isNoAIExpGroup()) {
  //   return globalState.questions[globalState.curQuestionIndex - 1];
  // }
  const phase = getCurPhase();
  const index = phaseState.phaseIndexMap[phase];
  if (index < phaseState.PHASE_QUESTIONS[phase].length) {
    return phaseState.PHASE_QUESTIONS[phase][index];
  } else {
    // fallback to extra pool
    const extraIndex = phaseState.phaseIndexMap.extra;
    return phaseState.PHASE_QUESTIONS.extra[extraIndex];
  }
}

export function getCurTrialIndex() {
  // attention check also counts
  return globalState.curTrialIndex;
}

export function getCurQuestionIndex() {
  const phaseMap = phaseState.phaseIndexMap;
  const questionMap = phaseState.PHASE_QUESTIONS;

  let total = 0;

  for (const phase in phaseMap) {
    const idx = phaseMap[phase];
    const length = questionMap[phase]?.length || 0;

    if (idx === -1) continue; // Phase not started

    if (idx < length) {
      // In-progress phase
      total += idx + 1;
    } else {
      // Exhausted this phase, count full length
      total += length;
    }
  }

  return total;
}
export function resetTrialID() {
  globalState.curTrialIndex = 0;
}

/**
 * Ask AI
 */
export function isNoAIExpGroup() {
  return globalState.AI_HELP === AI_HELP_TYPE.NO_AI;
}

export function setAIHelpType(type) {
  globalState.AI_HELP = type;
}

export function getAIHelpType() {
  return globalState.AI_HELP;
}

export function setAIRevealCounts(count) {
  globalState.NUM_REVEAL_OBJECTS = count;
}

export function getAIRevealCounts() {
  return globalState.NUM_REVEAL_OBJECTS;
}

// todo fsy
export function isAllowedAskAITrials() {
  return (
    !isNoAIExpGroup() &&
    !isComprehensionCheck() &&
    !isAttentionCheck() &&
    getCurPhase() === PHASE_NAME.PHASE2
  );
  // return true;
}

export function getAskAILimit() {
  return MAX_ASK_AI_LIMIT;
}

export function remainingAskAICount() {
  return globalState.remainingAskAICount;
}

export function resetAskAI() {
  globalState.remainingAskAICount = getAskAILimit();
  globalState.revealedIndicesThisTrial.clear();
  solutionLabel.style.visibility = "hidden";
}

export function incrementAskAICount() {
  if (!CAN_ASK_AI_UNLIMITES && globalState.remainingAskAICount > 0) {
    globalState.remainingAskAICount--;
  }
  globalState.performance.lastSubmission.askAICount++;
  globalState.performance.curTrialAskAICount++;
  globalState.performance.totalAskAICount++;
}

export function getRevealedIndicesThisTrial() {
  return globalState.revealedIndicesThisTrial;
}

// if all objects have been revealed, reset the record
export function recordRevealedIndicesThisTrial(idx) {
  globalState.revealedIndicesThisTrial.add(idx);
  if (globalState.revealedIndicesThisTrial.size >= getObjCount()) {
    globalState.revealedIndicesThisTrial.clear();
  }
}

export function getTrialTotalAskAICount() {
  return globalState.performance.totalAskAICount;
}

/**
 * Submissions Count
 */
export function getSubmissionLimit() {
  if (globalState.attentionCheckShown && globalState.isAttentionCheckVisible) {
    return 1;
  }
  return MAX_SUBMISSION_LIMIT;
}

export function remainingSubmissions() {
  return globalState.remainingSubmissions;
}

export function resetSubmissions() {
  globalState.remainingSubmissions = getSubmissionLimit();
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
  globalState.performance.curTrialAskAICount = 0;
  globalState.performance.submissionCount = 0;
}

export function resetSubmissionPerformance() {
  globalState.performance.lastSubmission.correctChoice = 0;
  globalState.performance.lastSubmission.score = 0;
  globalState.performance.lastSubmission.steps = 0;
  globalState.performance.lastSubmission.askAICount = 0;
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
export function enableAttentionCheckPending() {
  globalState.attentionCheckPending = true;
}

export function attentionCheckShown() {
  return globalState.attentionCheckShown;
}

export function shouldShowAttentionCheck() {
  if (
    globalState.attentionCheckPending &&
    !globalState.comprehensionCheckShown &&
    !globalState.attentionCheckShown
  ) {
    globalState.attentionCheckPending = false;
    globalState.attentionCheckShown = true;
    globalState.isAttentionCheckVisible = true;
    return true;
  }
  return false;
}

export function isAttentionCheck() {
  return globalState.isAttentionCheckVisible;
}

export function shouldEndAttentionCheck() {
  if (globalState.attentionCheckShown && globalState.isAttentionCheckVisible) {
    globalState.isAttentionCheckVisible = false;
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
