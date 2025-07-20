export const consentContainer = document.getElementById("consentContainer");
export const instructionsContainer = document.getElementById(
  "instructionsContainer"
);
export const gameContainer = document.getElementById("gameContainer");
export const timeBox = document.getElementById("time-box");
export const modalContainer = document.getElementById("modalContainer");
export const feedbackContainer = document.getElementById("feedbackContainer");

export const leftPanel = document.getElementById("left-panel");
export const centerPanel = document.getElementById("center-panel");
export const rightPanel = document.getElementById("right-panel");

export const optionContainer = document.getElementById("option-container");
export const labelContainer = document.getElementById("label-container");
export const solutionContainer = document.getElementById("solution-container");

export const solutionLabel = document.getElementById("solution-label");
export const revealSolMessage = document.getElementById("reveal-sol-message");


export function clearPageContent() {
  const sections = [
    "consentContainer",
    "instructionContainer",
    "gameContainer",
    "feedbackContainer",
  ];
  sections.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.style.display = "none";
  });
}
