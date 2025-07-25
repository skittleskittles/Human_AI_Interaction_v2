import { gameContainer, instructionsContainer } from "./data/domElements.js";
import {
  getGroupType,
  GROUP_TYPE,
  GROUP_TYPE_NAME_MAP,
  isNoAIGroup,
  PHASE_NAME,
  setCurPhase,
  shouldShowComprehensionCheck,
} from "./data/variable";
import { getCurDate } from "./utils.js";
import { startGame } from "./index.js";
import { showEnterComprehensionproblemsPopUp } from "./modal.js";
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
      showInstructionPage(currentPageNum);
    });
}

let currentPageNum = 1;
let totalPages = 10;
const unlockedPages = new Set(); // record page idx
let timer = null;
let countdownInterval = null;
let originalNextText = "Next";

const commonPages = {
  pageId: [1, 2, 3, 4, 5, 6, 7, 12], // []page id for all groups
  videoPageId: [3, 6], // []page id that shows video
  imgPageId: [1, 2, 3, 5, 7, 12], // []page id that shows img
};
const instructionPageIdByGroup = {
  // key: Group type; value: []page id
  [GROUP_TYPE.NO_AI]: [...commonPages.pageId, 10, 11].sort((a, b) => a - b),
  [GROUP_TYPE.LOW_COST_AI]: [...commonPages.pageId, 8, 9, 10, 11].sort(
    (a, b) => a - b
  ),
  [GROUP_TYPE.HIGH_COST_AI]: [...commonPages.pageId, 8, 9, 10, 11].sort(
    (a, b) => a - b
  ),
};

const videoPageId = {
  [GROUP_TYPE.NO_AI]: [...commonPages.videoPageId],
  [GROUP_TYPE.LOW_COST_AI]: [...commonPages.videoPageId, 8],
  [GROUP_TYPE.HIGH_COST_AI]: [...commonPages.videoPageId, 8],
};
const VIDEO_DESCRIPTIONS = {
  3: `<p>You can drag or swap objects, or click RESET to return to the original state.</p>`,
  6: `<p>Immediately after each submission,
            you may choose to reveal the correct answer for this problem by clicking REVEAL ANSWER.</p>
        <p><strong><em>Warning</em></strong>: Once you click REVEAL ANSWER, you <strong>CANNOT revise your answer or
            re-SUBMIT</strong>.</p>
        <p>Click NEXT PROBLEM to move on to the next problem.</p>`,
  8: `<p><strong>An AI agent is available to assist you during Phase 2 only.</strong></p>
        <p>The AI agent is available for unlimited, on-demand use for each submission. However, you must first place all objects in
            position before using it.</p>
        <p>Each time you use it, the AI agent will randomly reveal the location of 1 randomly selected object.</p>`,
};

function loadInstructionsHTML(html) {
  const groupType = getGroupType();
  const groupName = GROUP_TYPE_NAME_MAP[groupType];

  const instructionPages = getPageMapForGroup();
  const videoPages = new Set(videoPageId[groupType]);

  instructionsContainer.innerHTML = html;
  instructionsContainer.style.display = "block";
  const pageContentContainer = document.getElementById(
    "instructions-page-content"
  );
  instructionPages.forEach((pageId) => {
    let pageType = videoPages.has(pageId) ? "video" : "image";
    let src = `instructions${pageId}`;
    if (!commonPages.pageId.includes(pageId)) {
      src += `-${groupName}`;
    }
    src += pageType === "video" ? ".mp4" : ".png";

    const pageEl = createInstructionPage({
      id: pageId,
      type: pageType,
      src,
      description: VIDEO_DESCRIPTIONS[pageId] || "",
    });
    pageContentContainer.appendChild(pageEl);
  });
}

function initializeInstructionState() {
  currentPageNum = 1;
  totalPages = isNoAIGroup() ? 10 : 12;
  unlockedPages.clear();
}

function setupInstructionNavigation() {
  const prevButton = document.getElementById("prevInstructionBtn");
  const nextButton = document.getElementById("nextInstructionBtn");

  prevButton.addEventListener("click", () => {
    if (currentPageNum > 1) {
      currentPageNum--;
      showInstructionPage(currentPageNum);
    }
  });

  nextButton.addEventListener("click", () => {
    const page = document.getElementById(
      `instructionPage-${getPageIdByPageNum(currentPageNum)}`
    );
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
    if (currentPageNum < totalPages) {
      currentPageNum++;
      showInstructionPage(currentPageNum);
    } else {
      instructionsContainer.style.display = "none";
      gameContainer.style.display = "flex";
      shouldShowComprehensionCheck();
      showEnterComprehensionTrialsPopUp();
      setCurPhase(PHASE_NAME.COMPREHENSION_CHECK);
      startGame();
      // update user data before enter eduation trials
      import("./firebase/saveData2Firebase.js").then((module) => {
        module.saveOrUpdateUser(getCurDate());
      });
    }
  });
}

