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
  setHasRevealedSol,
  hasRevealedSol,
} from "./data/variable.js";
import {
  refreshInteractionState,
  showResultContent,
  hideSubmissionResultContent,
  updateUseAIMessage,
  updateTotalPassMessage,
  showButtonTooltip,
} from "./uiState.js";
import {
  highlightCorrectUserChice,
  renderAIChat,
  renderBoxesAndOptions,
  renderInstructions,
  renderStatements,
  updateSideLabels,
} from "./render.js";
import { getUserAnswer, evaluateAnswer } from "./utils.js";
import {
  startTimer,
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
  document
    .getElementById("reveal-sol-btn")
    .addEventListener("click", showAnswers);
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
    // cur trial is not the first trial
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
  } else {
    restartTimer("trial");
    restartTimer("submission");
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
    if (getCurPhase() === PHASE_NAME.PHASE1) {
      showEnterPhase2(() => {
        setCurPhase(PHASE_NAME.PHASE2);
        resetCurrentPhaseTrialCount();
        setPhaseTimerEnded(false);
        document.getElementById("timer").textContent = "20:00";
        startTimer(PHASE_NAME.PHASE2);
        nextTrial();
        resolve();
      });
    } else if (getCurPhase() === PHASE_NAME.PHASE2) {
      showEnterPhase3(() => {
        setCurPhase(PHASE_NAME.PHASE3);
        resetCurrentPhaseTrialCount();
        setPhaseTimerEnded(false);
        document.getElementById("timer").textContent = "08:00";
        startTimer(PHASE_NAME.PHASE3);
        nextTrial();
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
    if (hasRevealedSol()) {
      tooltipText =
        "You already revealed the solutions.<br/>Please click NEXT TRIAL to continue.";
    }
    showButtonTooltip("askAI-tooltip", tooltipText);
    return;
  }

  revealSolMessage.style.display = "none";

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

  dbRecordTrial(performance, [], 0, trialTimeSec, false); // todo fsy
}

function showAnswers() {
  const revealSolBtn = document.getElementById("reveal-sol-btn");
  if (revealSolBtn.dataset.locked === "true") {
    let tooltipText =
      "You already answered correctly.<br/>Please click NEXT TRIAL to continue.";
    if (hasRevealedSol()) {
      tooltipText =
        "You already revealed the solutions.<br/>Please click NEXT TRIAL to continue.";
    } else if (getPerformance().submissionCount < 1) {
      tooltipText = "You need to at least SUBMIT once";
    }
    showButtonTooltip("reveal-sol-tooltip", tooltipText);
    return;
  }

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
  }, 500);

  /* update db */
  const performance = JSON.parse(JSON.stringify(getPerformance()));
  const submissionTimeSec = getTimerValue("submission");
  const trialTimeSec = getTimerValue("trial");

  dbRecordTrial(performance, [], 0, trialTimeSec, false); // todo fsy
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
  initializeAfterNextTrial();
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
