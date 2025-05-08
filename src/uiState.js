import { remainingSubmissions } from "./constant.js";

/***
 * Buttons
 */
export function updateButtonStates({ forceEnableNext = false } = {}) {
  // check if all boxes are filled
  const boxes = document.querySelectorAll(".box");
  const allFilled = Array.from(boxes).every((box) => box.children.length > 0);

  // check if all options are not be selected
  const allOptions = document.querySelectorAll(".option");
  const optionContainer = document.getElementById("option-container");
  const allInStartZone = Array.from(allOptions).every((opt) =>
    optionContainer.contains(opt)
  );

  const canSubmit = allFilled && remainingSubmissions() > 0;
  const canReset = !allInStartZone;

  updateButtons({
    submit: canSubmit,
    reset: canReset,
    next:
      forceEnableNext || document.getElementById("next-btn").disabled === false,
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
export function showResultContent(correctCount, accuracy) {
  const content = document.getElementById("result-content");
  content.style.display = "block";

  document.getElementById("correct-count").textContent = correctCount;
  document.getElementById("accuracy").textContent = `${accuracy}%`;
}

export function hideResultContent() {
  const content = document.getElementById("result-content");
  content.style.display = "none";
}
