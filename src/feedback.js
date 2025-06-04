import {
  globalState,
  AI_HELP_TYPE,
  getTotalCorrectTrials,
  getObjCount,
  getBonusThreshold,
} from "./data/variable";
import { User } from "./collectData";
import {
  redirectProlificCompleted,
  redirectProlificBonusPayment,
  redirectProlificFailedAllAttentionCheck,
  getCurDate,
} from "./utils";
import { saveFeedbackData } from "./firebase/saveData2Firebase";
import { showEndGameFailedAllAttentionCheckPopUp } from "./modal";

export function showFeedback() {
  fetch("feedback.html")
    .then((response) => response.text())
    .then((html) => {
      const feedbackContainer = document.getElementById("feedbackContainer");
      feedbackContainer.innerHTML = html;
      feedbackContainer.style.display = "block";

      const aiFeedback = document.getElementById("aiFeedback");
      const submitFeedback = document.getElementById("submitFeedback");
      const radioGroups = document.querySelectorAll("input[type='radio']");
      const thankYouMessage = document.getElementById("thankYouMessage");

      if (globalState.AI_HELP !== AI_HELP_TYPE.NO_AI) {
        aiFeedback.style.display = "block";
      }

      function checkFormCompletion() {
        const requiredFields =
          globalState.AI_HELP === AI_HELP_TYPE.NO_AI
            ? ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6"]
            : [...new Set([...radioGroups].map((r) => r.name))];

        const allSelected = requiredFields.every((name) =>
          document.querySelector(`input[name="${name}"]:checked`)
        );

        submitFeedback.disabled = !allSelected;
      }

      radioGroups.forEach((radio) => {
        radio.addEventListener("change", checkFormCompletion);
      });

      // Free response char count for all three textareas
      ["1", "2", "3"].forEach((num) => {
        const textarea = document.getElementById(`freeResponse${num}`);
        const countDisplay = document.getElementById(`charCount${num}`);

        textarea.addEventListener("input", () => {
          countDisplay.textContent = `${textarea.value.length} / 500`;
        });
      });

      // Bind submit
      if (submitFeedback) {
        submitFeedback.disabled = true;
        submitFeedback.addEventListener("click", () =>
          submitFeedbackForm(submitFeedback, thankYouMessage)
        );
      }
    });
}

async function submitFeedbackForm(submitButton, thankYouMessage) {
  const now = getCurDate();

  // Collect all free response values
  const freeResponses = {};
  ["1", "2", "3"].forEach((num) => {
    const textarea = document.getElementById(`freeResponse${num}`);
    freeResponses[`freeResponse${num}`] = textarea?.value.trim() || "";
  });

  const feedbackData = {
    choices: {},
    ...freeResponses,
    submittedAt: now,
  };

  User.end_time = now;

  const radioGroups = document.querySelectorAll("input[type='radio']:checked");
  radioGroups.forEach((radio) => {
    feedbackData.choices[radio.name] = radio.value;
  });

  submitButton.disabled = true;
  thankYouMessage.style.display = "block";

  await saveFeedbackData(feedbackData);

  if (User.is_passed_attention_check) {
    const totalCorrectTrials = getTotalCorrectTrials();
    if (totalCorrectTrials >= getBonusThreshold()) {
      redirectProlificBonusPayment();
    } else {
      redirectProlificCompleted();
    }
  } else {
    showEndGameFailedAllAttentionCheckPopUp();
    redirectProlificFailedAllAttentionCheck();
  }
}
