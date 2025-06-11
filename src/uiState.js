import {
  getPerformance,
  hasSubmittedThisTrial,
  isAttentionCheck,
  isComprehensionCheck,
  remainingSubmissions,
} from "./data/variable.js";
import { disableDrag, enableDrag } from "./dragDrop.js";
import { User } from "./collectData.js";

/***
 * refreshInteractionState: Buttons click & Options drag
 */
export function refreshInteractionState({
  forceEnableNext = hasSubmittedThisTrial(),
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

  const canSubmit = allFilled && remainingSubmissions() > 0 && score !== 100;
  const canReset =
    !allInStartZone && remainingSubmissions() > 0 && score !== 100;
  const canNext = isComprehensionCheck() ? score === 100 : forceEnableNext;

  updateButtons({
    submit: canSubmit,
    reset: canReset,
    next: canNext,
  });

  if (remainingSubmissions() === 0) {
    disableDrag();
  } else {
    enableDrag();
  }
}

export function updateButtons({ submit, reset, next }) {
  document.getElementById("submit-btn").disabled = !submit;
  document.getElementById("reset-btn").disabled = !reset;
  document.getElementById("next-btn").disabled = !next;
}

/***
 * Result Box Content
 */
export function showResultContent() {
  const performance = getPerformance();

  const content = document.getElementById("result-content");
  content.style.display = "block";

  document.getElementById("correct-choice").textContent =
    performance.lastSubmission.correctChoice;
  document.getElementById(
    "score"
  ).textContent = `${performance.lastSubmission.score}`;
  document.getElementById("correct-trials").textContent =
    performance.correctTrialCount;
  document.getElementById("totalPassMessage").style.display = "block";

  const additionalMessage = document.getElementById("additionalMessage");
  additionalMessage.style.display = "none";
  if (isAttentionCheck()) {
    document.getElementById("totalPassMessage").style.display = "none";
    if (performance.lastSubmission.score !== 100) {
      additionalMessage.style.display = "block";
      additionalMessage.textContent = "You have failed this attention check.";
      additionalMessage.style.color = "red";
    } else {
      User.is_passed_attention_check = true;
    }
  } else if (isComprehensionCheck()) {
    document.getElementById("totalPassMessage").style.display = "none";
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

export function hideResultContent() {
  const content = document.getElementById("result-content");
  content.style.display = "none";
}

/***
 * Loading Page
 */
export function showLoading() {
  document.getElementById("loading-overlay").style.display = "flex";
}

export function hideLoading() {
  document.getElementById("loading-overlay").style.display = "none";
}
