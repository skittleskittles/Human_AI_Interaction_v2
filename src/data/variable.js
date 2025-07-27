import { revealSolMessage, solutionLabel } from "./domElements";
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

export const PHASE_NAME = {
  COMPREHENSION_CHECK: "comprehension_check",
  PHASE1: "phase1",
  PHASE2: "phase2",
  PHASE3: "phase3",
};

export const phaseState = {
  PHASE_QUESTIONS: {
    [PHASE_NAME.PHASE1]: [],
    [PHASE_NAME.PHASE2]: [],
    [PHASE_NAME.PHASE3]: [],
    extra: [], // not shuffled
  },
  phaseIndexMap: {
    [PHASE_NAME.PHASE1]: -1, // [-1, PHASE_QUESTIONS.length]
    [PHASE_NAME.PHASE2]: -1,
    [PHASE_NAME.PHASE3]: -1,
    extra: -1,
  },
};

export const GROUP_TYPE = {
  NO_AI: 0,
  LOW_COST_AI: 1,
  HIGH_COST_AI: 2,
  AI_QUESTION_A: 3,
  AI_QUESTION_B: 4,
};
export const GROUP_TYPE_NAME_MAP = {
  [GROUP_TYPE.NO_AI]: "no_ai",
  [GROUP_TYPE.LOW_COST_AI]: "low_cost_ai",
  [GROUP_TYPE.HIGH_COST_AI]: "high_cost_ai",
  [GROUP_TYPE.AI_QUESTION_A]: "ai_question_a",
  [GROUP_TYPE.AI_QUESTION_B]: "ai_question_b",
};
// eg: https://xxxx?g=alp
export const URL_GROUP_CODE_MAP = {
  alp: GROUP_TYPE.NO_AI,
  ba: GROUP_TYPE.LOW_COST_AI,
  gam: GROUP_TYPE.HIGH_COST_AI,
  dlta: GROUP_TYPE.AI_QUESTION_A,
  epsi: GROUP_TYPE.AI_QUESTION_B,
};

export const globalState = {
  objectCount: 5,
  GROUP_TYPE: GROUP_TYPE.NO_AI,
  globalCurTrialIndex: 0, // 1 based
  phaseCurTrialIndex: 0, // 1 based

  curQuestionIndex: 0, // 1 based, for NO AI group
  questions: [], //  for NO AI group

  /* phase */
  curPhase: "", // comprehension_check | phase1 | phase2 | phase3
  phaseTimerEnded: false,
  // currentPhaseTrialCount: 0,

  performance: {
    lastSubmission: {},
    curSubmission: {
      correctChoice: 0, // Number of correctly placed objects in the most recent submission
      score: 0, // Accuracy score of the most recent submission (0–100)
      steps: 0, // Number of drag steps made in the most recent submission
      weightedCorrectRate: 0, // [0, 1], counted ai cost
      askAICount: 0,
      askAIAns: [],
    },

    curTrialAskAICount: 0, // Number of ask ai count in this trial
    submissionCount: 0, // Total number of submissions in the current trial
    totalSteps: 0, // Total number of drag steps across all submissions in the current trial
    totalAskAICount: 0,
    hasClickRevealSol: false,
    globalTotalCorrectTrials: 0, // Total number of 100% correct trials (global)

    phaseWeightedCorrectTrials: {
      // Total number of 100% correct trials after reducing ai cost (phase)
      [PHASE_NAME.COMPREHENSION_CHECK]: 0,
      [PHASE_NAME.PHASE1]: 0,
      [PHASE_NAME.PHASE2]: 0,
      [PHASE_NAME.PHASE3]: 0,
    },
    phaseTotalCorrectTrials: {
      // Total number of 100% correct trials (phase)
      [PHASE_NAME.COMPREHENSION_CHECK]: 0,
      [PHASE_NAME.PHASE1]: 0,
      [PHASE_NAME.PHASE2]: 0,
      [PHASE_NAME.PHASE3]: 0,
    },
    phaseBonusAmount: {
      phase1_2: 0,
      phase3: 0,
    },
  },

  remainingSubmissions: MAX_SUBMISSION_LIMIT,

  /* AI */
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

export function canEndPhase() {
  if (shouldShowAttentionCheck()) {
    // show attention check first, then move to next phase
    return false;
  }

  if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE3].includes(getCurPhase())) {
    return (
      phaseTimerEnded() && getPhaseCurTrialIndex() >= getNoAIPhaseTrialsLimit()
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
  globalState.globalCurTrialIndex++;
  globalState.phaseCurTrialIndex++;

  if (shouldShowSpecialTrials) {
    return true;
  }

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
    return comprehensionTrials[getGlobalCurTrialIndex() - 1];
  }

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

// curTrialIndex: 包括comprehension、attention check，所有trials
export function getGlobalCurTrialIndex() {
  // attention check also counts
  return globalState.globalCurTrialIndex;
}

export function resetPhaseCurTrialIndex() {
  globalState.phaseCurTrialIndex = 0;
}

export function getPhaseCurTrialIndex() {
  return globalState.phaseCurTrialIndex;
}

// curQuestionIndex: 不包括comprehension、attention check
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
  globalState.globalCurTrialIndex = 0;
}

