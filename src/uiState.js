import {
  calWeightedPointIfCorrect,
  getCurPhase,
  getPerformance,
  getPhasePoints,
  getTrialAskAICount,
  hasRevealedSol,
  hasSubmittedThisTrial,
  isAllowedAskAITrials,
  isAttentionCheck,
  isComprehensionCheck,
  PHASE_NAME,
  remainingAskAICount,
  remainingSubmissions,
} from "./data/variable.js";
import { disableDrag, enableDrag } from "./dragDrop.js";
import { User } from "./collectData.js";
import { removeAllListeners } from "process";

/***
 * refreshInteractionState: Buttons click & Options drag
 */
export function refreshInteractionState({
  forceEnableNext = hasSubmittedThisTrial(),
  forceDisableAskAI = false,
  justSubmitted = false,
} = {}) {
  // check if all boxes are filled
  const boxes = document.querySelectorAll(".box");
  const allFilled = Array.from(boxes).every((box) => box.children.length > 0);

  // check if all options are not be selected
  const allOptions = document.querySelectorAll(".option");
  const optionContainer = document.getElementById("option-container");
  const allInStartZone = Array.from(allOptions).every((opt) =>
    optionContainer.contains(opt)
  );

  const performance = getPerformance();
  const score = performance.curSubmission.score;

  const canSubmit = hasRevealedSol()
    ? false
    : allFilled && remainingSubmissions() > 0 && score !== 100;
  const canReset = hasRevealedSol()
    ? false
    : !allInStartZone && remainingSubmissions() > 0 && score !== 100;
  const canNext = isComprehensionCheck()
    ? score === 100
    : hasRevealedSol() && forceEnableNext;
  const canAskAI =
    forceDisableAskAI || hasRevealedSol()
      ? false
      : allFilled &&
        remainingAskAICount() > 0 &&
        isAllowedAskAITrials() &&
        remainingSubmissions() > 0;

  // only allow reveal once, and available only right after you submit.
  const canRevealSol = hasRevealedSol()
    ? false
    : performance.submissionCount > 0 &&
      (justSubmitted || performance.curSubmission.steps == 0);

  updateButtons({
    submit: canSubmit,
    reset: canReset,
    next: canNext,
    askAI: canAskAI,
    revealSol: canRevealSol,
  });

  if (remainingSubmissions() === 0 || hasRevealedSol()) {
    disableDrag();
  } else {
    enableDrag();
  }
}

export function updateButtons({ submit, reset, next, askAI, revealSol }) {
  document.getElementById("submit-btn").disabled = !submit;
  document.getElementById("reset-btn").disabled = !reset;
  document.getElementById("next-btn").disabled = !next;

  const askAIBtn = document.getElementById("askAI-btn");
  if (askAI) {
    askAIBtn.classList.remove("disabled-visual");
    askAIBtn.dataset.locked = "false";
  } else {
    askAIBtn.classList.add("disabled-visual");
    askAIBtn.dataset.locked = "true";
  }

  const revealSolBtn = document.getElementById("reveal-sol-btn");
  if (revealSol) {
    revealSolBtn.classList.remove("disabled-visual");
    revealSolBtn.dataset.locked = "false";
  } else {
    revealSolBtn.classList.add("disabled-visual");
    revealSolBtn.dataset.locked = "true";
  }
}

/***
 * Result Box Content
 */
export function showResultContent() {
  const performance = getPerformance();

  const content = document.getElementById("submission-result-content");
  content.style.display = "block";

  document.getElementById("correct-choice").textContent =
    performance.curSubmission.correctChoice;
  // document.getElementById(
  //   "score"
  // ).textContent = `${performance.curSubmission.score}`;

  updateTotalPassMessage();

  const additionalMessage = document.getElementById("additionalMessage");
  additionalMessage.style.display = "none";
  if (isAttentionCheck()) {
    if (performance.curSubmission.score !== 100) {
      additionalMessage.style.display = "block";
      additionalMessage.textContent = "You have failed this attention check.";
      additionalMessage.style.color = "red";
    } else {
      User.is_passed_attention_check = true;
    }
  } else if (isComprehensionCheck()) {
    additionalMessage.style.display = "block";
    if (performance.curSubmission.score !== 100) {
      additionalMessage.textContent =
        "You did not place all 3 objects correctly.";
      additionalMessage.style.color = "red";
    } else {
      additionalMessage.textContent = "You passed this problem! ";
      additionalMessage.style.color = "green";
    }
  }
}

export function updateTotalPassMessage() {
  let totalPassMessageContent = `You have got ${0} point(s) so far.`;
  if ([PHASE_NAME.PHASE1, PHASE_NAME.PHASE2].includes(getCurPhase())) {
    let points = getPhasePoints(PHASE_NAME.PHASE1);
    if (getCurPhase() == PHASE_NAME.PHASE2) {
      points += getPhasePoints(PHASE_NAME.PHASE2);
    }
    totalPassMessageContent = `You have got 
    ${Number(points.toFixed(2))} point(s) so far.`;
  } else if (getCurPhase() == PHASE_NAME.PHASE3) {
    const pointsA =
      getPhasePoints(PHASE_NAME.PHASE1) + getPhasePoints(PHASE_NAME.PHASE2);
    totalPassMessageContent = `You have got ${Number(
      pointsA.toFixed(2)
    )} point(s) in phase 1 and 2.<br/>
    You have got ${Number(
      getPhasePoints(PHASE_NAME.PHASE3).toFixed(2)
    )} point(s) in phase 3.`;
  }
  document.getElementById("totalPassMessage").innerHTML =
    totalPassMessageContent;
  document.getElementById("totalPassMessage").style.display = "block";
  if (isAttentionCheck() || isComprehensionCheck()) {
    document.getElementById("totalPassMessage").style.display = "none";
  }
}

export function updateUseAIMessage() {
  document.getElementById("askAIMessage").style.display = isAllowedAskAITrials()
    ? "block"
    : "none";
  document.getElementById("will-earn-points").textContent =
    calWeightedPointIfCorrect();
  if (isAttentionCheck() || isComprehensionCheck()) {
    document.getElementById("askAIMessage").style.display = "none";
  }
}

export function hideSubmissionResultContent() {
  const content = document.getElementById("submission-result-content");
  content.style.display = "none";
}

/***
 * Button tooltip
 */
export function showButtonTooltip(
  targetId,
  message,
  disableAutoHide = false,
  mode = "click"
) {
  const tooltip = document.getElementById(targetId);

  const show = () => {
    tooltip.innerHTML = message;
    tooltip.style.display = "block";
    tooltip.style.opacity = "1";
  };

  const hide = () => {
    tooltip.style.opacity = "0";
    setTimeout(() => {
      tooltip.style.display = "none";
    }, 300);
  };

  if (mode == "click") {
    show();
    if (!disableAutoHide) {
      setTimeout(hide, 2000); // auto hide
    }
  } else if (mode == "mouseenter" && disableAutoHide) {
    show();
  } else if (mode == "mouseleave" && disableAutoHide) {
    hide();
  }
}
