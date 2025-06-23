import {
  getCurQuestionData,
  advanceTrial,
  getCurTrialIndex,
  incrementSteps,
  resetTrialSteps,
  updatePerformanceAfterSubmission,
  getPerformance,
  remainingSubmissions,
  decrementSubmissions,
  resetSubmissions,
  shouldShowAttentionCheck,
  isAttentionCheck,
  isComprehensionCheck,
  resetSubmissionPerformance,
  shouldEndAttentionCheck,
  getSubmissionLimit,
  getComprehensionTrialsNum,
  resetTrialID,
  shouldEndComprehensionCheck,
  getCurQuestionId,
  resetTrialPerformance,
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
  restartTimer,
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
import {
  showEndGameFailedComprehensionCheckPopUp,
  showEnterMainGamePopUp,
} from "./modal.js";
import { timeBox } from "./data/domElements.js";

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

  const submissionTimeSec = getTimerValue("submission"); // once submit, recore submission interval

  const userAns = getUserAnswer();
  let correctChoice, score;

  ({ correctChoice, score } = evaluateAnswer(
    userAns,
    getCurQuestionData().answer
  ));
  updateAfterSubmission(userAns, correctChoice, score, submissionTimeSec);
}

function updateAfterSubmission(
  userAns,
  correctChoice,
  score,
  submissionTimeSec
) {
  incrementSteps();
  decrementSubmissions(score);
  updatePerformanceAfterSubmission(correctChoice, score);
  showResultContent();
  updateRemainingSubmissionInfo();

  refreshInteractionState({ forceEnableNext: true });

  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const trialTimeSec = getTimerValue("trial");
  // console.log(
  //   "updateAfterSubmission:",
  //   "submissionTimeSec:",
  //   submissionTimeSec,
  //   "trialTimeSec:",
  //   trialTimeSec
  // );
  // console.log("performance:", performance);

  resetSubmissionPerformance();
  restartTimer("submission"); // restart submission timer

  /* database */
  dbRecordTrial(performance, userAns, submissionTimeSec, trialTimeSec, true);

  /* end comprehension check trials */
  if (isComprehensionCheck()) {
    if (score !== 100 && remainingSubmissions() == 0) {
      showEndGameFailedComprehensionCheckPopUp();
      clearAllTimers();
    }
    if (score === 100 && getCurTrialIndex() === getComprehensionTrialsNum()) {
      // pass comprehension trials
      resetTrialID();
      shouldEndComprehensionCheck();
      showEnterMainGamePopUp();
      User.is_passed_comprehension = true;
    }
  }
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

  /* start global timer */
  if (!isComprehensionCheck() && timeBox.style.display === "none") {
    timeBox.style.display = "block";
    startTimer("global");
  } else if (isComprehensionCheck()) {
    timeBox.style.display = "none";
  }

  /* record last trial data */
  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  restartTimer("trial");
  restartTimer("submission");

  dbRecordTrial(performance, [], 0, trialTimeSec, false); // Record last trial total time

  /* start next trial */
  if (shouldEndAttentionCheck()) {
    resumeTimer("global");
  }

  let answer = [];
  if (shouldShowAttentionCheck()) {
    pauseTimer("global");
  }

  if (!advanceTrial(isAttentionCheck() || isComprehensionCheck())) return;
  renderTrial(getCurQuestionData());

  answer = getCurQuestionData().answer;
  const questionId = getCurQuestionData().question_id;

  dbInitTrialData(questionId, answer); // Init next trial data
}

function initializeAfterNextTrial() {
  hideResultContent();
  resetTrialSteps();
  resetSubmissions();
  resetTrialPerformance();
  updateRemainingSubmissionInfo();

  refreshInteractionState();
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
  const submitLimit = getSubmissionLimit();

  if (isAttentionCheck()) {
    instruction = `<p>
      This is the attention check trial.<br/>
      The timer is paused for this trial.<br/>
      You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.<br/>
      You need to score 100 to pass this trial.<br/>
      If you fail the attention check, you will not get the bonus payment regardless of your overall performance. 
    </p>`;
  } else if (isComprehensionCheck()) {
    instruction = `<p>
      This is a comprehension check trial.<br/>
      You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.<br/>
      You need to score 100 to pass this trial.<br/>
      If you fail this trial twice, the experiment ends automatically. 
    </p>`;
  } else {
    instruction = `<p>
        ${instructionText}<br/>
        You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.<br/>
        Maximize your score with minimal time.
      </p>`;
  }

  document.getElementById("instruction-text").innerHTML = instruction;
}

function renderBoxesAndOptions(options, style = []) {
  if (isAttentionCheck()) {
    document.getElementById("trialID").textContent = "ATTENTION CHECK Trial";
  } else {
    document.getElementById("trialID").textContent =
      "Trial " +
      (isComprehensionCheck() ? getCurTrialIndex() : getCurQuestionId());
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

function dbInitTrialData(questionId, answer) {
  if (User.experiments.length === 0) {
    // Initialize experiment if it doesn't exist
    dbInitExperimentData();
  }

  const isComprehension = isComprehensionCheck();
  const isAttention = isAttentionCheck();
  const curExp = User.experiments[0];

  let trialId;
  if (isComprehension) {
    trialId = getCurTrialIndex();
  } else if (isAttention) {
    trialId = "attention check";
  } else {
    trialId = getCurQuestionId();
  }

  // Check if trial already exists (for comprehension trials only)
  if (
    isComprehension &&
    curExp.comprehension_trials.some((t) => t.trial_id === trialId)
  ) {
    return; // Trial already exists, do not re-add
  }

  const newTrial = createNewTrialData(
    trialId,
    questionId,
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

export function dbRecordTrial(
  performance,
  userAns = [],
  submissionTimeSec = 0,
  trialTimeSec = 0,
  isSubmission = false
) {
  const curExperiment = getCurExperimentData();
  const lastTrial = getCurTrialData(isComprehensionCheck());

  if (!lastTrial) return;

  if (isSubmission && userAns.length > 0 && submissionTimeSec != 0) {
    // Add submission-level user choice if provided
    recordUserChoiceData(lastTrial, userAns, performance, submissionTimeSec);
  }

  // Always update trial-level summary
  updateTrialData(lastTrial, performance, trialTimeSec, isSubmission);

  // Update experiment-level tracking
  updateExperimentData(curExperiment, performance, isComprehensionCheck());

  // Save to Firestore
  import("./firebase/saveData2Firebase.js").then((module) => {
    module.saveSingleTrial(curExperiment, lastTrial);
  });
}
