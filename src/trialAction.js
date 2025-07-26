import {
  advanceTrial,
  canEndPhase,
  decrementSubmissions,
  getAIRevealCounts,
  getComprehensionTrialsNum,
  getCurPhase,
  getCurQuestionData,
  getCurQuestionIndex,
  getGlobalCurTrialIndex,
  getPerformance,
  getRevealedIndicesThisTrial,
  hasRevealedSol,
  incrementAskAICount,
  incrementSteps,
  isAllowedAskAITrials,
  isAttentionCheck,
  isComprehensionCheck,
  PHASE_NAME,
  recordRevealedIndicesThisTrial,
  remainingAskAICount,
  remainingSubmissions,
  resetAskAI,
  resetPhaseCurTrialIndex,
  resetSubmissionPerformance,
  resetSubmissions,
  resetTrialID,
  resetTrialPerformance,
  resetTrialSteps,
  setCurPhase,
  setHasRevealedSol,
  setPhaseTimerEnded,
  shouldEndAttentionCheck,
  shouldEndComprehensionCheck,
  shouldShowAttentionCheck,
  updatePerformanceAfterSubmission,
} from "./data/variable.js";
import {
  hideSubmissionResultContent,
  refreshInteractionState,
  showButtonTooltip,
  showResultContent,
  updateTotalPassMessage,
  updateUseAIMessage,
} from "./uiState.js";
import {
  highlightCorrectUserChice,
  renderAIChat,
  renderBoxesAndOptions,
  renderInstructions,
  renderStatements,
  updateAskAICost,
  updateSideLabels,
} from "./render.js";
import { evaluateAnswer, getUserAnswer } from "./utils.js";
import {
  clearAllTimers,
  getTimerValue,
  pauseTimer,
  restartTimer,
  resumeTimer,
  startTimer,
} from "./timer.js";
import {
  createNewExperimentData,
  createNewTrialData,
  getCurExperimentData,
  getCurPhaseTrialList,
  getCurTrialData,
  recordUserChoiceData,
  updateExperimentData,
  updateTrialData,
  User,
} from "./collectData.js";
import {
  showEndGameFailedComprehensionCheckPopUp,
  showEndTimePopUp,
  showEnterMainGamePopUp,
  showEnterPhase2,
  showEnterPhase3,
} from "./modal.js";
import {
  revealSolMessage,
  solutionLabel,
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

  const revealBtn = document.getElementById("reveal-sol-btn");
  revealBtn.addEventListener("click", showAnswers);
  revealBtn.addEventListener("mouseenter", () => {
    showRevealSolHint("mouseenter");
  });
  revealBtn.addEventListener("mouseleave", () => {
    showRevealSolHint("mouseleave");
  });
}

