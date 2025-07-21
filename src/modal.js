import { clearPageContent, modalContainer } from "./data/domElements";
import { showFeedback } from "./feedback.js";
import {
  getComprehensionTrialsNum,
  getNoAIPhaseTrialsLimit,
} from "./data/variable.js";
import { resetTrial } from "./trialAction.js";

// Load Modal
export async function loadModal() {
  const response = await fetch("modal.html");
  const html = await response.text();
  modalContainer.innerHTML = html;

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("modalOverlay").style.display = "none";
  });
}

// showModal

export function showModal({
  context = null,
  html,
  buttonText = "OK",
  onClose = null,
  confirmButtons = false,
  onConfirm = null,
  onCancel = null,
}) {
  modalContainer.style.display = "block";
  const modalInfo = document.getElementById("modalInfo");
  modalInfo.innerHTML = html;

  const overlay = document.getElementById("modalOverlay");
  overlay.style.display = "flex";

  const buttonWrapper = document.getElementById("modalButtonWrapper");
  buttonWrapper.innerHTML = ""; // clear old buttons

  if (confirmButtons) {
    // Confirm Button
    const confirmBtn = document.createElement("button");
    confirmBtn.textContent = "Confirm";
    confirmBtn.addEventListener("click", () => {
      overlay.style.display = "none";
      if (typeof onConfirm === "function") onConfirm();
    });

    // Cancel Button
    const cancelBtn = document.createElement("button");
    cancelBtn.textContent = "Cancel";
    cancelBtn.style.marginLeft = "10px";
    cancelBtn.addEventListener("click", () => {
      overlay.style.display = "none";
      if (typeof onCancel === "function") onCancel();
    });

    buttonWrapper.appendChild(confirmBtn);
    buttonWrapper.appendChild(cancelBtn);
  } else {
    // OK Button
    const okBtn = document.createElement("button");
    okBtn.textContent = buttonText;
    okBtn.addEventListener("click", () => {
      overlay.style.display = "none";
      if (typeof onClose === "function") onClose();
    });

    buttonWrapper.appendChild(okBtn);
  }
}

export function showEnterComprehensionTrialsPopUp() {
  const numTrials = getComprehensionTrialsNum();
  showModal({
    context: "comprehension",
    html: `<p>
      Now, you will play <strong>${numTrials} comprehension check</strong> trials.<br/><br/>
      Please carefully read the instructions and make your choices.
    </p>`,
  });
}

export function showEndGameFailedComprehensionCheckPopUp() {
  showModal({
    context: "fail-comprehension",
    html: `<p>
      You did not pass this comprehension check trial after two attempts, 
      so the study has ended, and <strong>no compensation will be provided.</strong><br/><br/>
      Please <strong>return</strong> your submission by closing this study and clicking ‘Stop Without Completing’ on Prolific.
    </p>`,
  });
}

export function showEndGameFailedAllAttentionCheckPopUp() {
  showModal({
    context: "fail-attention-all",
    html: `<p>
      Unfortunately, you did not pass the attention check trial. Now the game is over, 
      and you will be redirected back to Prolific.
    </p>`,
  });
}

export function showFailedAttentionCheckPopUp() {
  const failedCount = countFailedAttentionCheck();
  let message = "";

  if (failedCount === 1) {
    message = `<p>
      You just failed an attention check.<br/>
      If you fail another attention check, you won’t get compensated.
    </p>`;
  } else if (failedCount === 2) {
    message = `<p>
      You’ve failed another attention check.<br/>
      Since this is your second failure, you may continue the experiment, 
      but <strong>you will not be compensated</strong>.
    </p>`;
  }

  showModal({
    context: "fail-attention",
    html: message,
  });
}

export function showMultipleAttemptsPopUp() {
  showModal({
    context: "multiple-attempts",
    html: `<p>
      You have already participated in this study. Participation is limited to one time only.<br/><br/>
      Please <strong>return</strong> your submission by closing this study and clicking ‘Stop Without Completing’ on Prolific.
    </p>`,
  });
  clearPageContent();
}

export function showEnterMainGamePopUp(onCloseFunc) {
  showModal({
    context: "start-main-game",
    html: `<p>
       Great job! You’ve passed the comprehension check!<br/><br/>
       Now entering <strong>Phase 1</strong>. <br/>
       You have 8 minutes and must complete a minimum of ${getNoAIPhaseTrialsLimit()} trials.  <br/>
       If 8 minutes pass first, keep going until you finish ${getNoAIPhaseTrialsLimit()} trials.
    </p>`,
    onClose: onCloseFunc,
  });
}

export function showNeedMoreTrialsPopUp() {
  showModal({
    context: "need-more-trials",
    html: `<p>
      Time’s up!<br/>
      However, you must complete <strong> ${getNoAIPhaseTrialsLimit()} trials</strong> to enter the next part. <br/>
      Please continue until you meet this requirement.
    </p>`,
  });
}

export function showEnterPhase2(onCloseFunc) {
  showModal({
    context: "enter-phase2",
    html: `<p>
      Now entering <strong>Phase 2</strong>.<br/>
      You will have <strong>20 minutes</strong> for this phase. <br/>
      Note: AI assistance is on-demand and unlimited, with a cost per use in this phase. Usage resets for each trial.
    </p>`,
    onClose: onCloseFunc,
  });
}

export function showEnterPhase3(onCloseFunc) {
  showModal({
    context: "enter-phase3",
    html: `<p>
      Now entering <strong>Phase 3</strong>., the final challenge!<br/>
      You have 8 minutes and must complete a minimum of ${getNoAIPhaseTrialsLimit()} trials.  <br/>
      If 8 minutes pass first, keep going until you finish ${getNoAIPhaseTrialsLimit()} trials.<br/>
      Note: No AI assistance in this phase. Do your best!
    </p>`,
    onClose: onCloseFunc,
  });
}

export function showEndTimePopUp() {
  showModal({
    context: "end-time",
    html: `<p>
      Thanks for completing the main study! <br>
      Please take a moment to complete a brief survey.
    </p>`,
    onClose: () => {
      gameContainer.style.display = "none";
      showFeedback();
    },
  });
}

export function showErrorModal() {
  showModal({
    context: "error-modal",
    html: `<p>
      <strong>Network error detected.</strong><br/>
      Please close this page and contact the researcher via Prolific.<br/>
      Do not refresh or continue the task, as your progress may not be saved.
    </p>`,
  });
}

// export function showConfirmReset() {
//   showModal({
//     context: "confirm-reset",
//     html: `<p>Are you sure you want to reset?</p>`,
//     confirmButtons: true,
//     onConfirm: () => resetTrial(),
//     onCancel: () => console.log("Reset cancelled"),
//   });
// }
