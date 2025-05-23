import {
  getCurQuestionData,
  advanceTrial,
  getCurTrialId,
  incrementSteps,
  resetTrialSteps,
  updatePerformanceAfterSubmission,
  getPerformance,
  remainingSubmissions,
  decrementSubmissions,
  resetSubmissions,
  shouldShowAttentionCheck,
  checkEndAttentionCheck,
  isAttentionCheck,
  isComprehensionCheck,
  resetSubmissionPerformance,
  shouldEndAttentionCheck,
} from "./data/variable.js";
import {
  refreshInteractionState,
  showResultContent,
  hideResultContent,
} from "./uiState.js";
import { bindDragDropEvents } from "./dragDrop.js";
import { getUserAnswer, evaluateAnswer, addPxAndRem } from "./utils.js";
import {
  startTimer,
  resetTimer,
  pauseTimer,
  resumeTimer,
  getTimerValue,
} from "./timer.js";
import { User } from "./collectData.js";
import {
  createNewExperimentData,
  createNewTrialData,
  getCurExperimentData,
  getCurTrialData,
  recordUserChoiceData,
  updateExperimentData,
  updateTrialData,
} from "./collectData.js";

const attentionTrial = {
  answer: ["A", "B", "C", "D", "E"],
  options: ["A", "B", "C", "D", "E"],
  statements: ["This is an attention check.", "Answer: A, B, C, D, E"],
  front_end: ["front", "end"],
};

export function bindTrialButtons() {
  document.getElementById("submit-btn").addEventListener("click", submitTrial);
  document.getElementById("reset-btn").addEventListener("click", resetTrial);
  document.getElementById("next-btn").addEventListener("click", nextTrial);
}

/*
 ********************************************
 * Submit Trial
 ********************************************
 */
function submitTrial() {
  if (remainingSubmissions() <= 0) return;

  const userAns = getUserAnswer();
  let correctChoice, score;

  if (isAttentionCheck()) {
    ({ correctChoice, score } = evaluateAnswer(userAns, attentionTrial.answer));
  } else {
    ({ correctChoice, score } = evaluateAnswer(
      userAns,
      getCurQuestionData().answer
    ));
  }

  updateAfterSubmission(userAns, correctChoice, score);
}

function updateAfterSubmission(userAns, correctChoice, score) {
  incrementSteps();
  decrementSubmissions(score);
  updatePerformanceAfterSubmission(correctChoice, score);
  showResultContent();
  updateRemainingSubmissionInfo();

  refreshInteractionState({ forceEnableNext: true });

  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  resetSubmissionPerformance();
  resetTimer("submission");
  startTimer("submission");

  /* database */
  dbRecordTrial(performance, userAns, submissionTimeSec, trialTimeSec, true);
}

function updateRemainingSubmissionInfo() {
  const count = document.getElementById("submission-count");
  if (count) count.textContent = remainingSubmissions();
}

/*
 ********************************************
 * Reset Trial
 ********************************************
 */
function resetTrial() {
  const current = getCurQuestionData();
  clearBoxes();
  renderBoxesAndOptions(current.options, current.style);
  initializeAfterReset();
}

function clearBoxes() {
  document.querySelectorAll(".box").forEach((box) => (box.innerHTML = ""));
}

function initializeAfterReset() {
  incrementSteps();
  refreshInteractionState();
}

/*
 ********************************************
 * Next Trial
 ********************************************
 */
export function nextTrial() {
  /* initial database */
  if (User.experiments.length === 0) {
    // Initialize experiment if it doesn't exist
    dbInitExperimentData();
  }

  dbRecordTrial(getPerformance()); // Record last trial data

  if (shouldEndAttentionCheck()) {
    resumeTimer("global");
  }

  let answer = [];
  if (shouldShowAttentionCheck()) {
    pauseTimer("global");
    advanceTrial(true);
    renderTrial(attentionTrial);
    answer = attentionTrial.answer;
  } else {
    if (!advanceTrial()) return;
    renderTrial(getCurQuestionData());
    answer = getCurQuestionData().answer;
  }

  dbInitTrialData(answer); // Init next trial data
}

function initializeAfterNextTrial() {
  hideResultContent();
  resetTrialSteps();
  resetSubmissions();
  resetSubmissionPerformance();
  updateRemainingSubmissionInfo();

  refreshInteractionState();

  resetTimer("trial");
  resetTimer("submission");
  startTimer("trial");
  startTimer("submission");
}

/*
 ********************************************
 * Render
 ********************************************
 */
function renderTrial(trial) {
  renderBoxesAndOptions(trial.options, trial.style);
  renderStatements(trial.statements);
  updateSideLabels(trial.front_end);
  initializeAfterNextTrial();
}

