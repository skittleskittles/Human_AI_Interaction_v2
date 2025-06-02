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
  getObjCount,
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

const attentionTrial =
  getObjCount() === 5
    ? {
        answer: ["A", "B", "C", "D", "E"],
        options: ["A", "B", "C", "D", "E"],
        statements: [
          "C is at position 3",
          "A is at position 1",
          "D is at position 4",
          "B is at position 2",
          "E is at position 5",
        ],
        front_end: ["front", "end"],
      }
    : {
        answer: ["A", "B", "C", "D", "E", "F"],
        options: ["A", "B", "C", "D", "E", "F"],
        statements: [
          "C is at position 3",
          "A is at position 1",
          "D is at position 4",
          "B is at position 2",
          "E is at position 5",
          "F is at position 6",
        ],
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
  renderInstructions(trial.instruction);
  renderBoxesAndOptions(trial.options, trial.style);
  renderStatements(trial.statements);
  updateSideLabels(trial.front_end);
  initializeAfterNextTrial();
}

function renderInstructions(instructionText) {
  let instruction;

  if (isAttentionCheck()) {
    instruction = `<p>
      This is the attention check trial.<br/>
      The timer is paused for this trial.<br/>
      You have <span id="submission-count">3</span> submission(s) remaining for this trial.<br/>
      You need to score 100 to pass this trial.<br/>
      If you fail the attention check, you will not get the bonus payment regardless of your overall performance. 
    </p>`;
  } else {
    instruction = `<p>
        ${instructionText}<br/>
        You have <span id="submission-count">3</span> submission(s) remaining for this trial.<br/>
        Maximize your score with minimal time.
      </p>`;
  }

  document.getElementById("instruction-text").innerHTML = instruction;
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

  // Step 1: Measure option height
  const tempOptions = options.map((id) => {
    const el = document.createElement("div");
    el.className = "option";
    el.style.position = "absolute";
    el.style.visibility = "hidden";
    el.textContent = id;
    document.body.appendChild(el);
    return el;
  });

  const maxHeight = Math.max(
    ...tempOptions.map((el) => el.getBoundingClientRect().height)
  );
  tempOptions.forEach((el) => el.remove());

  // Step 2: Render options and boxes
  options.forEach((id, i) => {
    // Top label: 1, 2, ...
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = i + 1;
    labelContainer.appendChild(label);

    // Option
    const option = document.createElement("div");
    option.className = "option";
    option.draggable = true;
    option.id = id;
    option.textContent = id;
    option.dataset.pattern = style[i] || "blank";
    applyPatternStyle(option, style[i] || "blank");
    option.style.height = `${maxHeight}px`;
    optionContainer.appendChild(option);

    // Box + optional front/end label
    const boxGroup = document.createElement("div");
    boxGroup.className = "box-group";

    const box = document.createElement("div");
    box.className = "box";
    box.style.height = addPxAndRem(maxHeight, 1);
    boxGroup.appendChild(box);

    if (i === 0 || i === options.length - 1) {
      const label = document.createElement("div");
      label.className = "side-label-under";
      label.id = i === 0 ? "front-label-under" : "end-label-under";
      label.textContent = i === 0 ? "front" : "end"; // default
      boxGroup.appendChild(label);
    }

    boxContainer.appendChild(boxGroup);
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
  const frontLabel = document.getElementById("front-label-under");
  const endLabel = document.getElementById("end-label-under");

  if (Array.isArray(front_end) && front_end.length === 2) {
    if (frontLabel) frontLabel.textContent = front_end[0];
    if (endLabel) endLabel.textContent = front_end[1];
  } else {
    if (frontLabel) frontLabel.textContent = "front";
    if (endLabel) endLabel.textContent = "end";
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
