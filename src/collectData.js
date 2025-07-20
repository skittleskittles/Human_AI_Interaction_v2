/**
 * Data Structures:
 *   - https://docs.google.com/document/d/1bmtTgm39KQYB385JB6DSbq2pWNm6omMeQpxw29AaBP0/edit?tab=t.dire4py9pef7#heading=h.yuzh9ft0k3h8
 */

import {
  GROUP_TYPE_MAP,
  getAIHelpType,
  getCurTrialIndex,
  getObjCount,
} from "./data/variable.js";
import { getCurDate } from "./utils.js";

/**
 * @typedef {Object} User
 * @property {string} prolific_pid
 * @property {string} firebase_uid
 * @property {number} exp_group
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {boolean} is_consent
 * @property {boolean} is_passed_comprehension
 * @property {boolean} is_passed_all_experiments
 * @property {Feedback} feedback
 * @property {Experiment[]} experiments
 */
export const User = {
  prolific_pid: "",
  firebase_uid: "",
  create_time: new Date(),
  end_time: new Date(),
  is_consent: false,
  is_passed_comprehension: false,
  is_passed_attention_check: false,
  is_passed_all_experiments: false, // pass attention check and finish all 20 minutes
  experiments: [], // Experiment
  num_objects: getObjCount(),
  exp_group: GROUP_TYPE_MAP[getAIHelpType()],
};

/**
 * @typedef {Object} Experiment
 * @property {number} experiment_id
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {number} failed_attention_check_count
 * @property {boolean} is_finished
 * @property {number} num_trials
 * @property {number} total_correct_trials
 * @property {number} total_ask_ai_count
 * @property {Trial[]} trials
 * @property {Trial[]} comprehension_trials
 */
export function createNewExperimentData(experiment_id = 0) {
  return {
    experiment_id,
    create_time: getCurDate(),
    end_time: getCurDate(), // will be updated at the end
    is_passed_attention_check: false,
    is_finished: false,
    num_trials: 0,
    total_correct_trials: 0,
    total_ask_ai_count: 0,
    trials: [], // will be populated with Trial objects
    comprehension_trials: [],
  };
}

/**
 * Returns the current Experiment object from User based on globalState.
 * @returns {Experiment}
 */
export function getCurExperimentData() {
  if (User.experiments.length === 0) {
    return null;
  }
  return User.experiments[0];
}

/**
 * @typedef {Object} Trial
 * @property {string} trial_id // 1, 2, attention check, 3, ...
 * @property {number} question_id // 0, 1, 2, 3, ... (comprehension check: -2, -3; attention check: -3)
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {boolean} is_attention_check
 * @property {boolean} is_comprehension_check
 * @property {boolean} has_click_reveal_soluton
 * @property {number} score
 * @property {number} correct_num
 * @property {Choice[]} ai_choice
 * @property {Choice[]} best_choice
 * @property {Choice[]} user_choice
 * @property {Number} ask_ai_count
 * @property {Number} total_submissions
 * @property {Number} total_steps
 * @property {number} cur_total_correct_trials
 * @property {number} cur_total_ask_ai_count
 * @property {Number} total_time // seconds, 每一轮trial总时间
 */
/**
 * Creates a new Trial
 * @returns {Trial}
 */
export function createNewTrialData(
  trial_id,
  question_id,
  answer,
  is_comprehension_check,
  is_attention_check
) {
  return {
    trial_id,
    question_id,
    create_time: getCurDate(),
    end_time: getCurDate(),
    is_comprehension_check: is_comprehension_check,
    is_attention_check: is_attention_check,
    has_click_reveal_soluton: false,
    score: 0,
    correct_num: 0,
    ai_choice: [], // []Choice
    best_choice: [{ choices: answer, score: 100 }], // []Choice
    user_choice: [], // []Choice
    ask_ai_count: 0,
    total_steps: 0,
    total_submissions: 0,
    cur_total_correct_trials: 0,
    cur_total_ask_ai_count: 0,
    total_time: 0,
  };
}

/**
 * Updates experiment-level and user-level status after each trial.
 * Handles attention check results and final trial checks.
 */
export function updateExperimentData(
  experiment,
  performance,
  isComprehensionCheck
) {
  if (isComprehensionCheck) {
    return;
  }

  experiment.num_trials = experiment.trials.length;
  experiment.is_passed_attention_check = User.is_passed_attention_check;
  experiment.total_correct_trials = performance.correctTrialCount;
  experiment.total_ask_ai_count = performance.totalAskAICount;
}

/**
 * Updates the end info for the current trial
 */
export function updateTrialData(
  trial,
  performance,
  trialTimeSec,
  isSubmission
) {
  trial.end_time = getCurDate();
  if (isSubmission) {
    trial.score = performance.lastSubmission.score;
    trial.correct_num = performance.lastSubmission.correctChoice;
    trial.total_submissions = performance.submissionCount;
    trial.total_steps = performance.totalSteps;
  }
  trial.has_click_reveal_soluton = performance.hasClickRevealSol;
  trial.ask_ai_count = performance.curTrialAskAICount;
  trial.cur_total_correct_trials = performance.correctTrialCount;
  trial.cur_total_ask_ai_count = performance.totalAskAICount;
  trial.total_time = trialTimeSec;
}

/**
 * Returns the current Trial object from User based on globalState.
 * @returns {Trial}
 */
export function getCurTrialData(isComprehensionCheck) {
  const currentExperiment = getCurExperimentData();
  if (!currentExperiment) {
    return null;
  }
  if (isComprehensionCheck) {
    // comprehension trials
    if (currentExperiment.comprehension_trials.length > 0) {
      return currentExperiment?.comprehension_trials[getCurTrialIndex() - 1];
    }
  } else {
    // regular trials
    if (currentExperiment.trials.length > 0) {
      return currentExperiment?.trials[getCurTrialIndex() - 1];
    }
  }
  return null;
}

/**
 * @typedef {Object} Choice
 * @property {string[]} choices
 * @property {number} score
 * @property {number} correct_num
 * @property {number} steps
 * @property {number} time_spent
 */

export function recordUserChoiceData(
  trial,
  userAns,
  performance,
  submissionTimeSec
) {
  const userChoice = createChoice(
    userAns,
    performance,
    submissionTimeSec,
  );
  trial.user_choice.push(userChoice);
}

export function createChoice(
  userAns,
  performance,
  submissionTimeSec
) {
  const userChoice = {
    choices: userAns,
    correct_num: performance.lastSubmission.correctChoice,
    score: performance.lastSubmission.score,
    steps: performance.lastSubmission.steps,
    time_spent: submissionTimeSec,
    ask_ai_count: performance.lastSubmission.askAICount,
  };

  return userChoice;
}

/**
 * @typedef {CustomCount}
 * @property {number} before_ai_show
 * @property {number} after_ai_show
 * @property {number} total
 */
/**
 * Adds a numeric value to a CustomCount field.
 * @param {CustomCount} countObj
 * @param {number} value - Value to add (in seconds)
 * @param {boolean} isAfterAI
 */
export function addToCustomCount(countObj, value, isAfterAI) {
  if (!countObj || typeof value !== "number") return;

  if (isAfterAI) {
    countObj.after_ai_show += value;
  } else {
    countObj.before_ai_show += value;
  }
  countObj.total += value;
}