function renderBoxesAndOptions(options, style = []) {
  if (isAttentionCheck()) {
    document.getElementById("trialID").textContent = "ATTENTION CHECK Trial";
  } else {
    document.getElementById("trialID").textContent = "Trial " + getCurTrialId();
  }

  const optionContainer = document.getElementById("option-container");
  const boxContainer = document.getElementById("box-container");
  const labelContainer = document.getElementById("label-container");

  optionContainer.innerHTML = "";
  boxContainer.innerHTML = "";
  labelContainer.innerHTML = "";

  // Step 1: Create invisible options to measure true max width
  const tempOptions = options.map((id, i) => {
    const option = document.createElement("div");
    option.className = "option";
    option.style.position = "absolute";
    option.style.visibility = "hidden";
    option.textContent = id;
    document.body.appendChild(option);
    return option;
  });

  // Step 2: Measure max height
  const maxHeight = Math.max(
    ...tempOptions.map((el) => el.getBoundingClientRect().height)
  );

  // Step 3: Clean up temp elements
  tempOptions.forEach((el) => el.remove());

  // Step 4: Render visible elements using maxWidth
  options.forEach((id, i) => {
    const pattern = style[i] || "blank";

    const option = document.createElement("div");
    option.className = "option";
    option.draggable = true;
    option.id = id;
    option.textContent = id;
    option.dataset.pattern = pattern;
    applyPatternStyle(option, pattern);
    option.style.height = `${maxHeight}px`;
    optionContainer.appendChild(option);

    const box = document.createElement("div");
    box.className = "box";
    box.style.height = addPxAndRem(maxHeight, 1);
    console.log("maxHeight:", maxHeight, "boxHeight:", box.style.height);
    boxContainer.appendChild(box);

    const label = document.createElement("div");
    label.className = "label";
    label.textContent = i + 1;
    labelContainer.appendChild(label);
  });

  bindDragDropEvents();
}

function applyPatternStyle(element, pattern) {
  const base = {
    blank: "lightblue",
    "dotted circles":
      "repeating-radial-gradient(circle, lightblue, lightblue 5px, white 5px, white 10px)",
    "horizontal lines":
      "repeating-linear-gradient(to bottom, lightblue, lightblue 5px, white 5px, white 10px)",
    "vertical lines":
      "repeating-linear-gradient(to right, lightblue, lightblue 5px, white 5px, white 10px)",
    "diagonal stripes":
      "repeating-linear-gradient(45deg, lightblue, lightblue 5px, white 5px, white 10px)",
    "horizontal stripes": `
  repeating-linear-gradient(to right, transparent 0 8px, lightblue 8px 16px),
  repeating-linear-gradient(to bottom, transparent 0 8px, lightblue 8px 16px)
`,
  };

  element.style.background = base[pattern] || base["blank"];
}

function renderStatements(statements) {
  const list = document.querySelector("#statement-box ul");
  list.innerHTML = statements.map((s) => `<li>${s}</li>`).join("");
}

function updateSideLabels(front_end) {
  const leftLabel = document.getElementById("left-side-label");
  const rightLabel = document.getElementById("right-side-label");

  if (Array.isArray(front_end) && front_end.length === 2) {
    leftLabel.textContent = front_end[0];
    rightLabel.textContent = front_end[1];
  } else {
    // fallback if parsing fails
    leftLabel.textContent = "front";
    rightLabel.textContent = "end";
  }
}

/*
 ********************************************
 * Database
 ********************************************
 */
function dbInitExperimentData() {
  const newExperiment = createNewExperimentData();
  User.experiments.push(newExperiment);
}

function dbInitTrialData(answer) {
  if (User.experiments.length === 0) {
    // Initialize experiment if it doesn't exist
    dbInitExperimentData();
  }

  const trialId = getCurTrialId();
  const isComprehension = isComprehensionCheck();
  const isAttention = isAttentionCheck();
  const curExp = User.experiments[0];

  // Check if trial already exists (for comprehension trials only)
  if (
    isComprehension &&
    curExp.comprehension_trials.some((t) => t.trial_id === trialId)
  ) {
    return; // Trial already exists, do not re-add
  }

  const newTrial = createNewTrialData(
    trialId,
    answer,
    isComprehension,
    isAttention
  );

  if (isComprehension) {
    curExp.comprehension_trials.push(newTrial);
  } else {
    curExp.trials.push(newTrial);
  }
}

function dbRecordTrial(
  performance,
  userAns = [],
  submissionTimeSec = 0,
  trialTimeSec = 0,
  isSubmission = false
) {
  const curExperiment = getCurExperimentData();
  const lastTrial = getCurTrialData(isComprehensionCheck());

  if (!lastTrial) return;

  console.log("performance: ", performance);
  if (isSubmission && userAns.length > 0 && submissionTimeSec != 0) {
    // Add submission-level user choice if provided
    recordUserChoiceData(lastTrial, userAns, performance, submissionTimeSec);
  }

  // Always update trial-level summary
  updateTrialData(lastTrial, performance, trialTimeSec);

  // Update experiment-level tracking
  updateExperimentData(curExperiment, isComprehensionCheck(), lastTrial);

  // Save to Firestore
  import("./firebase/saveData2Firebase.js").then((module) => {
    module.saveSingleTrial(curExperiment, lastTrial);
  });
}
