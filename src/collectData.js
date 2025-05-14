/**
 * Data Structures:
 *   - https://docs.google.com/document/d/1bmtTgm39KQYB385JB6DSbq2pWNm6omMeQpxw29AaBP0/edit?tab=t.dire4py9pef7#heading=h.yuzh9ft0k3h8
 */

import { getCurrentDate } from "./utils.js";

/**
 * @typedef {Object} User
 * @property {string} prolific_pid
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {Feedback} feedback
 * @property {Experiment[]} experiments
 * @property {boolean} is_consent
 * @property {boolean} is_passed_education
 * @property {boolean} is_passed_all_experiments
 */
export const User = {
  prolific_pid: "",
  create_time: new Date(),
  end_time: new Date(),
  experiments: [], // Experiment
  is_consent: false,
  is_passed_education: false,
  is_passed_all_experiments: false,
};

/**
 * @typedef {Object} Experiment
 * @property {number} experiment_id
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {number} failed_attention_check_count
 * @property {boolean} is_finished
 * @property {number} num_trials
 * @property {Trial[]} trials
 * @property {Trial[]} comprehension_trials
 */
export function createNewExperimentData(experiment_id, num_trials) {
  return {
    experiment_id,
    create_time: getCurrentDate(),
    end_time: getCurrentDate(), // will be updated at the end
    failed_attention_check_count: 0,
    is_finished: false,
    num_trials,
    trials: [], // will be populated with Trial objects
    comprehension_trials: [],
  };
}

/**
 * Returns the current Experiment object from User based on globalState.
 * @returns {Experiment}
 */
export function getCurrentExperimentData() {
  if (User.experiments.length === 0) {
    return null;
  }
  return User.experiments[globalState.curExperiment];
}

/**
 * @typedef {Object} Trial
 * @property {number} trial_id
 * @property {Date} create_time
 * @property {Date} end_time
 * @property {number} accuracy
 * @property {Choice[]} ai_choice
 * @property {Choice[]} best_choice
 * @property {Choice[]} user_choice
 * @property {CustomCount} total_submission_num
 * @property {CustomCount} total_steps_num
 * @property {CustomCount} think_time // seconds, 第一次动画结束到开始拦截
 * @property {CustomCount} total_time // seconds, 每一轮trial总时间
 * @property {boolean} is_attention_check
 * @property {boolean} is_comprehension_check
 */
/**
 * Creates a new Trial object with default values
 * @param {number} trial_id
 * @returns {Trial}
 */
export function createNewTrialData(
  trial_id,
  is_comprehension_check,
  is_attention_check
) {
  return {
    trial_id,
    create_time: getCurrentDate(),
    end_time: getCurrentDate(),
    accuracy: 0,
    ai_choice: [], // []Choice
    best_choice: [], // []Choice
    user_choice: [], // []Choice
    total_submission_num: 0,
    total_steps_num: 0,
    total_time: 0,
    is_comprehension_check: is_comprehension_check,
    is_attention_check: is_attention_check,
  };
}

/**
 * Updates experiment-level and user-level status after each trial.
 * Handles attention check results and final trial checks.
 *
 * @param {number} experiment
 * @param {number} curTrial
 * @param {string} userSolution - The user's selected solution.
 * @param {string} bestSolution - The correct or optimal solution.
 */
export function updateExperimentData(
  experiment,
  isComprehensionCheck,
  curTrial,
  userSolution
) {
  if (isComprehensionCheck) {
    return;
  }
  // Check if current trial is an attention check trial
  if (isAttentionCheck()) {
    const passed = userSolution.totalValueProp * 100 === 100;
    globalState.ATTENTION_CHECK_TRIALS[curTrial.trial_id] = passed;
    experiment.failed_attention_check_count = countFailedAttentionCheck();
  }

  // Check if this is the last trial of the main experiment
  const isLastTrial = curTrial.trial_id === globalState.NUM_MAIN_TRIALS;
  if (isLastTrial) {
    experiment.is_finished = true;

    // Mark the user's overall experiment pass status
    User.is_passed_all_experiments =
      experiment.is_finished &&
      experiment.failed_attention_check_count < getAttentionCheckTrialCount();
  }
}

/**
 * Updates the end info for the current trial
 * @param {Trial} trial - the current trial object
 * @param {Object} scores - { userScore: number, bestScore: number }
 */
export function updateTrialData(
  trial,
  userSolution,
  bestSolution,
  trialSec,
  isAfterAI
) {
  trial.end_time = getCurrentDate();
  trial.user_score = userSolution.totalValue;
  trial.best_score = bestSolution.totalValue;
  trial.performance = userSolution.totalValueProp * 100;

  recordBestChoiceData(trial, bestSolution);
  addToCustomCount(trial.total_time, trialSec, isAfterAI); // todo fsy: total time 的trialSec会一直累加
}

/**
 * Returns the current Trial object from User based on globalState.
 * @returns {Trial}
 */
export function getCurrentTrialData(isComprehensionCheck) {
  const currentExperiment = getCurrentExperimentData();
  if (!currentExperiment) {
    return null;
  }
  if (isComprehensionCheck) {
    // comprehension trials
    if (currentExperiment.comprehension_trials.length > 0) {
      return currentExperiment?.comprehension_trials[globalState.curTrial - 1];
    }
  } else {
    // regular trials
    if (currentExperiment.trials.length > 0) {
      return currentExperiment?.trials[globalState.curTrial - 1];
    }
  }
  return null;
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

/**
 * @typedef {Object} Choice
 * @property {string[]} choices
 * @property {number} accuracy
 * @property {'no_ai' | 'before_ai_show' | 'after_ai_show'} ai_assisted_flag
 * @property {number} correct_num
 * @property {number} steps
 * @property {number} time_spent
 */