function showInstructionPage(currentPageNum) {
  if (timer) clearTimeout(timer);
  if (countdownInterval) clearInterval(countdownInterval);

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    document
      .getElementById(`instructionPage-${getPageIdByPageNum(pageNum)}`)
      ?.classList.remove("active");
  }
  document
    .getElementById(`instructionPage-${getPageIdByPageNum(currentPageNum)}`)
    ?.classList.add("active");

  const prevButton = document.getElementById("prevInstructionBtn");
  const nextButton = document.getElementById("nextInstructionBtn");

  prevButton.hidden = currentPageNum === 1;
  nextButton.textContent =
    currentPageNum === totalPages ? "Start" : originalNextText;

  handleInstructionUnlock(currentPageNum);
  updatePageIndicator(currentPageNum, totalPages);
}

function updatePageIndicator(currentPageNum, totalPages) {
  const indicator = document.getElementById("pageIndicator");
  if (indicator) {
    indicator.textContent = `Page ${currentPageNum} / ${totalPages}`;
  }
}

function handleInstructionUnlock(pageNum) {
  const pageId = getPageIdByPageNum(pageNum);
  const nextButton = document.getElementById("nextInstructionBtn");
  if (unlockedPages.has(pageId)) {
    nextButton.classList.remove("disabled-visual");
    nextButton.dataset.locked = "false";
    nextButton.textContent =
      pageNum === totalPages ? "Start" : originalNextText;
    return;
  }

  const page = document.getElementById(`instructionPage-${pageId}`);
  const video = page?.querySelector("video");
  nextButton.classList.add("disabled-visual");
  nextButton.dataset.locked = "true";

  if (video) {
    const onEnded = () => {
      nextButton.classList.remove("disabled-visual");
      nextButton.dataset.locked = "false";
      nextButton.textContent =
        currentPageNum === totalPages ? "Start" : originalNextText;
      unlockedPages.add(pageId);
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
          currentPageNum === totalPages ? "Start" : originalNextText;
        unlockedPages.add(pageId);
      }
    }, 1000);
  }
}

function getPageMapForGroup() {
  const group = getGroupType();
  return instructionPageIdByGroup[group];
}

function getPageIdByPageNum(pageNum) {
  const list = getPageMapForGroup();
  return list[pageNum - 1] ?? null;
}

/**
 * HTML element
 */

export function createInstructionPage({ id, type, src, description }) {
  const container = document.createElement("div");
  container.className = "pageContainer";
  container.id = `instructionPage-${id}`;

  // Page 1 has custom intro text
  if (id === 1) {
    container.innerHTML = `
      <h2 style="color: red">Please Read All Instructions Carefully</h2>
      <p style="font-size: large">
        This experiment explores how people solve logical puzzles given a time limit. You will solve a series of logical puzzles by correctly ordering
        objects based on provided statements. There are 3 phases in this study and your goal is to complete as many problems as accurately as possible in each phase.

      </p>
      <p style="font-size: large; line-height: 1.6">
        <strong>
          Make your browser window FULL SCREEN and CLOSE ALL OTHER TABS.<br/>
          DO NOT REFRESH YOUR BROWSER during the study.
        </strong>
      </p>
      <p style="font-size: large">
        If you believe there is an issue with any problem, note the problem ID and message
        us via Prolific after completing the study.
      </p>
      <div class="image-wrapper">
        <img class="image-frame" id="instruction${id}" src="${src}"/>
      </div>
    `;
    return container;
  }

  if (type === "video") {
    container.innerHTML = `
      ${description ? `${description}` : ""}
      <div class="video-frame">
        <video id="instruction${id}-video" width="100%" height="100%" controls>
          <source id="instruction${id}-videoSource" src="${src}" type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    `;
  } else if (type === "image") {
    container.innerHTML = `
      <div class="image-wrapper">
        <img class="image-frame" id="instruction${id}" src="${src}"/>
      </div>
    `;
  }

  return container;
}
