import { instructionsContainer, gameContainer } from "./data/domElements.js";
import { shouldShowComprehensionCheck } from "./data/variable";
import { getCurDate } from "./utils.js";
import { getObjCount } from "./data/variable";
import { startGame } from "./index.js";
import { showEnterComprehensionTrialsPopUp } from "./modal.js";
import { showButtonTooltip } from "./uiState.js";

/*
--------------------------------------------------------------------------------------

    Instructions page (videos and images)

--------------------------------------------------------------------------------------
*/

export function showInstructions() {
  fetch("instructions.html")
    .then((response) => response.text())
    .then((html) => {
      loadInstructionsHTML(html);
      initializeInstructionState();
      setupInstructionNavigation();
      showInstructionPage(currentPage);
    });
}

let currentPage = 1;
const totalPages = 9;
const unlockedPages = new Set();
let timer = null;
let countdownInterval = null;
let originalNextText = "Next";

function loadInstructionsHTML(html) {
  instructionsContainer.innerHTML = html;
  instructionsContainer.style.display = "block";

  const objCount = getObjCount();

  for (let i = currentPage; i < totalPages; i++) {
    if (i === 3) {
      const video = document.getElementById(`instruction${i}`);
      const source = document.getElementById(`videoSource`);
      if (video && source) {
        source.src = `instructions${objCount}-${i}.mp4`;
        video.load();
      }
    } else {
      const img = document.getElementById(`instruction${i}`);
      if (img) {
        img.src = `instructions${objCount}-${i}.png`;
      }
    }
  }
}

function initializeInstructionState() {
  currentPage = 1;
  unlockedPages.clear();
}

function setupInstructionNavigation() {
  const prevButton = document.getElementById("prevInstructionBtn");
  const nextButton = document.getElementById("nextInstructionBtn");

  prevButton.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      showInstructionPage(currentPage);
    }
  });

  nextButton.addEventListener("click", () => {
    const page = document.getElementById(`instructionPage-${currentPage}`);
    const video = page?.querySelector("video");

    if (nextButton.dataset.locked === "true") {
      if (video) {
        showButtonTooltip(
          "next-tooltip",
          "Please watch full video to continue"
        );
      }
      return;
    }
    if (currentPage < totalPages) {
      currentPage++;
      showInstructionPage(currentPage);
    } else {
      instructionsContainer.style.display = "none";
      gameContainer.style.display = "flex";
      shouldShowComprehensionCheck();
      showEnterComprehensionTrialsPopUp();
      startGame();
      // update user data before enter eduation trials
      import("./firebase/saveData2Firebase.js").then((module) => {
        module.saveOrUpdateUser(getCurDate());
      });
    }
  });
}

function showInstructionPage(index) {
  if (timer) clearTimeout(timer);
  if (countdownInterval) clearInterval(countdownInterval);

  for (let i = 1; i <= totalPages; i++) {
    document.getElementById(`instructionPage-${i}`)?.classList.remove("active");
  }
  document.getElementById(`instructionPage-${index}`)?.classList.add("active");

  const prevButton = document.getElementById("prevInstructionBtn");
  const nextButton = document.getElementById("nextInstructionBtn");

  prevButton.hidden = index === 1;
  nextButton.textContent = index === totalPages ? "Start" : originalNextText;

  handleInstructionUnlock(index);
}

function handleInstructionUnlock(pageIndex) {
  const nextButton = document.getElementById("nextInstructionBtn");
  if (unlockedPages.has(pageIndex)) {
    nextButton.classList.remove("disabled-visual");
    nextButton.dataset.locked = "false";
    nextButton.textContent =
      currentPage === totalPages ? "Start" : originalNextText;
    return;
  }

  const page = document.getElementById(`instructionPage-${pageIndex}`);
  const video = page?.querySelector("video");
  nextButton.classList.add("disabled-visual");
  nextButton.dataset.locked = "true";

  if (video) {
    const onEnded = () => {
      nextButton.classList.remove("disabled-visual");
      nextButton.dataset.locked = "false";
      nextButton.textContent =
        currentPage === totalPages ? "Start" : originalNextText;
      unlockedPages.add(pageIndex);
      video.removeEventListener("ended", onEnded);
    };
    video.addEventListener("ended", onEnded);
  } else {
    if (timer) clearTimeout(timer);
    if (countdownInterval) clearInterval(countdownInterval);
    let remaining = 3;
    nextButton.textContent = `${originalNextText} (${remaining})`;

    countdownInterval = setInterval(() => {
      remaining--;
      nextButton.textContent = `${originalNextText} (${remaining})`;
      if (remaining <= 0) {
        clearInterval(countdownInterval);
        nextButton.classList.remove("disabled-visual");
        nextButton.dataset.locked = "false";
        nextButton.textContent =
          currentPage === totalPages ? "Start" : originalNextText;
        unlockedPages.add(pageIndex);
      }
    }, 1000);
  }
}
