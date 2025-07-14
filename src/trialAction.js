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
  getCurQuestionIndex,
  resetTrialPerformance,
  getAIRevealCounts,
  remainingAskAICount,
  resetAskAI,
  PHASE_NAME,
  getCurPhase,
  incrementCurrentPhaseTrialCount,
  canEndPhase,
  setCurPhase,
  resetCurrentPhaseTrialCount,
  setPhaseTimerEnded,
  isAllowedAskAITrials,
  incrementAskAICount,
  getRevealedIndicesThisTrial,
  recordRevealedIndicesThisTrial,
  phaseState,
} from "./data/variable.js";
import {
  refreshInteractionState,
  showResultContent,
  hideResultContent,
  updateUseAIMessage,
} from "./uiState.js";
import { bindDragDropEvents } from "./dragDrop.js";
import {
  getUserAnswer,
  evaluateAnswer,
  addPxAndRem,
  escapeRegExp,
} from "./utils.js";
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
  showEndTimePopUp,
  showEnterPhase2,
  showEnterPhase3,
} from "./modal.js";
import {
  centerPanel,
  leftPanel,
  rightPanel,
  timeBox,
} from "./data/domElements.js";
import { disableDrag } from "./dragDrop.js";

export function bindTrialButtons() {
  document.getElementById("submit-btn").addEventListener("click", submitTrial);
  document.getElementById("reset-btn").addEventListener("click", resetTrial);
  document.getElementById("next-btn").addEventListener("click", nextTrial);
  document
    .getElementById("askAI-btn")
    .addEventListener("click", showAskAIAnswers);
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
  clearBoxes();
  renderBoxesAndOptions(getCurQuestionData());
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
export async function nextTrial() {
  /* initial database */
  if (User.experiments.length === 0) {
    // Initialize experiment if it doesn't exist
    dbInitExperimentData();
  }

  /* start global timer */
  if (!isComprehensionCheck() && timeBox.style.display === "none") {
    timeBox.style.display = "block";
    startTimer(PHASE_NAME.PHASE1);
  } else if (isComprehensionCheck()) {
    timeBox.style.display = "none";
  }

  /* complete last trial */
  if (getCurTrialIndex() > 0) {
    /* record last trial data */
    const performance = JSON.parse(JSON.stringify(getPerformance()));
    const submissionTimeSec = getTimerValue("submission");
    const trialTimeSec = getTimerValue("trial");

    incrementCurrentPhaseTrialCount();
    restartTimer("trial");
    restartTimer("submission");

    dbRecordTrial(performance, [], 0, trialTimeSec, false); // Record last trial total time

    if (canEndPhase()) {
      await proceedToNextPhase();
      if (getCurPhase() == PHASE_NAME.PHASE3) {
        return;
      }
    }
  }

  /* start next trial */
  if (shouldEndAttentionCheck()) {
    resumeTimer(getCurPhase());
  }

  let answer = [];
  if (shouldShowAttentionCheck()) {
    pauseTimer(getCurPhase());
  }

  if (!advanceTrial(isAttentionCheck() || isComprehensionCheck())) return;
  console.log(
    `--Trail idx ${getCurTrialIndex()}--Question idx ${getCurQuestionIndex()}--Question id ${
      getCurQuestionData().question_id
    }--`
  );
  console.log("phaseIndexMap", phaseState.phaseIndexMap);

  renderTrial(getCurQuestionData());

  answer = getCurQuestionData().answer;
  const questionId = getCurQuestionData().question_id;

  dbInitTrialData(questionId, answer); // Init next trial data
}

function initializeAfterNextTrial() {
  hideResultContent();
  resetTrialSteps();
  resetAskAI();
  resetSubmissions();
  resetTrialPerformance();
  updateRemainingSubmissionInfo();

  refreshInteractionState();
}

/*
 ********************************************
 * Phase switch
 ********************************************
 */
export function proceedToNextPhase() {
  return new Promise((resolve) => {
    if (getCurPhase() === PHASE_NAME.PHASE1) {
      showEnterPhase2(() => {
        setCurPhase(PHASE_NAME.PHASE2);
        resetCurrentPhaseTrialCount();
        setPhaseTimerEnded(false);
        startTimer(PHASE_NAME.PHASE2);
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE2) {
      showEnterPhase3(() => {
        setCurPhase(PHASE_NAME.PHASE3);
        resetCurrentPhaseTrialCount();
        setPhaseTimerEnded(false);
        startTimer(PHASE_NAME.PHASE3);
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE3) {
      handleTimeOut(); // todo fsy: after submit feedback
      resolve();
    } else {
      resolve(); // fallback
    }
  });
}

function handleTimeOut() {
  // disbale all buttons
  document.getElementById("submit-btn").disabled = true;
  document.getElementById("reset-btn").disabled = true;
  document.getElementById("next-btn").disabled = true;

  // disable drag
  disableDrag();

  // end game and show feedback page
  showEndTimePopUp();

  pauseTimer("submission");
  pauseTimer("trial");

  // update db
  const curExperiment = getCurExperimentData();
  curExperiment.is_finished = true;
  User.is_passed_all_experiments = User.is_passed_attention_check;

  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false);
}

/*
 ********************************************
 * AI Answers
 ********************************************
 */
function getRandomAnsFromCorrectOrder(count) {
  const answers = getCurQuestionData().answer;
  const totalCount = answers.length;

  if (count === 1) {
    // ensure no repeats until all have been revealed
    const availableIndices = [...Array(totalCount).keys()].filter(
      (i) => !getRevealedIndicesThisTrial().has(i)
    );

    const chosenIndex =
      availableIndices[Math.floor(Math.random() * availableIndices.length)];

    recordRevealedIndicesThisTrial(chosenIndex);

    return [
      {
        name: answers[chosenIndex],
        pos: chosenIndex + 1,
      },
    ];
  }

  // count > 1: allow repeats, but still track them
  const shuffled = [...Array(totalCount).keys()]
    .sort(() => 0.5 - Math.random())
    .slice(0, count);

  // record revealed indices
  shuffled.forEach((i) => recordRevealedIndicesThisTrial(i));

  return shuffled.map((i) => ({
    name: answers[i],
    pos: i + 1,
  }));
}

function appendChat(sender, message) {
  const chatBox = document.getElementById("ai-chat");
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble");
  bubble.classList.add(sender.toLowerCase()); // 'ai' or 'user'

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = sender === "AI" ? "🤖" : "😃";

  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `${message}`;

  bubble.appendChild(avatar);
  bubble.appendChild(msg);
  chatBox.appendChild(bubble);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function showAskAIAnswers() {
  const askAIBtn = document.getElementById("askAI-btn");
  if (askAIBtn.dataset.locked === "true") {
    let tooltipText =
      remainingAskAICount() <= 0
        ? "You’ve reached the hint limit for this trial."
        : "Please place all objects first.";
    if (!isAllowedAskAITrials()) {
      tooltipText = "AI help is not available for this trial.";
    }
    showAskAITooltip(tooltipText);
    return;
  }

  const revealCount = getAIRevealCounts();
  const revealedObjects = getRandomAnsFromCorrectOrder(revealCount);

  incrementAskAICount();
  refreshInteractionState({ forceDisableAskAI: true });

  const userMsg =
    `Randomly revealed ${revealCount} ` +
    (revealCount === 1 ? "object's location" : "objects' locations");
  appendChat("User", userMsg);

  setTimeout(() => {
    // 1. Hide all AI suggestions first
    const allSuggestions = document.querySelectorAll("[id^='ai-suggestion-']");
    allSuggestions.forEach((el) => {
      el.style.visibility = "hidden";
    });

    // 2. Show only the revealed ones
    revealedObjects.forEach((obj) => {
      const el = document.getElementById(`ai-suggestion-${obj.name}`);
      if (el) {
        el.style.visibility = "visible";
      }
    });

    // 3. Append chat
    const aiResponse = revealedObjects
      .map(
        (obj) =>
          `<strong>${obj.name}</strong> is at <strong>${obj.pos}</strong>.`
      )
      .join("<br/>");
    appendChat("AI", aiResponse);

    refreshInteractionState();
  }, 500);

  updateUseAIMessage();
}

function showAskAITooltip(message) {
  const tooltip = document.getElementById("askAITooltip");
  tooltip.textContent = message;
  tooltip.style.display = "block";
  tooltip.style.opacity = "1";

  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => {
      tooltip.style.display = "none";
    }, 300);
  }, 1000);
}

/*
 ********************************************
 * Render
 ********************************************
 */
function renderTrial(trial) {
  renderInstructions(trial.instruction);
  renderAIChat();
  renderBoxesAndOptions(trial);
  renderStatements(trial.statements, trial.answer);
  updateSideLabels(trial.front_end);
  initializeAfterNextTrial();
}

function renderInstructions(instructionText) {
  let instruction;
  const submitLimit = getSubmissionLimit();

  if (isAttentionCheck()) {
    instruction = `<p>
      This is the attention check trial.</p>
      <p>The timer is paused for this trial.</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.</p>
      <p>You need to score 100 to pass this trial.</p>
      <p>If you fail the attention check, you will not get the bonus payment regardless of your overall performance.</p>`;
  } else if (isComprehensionCheck()) {
    instruction = `<p>This is a comprehension check trial.</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.</p>
      <p>You need to score 100 to pass this trial.</p>
      <p>If you fail this trial twice, the experiment ends automatically.</p>`;
  } else {
    instruction = `<p>${instructionText}</p>
      <p>You have <span id="submission-count" style="color:brown;">${submitLimit}</span> submission(s) remaining for this trial.</p>
      <p>Maximize your score with minimal time.</p>`;
  }

  document.getElementById("instruction-text").innerHTML = instruction;
}

function renderAIChat() {
  if (!isAllowedAskAITrials()) {
    leftPanel.style.display = "none";
    return;
  }

  leftPanel.style.display = "flex";
  document.getElementById("askAI-btn").textContent =
    `Reveal ${getAIRevealCounts()} ` +
    (getAIRevealCounts() === 1 ? "object's location" : "objects' locations");

  const chatBox = document.getElementById("ai-chat");
  chatBox.innerHTML = "";
  const initialBubble = document.createElement("div");
  initialBubble.classList.add("chat-bubble", "ai");

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🤖";

  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `<strong>AI:</strong> How can I help?`;

  initialBubble.appendChild(avatar);
  initialBubble.appendChild(msg);
  chatBox.appendChild(initialBubble);
}

function renderBoxesAndOptions(questionData) {
  const options = questionData.options;
  const style = questionData.style;

  if (isAttentionCheck()) {
    document.getElementById("trialID").textContent = "ATTENTION CHECK Trial";
  } else {
    document.getElementById("trialID").textContent =
      "Trial " +
      (isComprehensionCheck() ? getCurTrialIndex() : getCurQuestionIndex());
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
  options.forEach((optionText, i) => {
    // Top label: 1, 2, ...
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = i + 1;
    labelContainer.appendChild(label);

    // Option
    const option = document.createElement("div");
    option.className = "option";
    option.id = optionText;
    option.textContent = optionText;
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

  if (isAllowedAskAITrials()) {
    const answer = questionData.answer;
    const sortedStyle = questionData.sortedStyle;

    const aiSuggestionsContainer = document.getElementById(
      "ai-suggestion-container"
    );
    aiSuggestionsContainer.innerHTML = "";
    answer.forEach((ans, i) => {
      const aiAns = document.createElement("div");
      aiAns.className = "ai-suggestion";
      aiAns.id = `ai-suggestion-${ans}`;
      aiAns.textContent = ans;
      aiAns.style.visibility = "hidden";
      applyPatternStyle(aiAns, sortedStyle[i] || "blank");
      aiAns.style.height = `${maxHeight}px`;
      aiSuggestionsContainer.appendChild(aiAns);
    });
  }

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

function renderStatements(statements, answers) {
  const list = document.querySelector("#statement-box ul");

  const rendered = statements.map((s) => {
    let highlighted = s;
    answers.forEach((answer) => {
      const regex = new RegExp(`\\b${escapeRegExp(answer)}\\b`, "gi");
      highlighted = highlighted.replace(
        regex,
        (match) => `<strong>${match}</strong>`
      );
    });
    return `<li>${highlighted}</li>`;
  });

  list.innerHTML = rendered.join("");
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
    trialId = getCurQuestionIndex();
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
