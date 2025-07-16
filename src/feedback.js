import {
  globalState,
  AI_HELP_TYPE,
  getTotalCorrectTrials,
  getObjCount,
  getBonusThreshold,
  isNoAIExpGroup,
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
      const aiFreeResponse = document.getElementById("aiFreeResponse");
      const submitFeedback = document.getElementById("submitFeedback");
      const radioGroups = document.querySelectorAll("input[type='radio']");
      let thankYouMessage = document.getElementById("thankYouMessage");

      if (!isNoAIExpGroup()) {
        aiFeedback.style.display = "block";
        aiFreeResponse.style.display = "flex";
        const slider = document.getElementById("aiHelpfulnessSlider");
        const sliderValue = document.getElementById("sliderValue");
        if (slider) {
          slider.addEventListener("input", () => {
            sliderValue.textContent = slider.value;
          });
        }
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

  // Get AI helpfulness slider value (if visible)
  const sliderEl = document.getElementById("aiHelpfulnessSlider");
  const sliderValue = sliderEl?.value;

  // Collect all free response values
  const freeResponses = {};
  ["1", "2", "3"].forEach((num) => {
    const textarea = document.getElementById(`freeResponse${num}`);
    freeResponses[`freeResponse${num}`] = textarea?.value.trim() || "";
  });

  const feedbackData = {
    choices: {},
    ...freeResponses,
    aiHelpfulness: sliderValue ? Number(sliderValue) : null,
    submittedAt: now,
  };

  User.end_time = now;

  const radioGroups = document.querySelectorAll("input[type='radio']:checked");
  radioGroups.forEach((radio) => {
    feedbackData.choices[radio.name] = radio.value;
  });

  await saveFeedbackData(feedbackData);

  submitButton.disabled = true;
  let message = "";
  let redirectFn = null;

  if (User.is_passed_attention_check) {
    const totalCorrectTrials = getTotalCorrectTrials();
    if (totalCorrectTrials >= getBonusThreshold()) {
      message = `Thank you for participating in the game! 
Your bonus payment will be distributed shortly.
Now you will be redirected back to Prolific.`;
      redirectFn = redirectProlificBonusPayment;
    } else {
      message = `Thank you for participating in the game!
Now you will be redirected back to Prolific.`;
      redirectFn = redirectProlificCompleted;
    }
  } else {
    message = `Thank you for participating in the game.
Now you will be redirected back to Prolific.`;
    showEndGameFailedAllAttentionCheckPopUp();
    redirectFn = redirectProlificFailedAllAttentionCheck;
  }

  // update UI first
  thankYouMessage.textContent = message;
  thankYouMessage.style.display = "block";

  // redirect
  // redirectFn?.(); // todo fsy: enable redirect
}
