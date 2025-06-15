export const consentContainer = document.getElementById("consentContainer");
export const instructionsContainer = document.getElementById(
  "instructionsContainer"
);
export const gameContainer = document.getElementById("gameContainer");
export const timeBox = document.getElementById("time-box");
export const modalContainer = document.getElementById("modalContainer");
export const feedbackContainer = document.getElementById("feedbackContainer");

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