/**
 * Show solutions
 */
export function setHasRevealedSol(val) {
  globalState.performance.hasClickRevealSol = val;
}

export function hasRevealedSol() {
  return globalState.performance.hasClickRevealSol;
}

/**
 * Ask AI
 */
export function isNoAIGroup() {
  return globalState.GROUP_TYPE === GROUP_TYPE.NO_AI;
}

export function setGroupType(type) {
  globalState.GROUP_TYPE = type;
}

export function getGroupType() {
  return globalState.GROUP_TYPE;
}

export function setAIRevealCounts(count) {
  globalState.NUM_REVEAL_OBJECTS = count;
}

export function getAIRevealCounts() {
  return globalState.NUM_REVEAL_OBJECTS;
}

export function isAllowedAskAITrials() {
  return (
    !isNoAIGroup() &&
    !isComprehensionCheck() &&
    !isAttentionCheck() &&
    getCurPhase() === PHASE_NAME.PHASE2
  );
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
  revealSolMessage.style.display = "none";
}

export function incrementAskAICount() {
  if (!CAN_ASK_AI_UNLIMITES && globalState.remainingAskAICount > 0) {
    globalState.remainingAskAICount--;
  }
  globalState.performance.curSubmission.askAICount++;
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

export function calWeightedPointIfCorrect() {
  let points = 1;
  const askAICnt = globalState.performance.curTrialAskAICount;
  if (askAICnt <= 5) {
    if (globalState.GROUP_TYPE == GROUP_TYPE.HIGH_COST_AI) {
      points = 1 - 0.18 * askAICnt;
    }
    if (globalState.GROUP_TYPE == GROUP_TYPE.LOW_COST_AI) {
      points = 1 - 0.1 * askAICnt;
    }
  } else {
    if (globalState.GROUP_TYPE == GROUP_TYPE.HIGH_COST_AI) {
      points = 0.05;
    }
    if (globalState.GROUP_TYPE == GROUP_TYPE.LOW_COST_AI) {
      points = 0.3;
    }
  }
  return Number(points.toFixed(2));
}

export function calAskAICost() {
  let cost = 0.18;
  const askAICnt = globalState.performance.curTrialAskAICount;
  if (askAICnt <= 5) {
    if (globalState.GROUP_TYPE == GROUP_TYPE.HIGH_COST_AI) {
      cost = 0.18;
    }
    if (globalState.GROUP_TYPE == GROUP_TYPE.LOW_COST_AI) {
      cost = 0.1;
    }
  } else {
    cost = 0;
  }
  return cost;
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
  globalState.performance.curSubmission.steps++;
}

export function resetTrialSteps() {
  globalState.performance.totalSteps = 0;
}

export function recordSubmissionAIAnswer(aiChoice) {
  globalState.performance.curSubmission.askAIAns.push(aiChoice);
}

export function resetTrialPerformance() {
  resetSubmissionPerformance();
  globalState.performance.curTrialAskAICount = 0;
  globalState.performance.submissionCount = 0;
}

export function resetSubmissionPerformance() {
  globalState.performance.lastSubmission =
    globalState.performance.curSubmission;
  globalState.performance.curSubmission.correctChoice = 0;
  globalState.performance.curSubmission.score = 0;
  globalState.performance.curSubmission.weightedCorrectRate = 0;
  globalState.performance.curSubmission.steps = 0;
  globalState.performance.curSubmission.askAICount = 0;
  globalState.performance.curSubmission.askAIAns = [];
}

export function updatePerformanceAfterSubmission(correctChoice, score) {
  globalState.performance.curSubmission.correctChoice = correctChoice;
  globalState.performance.curSubmission.score = score;
  globalState.performance.submissionCount++;
  if (score === 100 && !isAttentionCheck() && !isComprehensionCheck()) {
    const weightedPoint = calWeightedPointIfCorrect();
    globalState.performance.curSubmission.weightedCorrectRate = weightedPoint;
    globalState.performance.phaseWeightedCorrectTrials[getCurPhase()] +=
      weightedPoint;

    globalState.performance.phaseTotalCorrectTrials[getCurPhase()]++;
    globalState.performance.globalTotalCorrectTrials++;

    // calculate bonus
    const bonusAmount = calBonusAmount(getCurPhase());
    if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE2].includes(getCurPhase())) {
      globalState.performance.phaseBonusAmount.phase1_2 = bonusAmount;
    } else if (getCurPhase() === PHASE_NAME.PHASE3) {
      globalState.performance.phaseBonusAmount.phase3 = bonusAmount;
    }
  }
}

