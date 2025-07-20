import {
  getCurPhase,
  getPerformance,
  getTrialAskAICount,
  hasRevealedSol,
  hasSubmittedThisTrial,
  isAllowedAskAITrials,
  isAttentionCheck,
  isComprehensionCheck,
  remainingAskAICount,
  remainingSubmissions,
} from "./data/variable.js";
import { disableDrag, enableDrag } from "./dragDrop.js";
import { User } from "./collectData.js";

/***
 * refreshInteractionState: Buttons click & Options drag
 */
export function refreshInteractionState({
  forceEnableNext = hasSubmittedThisTrial(),
  forceDisableAskAI = false,
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
  const score = performance.lastSubmission.score;

  const canSubmit = hasRevealedSol()
    ? false
    : allFilled && remainingSubmissions() > 0 && score !== 100;
  const canReset = hasRevealedSol()
    ? false
    : !allInStartZone && remainingSubmissions() > 0 && score !== 100;
  const canNext = isComprehensionCheck() ? score === 100 : forceEnableNext;
  const canAskAI =
    forceDisableAskAI || hasRevealedSol()
      ? false
      : allFilled && remainingAskAICount() > 0 && isAllowedAskAITrials();
  const canRevealSol = hasRevealedSol()
    ? false
    : performance.submissionCount > 0 && score !== 100;

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
    performance.lastSubmission.correctChoice;
  document.getElementById(
    "score"
  ).textContent = `${performance.lastSubmission.score}`;

  updateTotalPassMessage();

  const additionalMessage = document.getElementById("additionalMessage");
  additionalMessage.style.display = "none";
  if (isAttentionCheck()) {
    if (performance.lastSubmission.score !== 100) {
      additionalMessage.style.display = "block";
      additionalMessage.textContent = "You have failed this attention check.";
      additionalMessage.style.color = "red";
    } else {
      User.is_passed_attention_check = true;
    }
  } else if (isComprehensionCheck()) {
    additionalMessage.style.display = "block";
    if (performance.lastSubmission.score !== 100) {
      additionalMessage.textContent = "You did not score 100.";
      additionalMessage.style.color = "red";
    } else {
      additionalMessage.textContent = "You passed this trial! ";
      additionalMessage.style.color = "green";
    }
  }
}

export function updateTotalPassMessage() {
  document.getElementById("correct-trials").textContent =
    getPerformance().correctTrialCount;
  document.getElementById("totalPassMessage").style.display = "block";
  if (isAttentionCheck() || isComprehensionCheck()) {
    document.getElementById("totalPassMessage").style.display = "none";
  }
}

export function updateUseAIMessage() {
  document.getElementById("askAIMessage").style.display = isAllowedAskAITrials()
    ? "block"
    : "none";
  document.getElementById("askAI-count").textContent = getTrialAskAICount();
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
export function showButtonTooltip(buttonId, message) {
  const tooltip = document.getElementById(buttonId);
  tooltip.innerHTML = message;
  tooltip.style.display = "block";
  tooltip.style.opacity = "1";

  setTimeout(() => {
    tooltip.style.opacity = "0";
    setTimeout(() => {
      tooltip.style.display = "none";
    }, 300);
  }, 2000);
}
