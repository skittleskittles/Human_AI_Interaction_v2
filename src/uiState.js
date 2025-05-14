import {
  curAccuracy,
  getAccuracy,
  getCorrectCount,
  hasSubmittedThisTrial,
  remainingSubmissions,
  getCorrectTrialCount,
} from "./data/variable.js";

/***
 * Buttons
 */
export function updateButtonStates({
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

  const canSubmit =
    allFilled && remainingSubmissions() > 0 && getAccuracy() !== 100;
  const canReset =
    !allInStartZone && remainingSubmissions() > 0 && getAccuracy() !== 100;

  updateButtons({
    submit: canSubmit,
    reset: canReset,
    next: forceEnableNext,
  });
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
  const content = document.getElementById("result-content");
  content.style.display = "block";

  document.getElementById("correct-choice").textContent = getCorrectCount();
  document.getElementById("accuracy").textContent = `${getAccuracy()}%`;
  document.getElementById("correct-trials").textContent =
    getCorrectTrialCount();
}

export function hideResultContent() {
  const content = document.getElementById("result-content");
  content.style.display = "none";
}