export function getPerformance() {
  return globalState.performance;
}

export function getPhasePoints(phase) {
  return getPerformance().phaseWeightedCorrectTrials[phase];
}

export function calBonusAmount(phase) {
  let bonusAmount = 0;
  let correctTrials = getPerformance().phaseWeightedCorrectTrials[phase];

  if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE2].includes(phase)) {
    if (phase == PHASE_NAME.PHASE2) {
      // phase2 bonus include phase1
      correctTrials +=
        getPerformance().phaseWeightedCorrectTrials[PHASE_NAME.PHASE1];
    }

    bonusAmount = 0.15 * correctTrials;
    if (bonusAmount > 2) {
      bonusAmount = 2;
    }
  }

  if (phase == PHASE_NAME.PHASE3) {
    bonusAmount = 0.18 * correctTrials;
    if (bonusAmount > 1.5) {
      bonusAmount = 1.5;
    }
  }

  return Number(bonusAmount.toFixed(2));
}

/*
 * @phase = phase1/phase2: return phase1+2;
 * @phase = phase3: return phase3;
 * @phase = all: return phase1+2 + phase3;
 */
export function getBonusAmount(phase) {
  let bonusAmount = 0;
  const phaseMap = globalState.performance.phaseBonusAmount || {};
  if (phase == "all") {
    for (const phaseName in phaseMap) {
      bonusAmount += Number(phaseMap[phaseName] || 0);
    }
  } else {
    if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE2].includes(phase)) {
      bonusAmount = Number(phaseMap.phase1_2 || 0);
    } else if (phase == PHASE_NAME.PHASE3) {
      bonusAmount = Number(phaseMap.phase3 || 0);
    }
  }

  return Number(bonusAmount.toFixed(2));
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
    return true;
  }
  return false;
}

export function showAttentionCheck() {
  globalState.attentionCheckPending = false;
  globalState.attentionCheckShown = true;
  globalState.isAttentionCheckVisible = true;
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

// ----- Archived
const BONUS_THRESHOLD = {
  5: 6, // 5-object condition: start to get bonus for at least 6 correct
  6: 6, // 6-object condition: start to get bonus for at least 6 correct
};

const SHUFFLE_MAX_ID_BY_OBJECT_COUNT = {
  5: 34, // shuffle trials with id 0–34 (i.e., first 35 trials)
  6: 19, // shuffle trials with id 0–19 (i.e., first 20 trials)
};

function getBonusThreshold() {
  const objCount = getObjCount();
  return BONUS_THRESHOLD[objCount];
}