function showRevealSolHint(mode) {
  const revealSolBtn = document.getElementById("reveal-sol-btn");
  const isDisabled = revealSolBtn.classList.contains("disabled-visual");
  const isLocked = revealSolBtn.dataset.locked === "true";
  if (!isDisabled && !isLocked) {
    showButtonTooltip(
      "reveal-sol-tooltip",
      "Once clicked, you <strong>CANNOT</strong><br/>revise your answer or re-SUBMIT.",
      true,
      mode
    );
  } else if (mode == "mouseleave") {
    showButtonTooltip("reveal-sol-tooltip", "", true, mode);
  }
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
  let correctChoiceCnt, correctChoices, score;

  ({ correctChoiceCnt, correctChoices, score } = evaluateAnswer(
    userAns,
    getCurQuestionData().answer
  ));
  updateAfterSubmission(userAns, correctChoiceCnt, score, submissionTimeSec);
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

  refreshInteractionState({ forceEnableNext: true, justSubmitted: true });
  if (remainingSubmissions() == 0 && !hasRevealedSol()) {
    showAnswers(); // pop answers automatically
  }

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
  dbRecordTrial(
    performance,
    userAns,
    submissionTimeSec,
    trialTimeSec,
    true,
    getCurPhase()
  );

  /* end comprehension check trials */
  if (isComprehensionCheck()) {
    if (score !== 100 && remainingSubmissions() == 0) {
      showEndGameFailedComprehensionCheckPopUp();
      clearAllTimers();
    }
    if (
      score === 100 &&
      getGlobalCurTrialIndex() === getComprehensionTrialsNum()
    ) {
      User.is_passed_comprehension = true;
      proceedToNextPhase(); // pass comprehension check; enter phase 1
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

  /* record last trial data */
  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false, getCurPhase()); // Record last trial total time

  if (canEndPhase()) {
    await proceedToNextPhase();
    if (getCurPhase() == "") {
      return;
    }
  }

  /* start next trial */

  restartTimer("trial");
  restartTimer("submission");

  if (shouldEndAttentionCheck()) {
    resumeTimer(getCurPhase());
  }

  let answer = [];
  if (shouldShowAttentionCheck()) {
    pauseTimer(getCurPhase());
  }

  if (!advanceTrial(isAttentionCheck() || isComprehensionCheck())) return;
  console.log(
    `--Trail idx ${getGlobalCurTrialIndex()}--Question idx ${getCurQuestionIndex()}--Question id ${
      getCurQuestionData().question_id
    }--${getCurPhase()}--`
  );

  renderTrial(getCurQuestionData());

  answer = getCurQuestionData().answer;
  const questionId = getCurQuestionData().question_id;

  dbInitTrialData(questionId, answer); // Init next trial data
}

function initializeAfterNextTrial() {
  resetTrialSteps();
  resetAskAI();
  setHasRevealedSol(false);
  resetSubmissions();
  resetTrialPerformance();

  updateUseAIMessage();
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
    if (getCurPhase() === PHASE_NAME.COMPREHENSION_CHECK) {
      showEnterMainGamePopUp(() => {
        shouldEndComprehensionCheck();
        setCurPhase(PHASE_NAME.PHASE1);
        resetTrialID();
        resetPhaseCurTrialIndex();
        setPhaseTimerEnded(false);
        timeBox.style.display = "block";
        document.getElementById("timer").textContent = "08:00";
        startTimer(PHASE_NAME.PHASE1);
        nextTrial();
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE1) {
      showEnterPhase2(() => {
        setCurPhase(PHASE_NAME.PHASE2);
        resetPhaseCurTrialIndex();
        setPhaseTimerEnded(false);
        document.getElementById("timer").textContent = "20:00";
        startTimer(PHASE_NAME.PHASE2);
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE2) {
      showEnterPhase3(() => {
        setCurPhase(PHASE_NAME.PHASE3);
        resetPhaseCurTrialIndex();
        setPhaseTimerEnded(false);
        document.getElementById("timer").textContent = "08:00";
        startTimer(PHASE_NAME.PHASE3);
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE3) {
      handleTimeOut(); // todo fsy: after submit feedback
      setCurPhase("");
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

  dbRecordTrial(performance, [], 0, trialTimeSec, false, getCurPhase());
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
        ? "You’ve reached the hint limit for this problem."
        : "Please place all objects first.";
    if (!isAllowedAskAITrials()) {
      tooltipText = "AI help is not available for this problem.";
    }
    if (hasRevealedSol()) {
      tooltipText =
        "You already revealed the solutions.<br/>Please click NEXT PROBLEM to continue.";
    }
    if (remainingSubmissions() == 0) {
      tooltipText =
        "You're out of submissions.<br/>Please click NEXT PROBLEM to continue.";
    }
    showButtonTooltip("askAI-tooltip", tooltipText);
    return;
  }

  revealSolMessage.style.display = "none";

  const revealCount = getAIRevealCounts();
  const revealedObjects = getRandomAnsFromCorrectOrder(revealCount);

  incrementSteps();
  incrementAskAICount();
  updateAskAICost();
  refreshInteractionState({ forceDisableAskAI: true });

  const userMsg =
    `Randomly revealed ${revealCount} ` +
    (revealCount === 1 ? "object's location" : "objects' locations");
  appendChat("User", userMsg);

  setTimeout(() => {
    // 1. Hide all AI suggestions first
    const allSuggestions = document.querySelectorAll("[id^='solution-']");
    allSuggestions.forEach((el) => {
      el.style.visibility = "hidden";
    });
    solutionLabel.innerText = "AI suggestion";
    solutionLabel.style.visibility = "visible";

    // 2. Show only the revealed ones
    revealedObjects.forEach((obj) => {
      const el = document.getElementById(`solution-${obj.name}`);
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

  /* update db */
  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false, getCurPhase());
}

function showAnswers() {
  if (isComprehensionCheck() || isAttentionCheck()) {
    return;
  }

  const revealSolBtn = document.getElementById("reveal-sol-btn");
  const isDisabled = revealSolBtn.classList.contains("disabled-visual");
  if (isDisabled && revealSolBtn.dataset.locked === "true") {
    let tooltipText = "Available only right after you submit.";
    if (hasRevealedSol()) {
      tooltipText =
        "You already revealed the solutions.<br/>Please click NEXT PROBLEM to continue.";
    } else if (remainingSubmissions() == 0) {
      tooltipText =
        "You already answered correctly.<br/>Please click NEXT PROBLEM to continue.";
    }
    showButtonTooltip("reveal-sol-tooltip", tooltipText);
    return;
  }

  incrementSteps();
  setHasRevealedSol(true);

  setTimeout(() => {
    const allSoltions = document.querySelectorAll("[id^='solution-']");
    allSoltions.forEach((el) => {
      el.style.visibility = "hidden";
    });
    solutionLabel.innerText = "Correct answer";
    solutionLabel.style.visibility = "visible";

    // show all answers
    const answers = getCurQuestionData().answer;
    answers.forEach((ans) => {
      const el = document.getElementById(`solution-${ans}`);
      if (el) {
        el.style.visibility = "visible";
      }
    });

    // update correct options
    highlightCorrectUserChice();

    revealSolMessage.style.display = "block";
    refreshInteractionState();
  }, 0);

  /* update db */
  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false, getCurPhase);
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
  updateTotalPassMessage();
  hideSubmissionResultContent();
  document.getElementById("reveal-sol-btn").style.display =
    isComprehensionCheck() ? "none" : "block";
  initializeAfterNextTrial();
}

/*
 ********************************************
 * Database
 ********************************************
 */
function dbInitExperimentData() {
  const newExperiment = createNewExperimentData();
  User.experiments[getCurPhase()] = newExperiment;
}

function dbInitTrialData(questionId, answer) {
  if (!getCurExperimentData()) {
    // Initialize experiment if it doesn't exist
    dbInitExperimentData();
  }

  const isComprehension = isComprehensionCheck();
  const isAttention = isAttentionCheck();

  let trialId;
  if (isComprehension) {
    trialId = getGlobalCurTrialIndex();
  } else if (isAttention) {
    trialId = "attention check";
  } else {
    trialId = getCurQuestionIndex();
  }

  // Check if trial already exists (for comprehension trials only)
  if (
    isComprehension &&
    getCurPhaseTrialList().some((t) => t.trial_id === trialId)
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

  getCurPhaseTrialList().push(newTrial);
}

export function dbRecordTrial(
  performance,
  userAns = [],
  submissionTimeSec = 0,
  trialTimeSec = 0,
  isSubmission = false,
  phaseKey
) {
  const curExperiment = getCurExperimentData();
  const lastTrial = getCurTrialData();

  if (!lastTrial) return;

  if (isSubmission && userAns.length > 0 && submissionTimeSec != 0) {
    // Add submission-level user choice if provided
    recordUserChoiceData(lastTrial, userAns, performance, submissionTimeSec);
  }

  // Always update trial-level summary
  updateTrialData(lastTrial, performance, trialTimeSec, isSubmission);

  // Update experiment-level tracking
  updateExperimentData(curExperiment, performance);

  // Save to Firestore
  import("./firebase/saveData2Firebase.js").then((module) => {
    module.saveSingleTrial(curExperiment, lastTrial, phaseKey);
  });
}
