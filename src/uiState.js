import {
  getPerformance,
  hasSubmittedThisTrial,
  remainingSubmissions,
} from "./data/variable.js";
import { disableDrag, enableDrag } from "./dragDrop.js";

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

  updateButtons({
    submit: canSubmit,
    reset: canReset,
    next: forceEnableNext,
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
