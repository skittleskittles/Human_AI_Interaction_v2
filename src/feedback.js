import {
  getBonusAmount,
  globalState,
  GROUP_TYPE,
  isNoAIGroup,
  PHASE_NAME,
} from "./data/variable";
import { User } from "./collectData";
import {
  getCurDate,
  redirectProlificBonusPayment,
  redirectProlificCompleted,
  redirectProlificFailedAllAttentionCheck,
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

      if (!isNoAIGroup()) {
        aiFeedback.style.display = "block";
        aiFreeResponse.style.display = "flex";
        const slider = document.getElementById("aiHelpfulnessSlider");
        const sliderValue = document.getElementById("sliderValue");
        const sliderNA = document.getElementById("sliderNA");
        if (slider) {
          slider.addEventListener("input", () => {
            sliderValue.textContent = slider.value;
          });

          sliderNA.addEventListener("change", () => {
            if (sliderNA.checked) {
              slider.disabled = true;
              sliderValue.textContent = "N/A";
            } else {
              slider.disabled = false;
              sliderValue.textContent = slider.value;
            }
          });
        }
      }

      function checkFormCompletion() {
        const requiredFields =
          globalState.GROUP_TYPE === GROUP_TYPE.NO_AI
            ? ["1-1", "1-2", "1-3", "1-4", "1-5", "1-6", "1-7"]
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
          submitFeedbackForm(submitFeedback)
        );
      }
    });
}

async function submitFeedbackForm(submitButton) {
  const now = getCurDate();

  // Get AI helpfulness slider value (if visible)
  const sliderNA = document.getElementById("sliderNA");
  const sliderEl = document.getElementById("aiHelpfulnessSlider");

  let sliderValue;
  if (sliderNA?.checked) {
    sliderValue = "NA";
  } else if (sliderEl) {
    sliderValue = Number(sliderEl.value);
  } else {
    sliderValue = null;
  }

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
  const bonusMessage = document.getElementById("bonusMessage");
  const thankYouMessage = document.getElementById("thankYouMessage");

  let bonusMessageContent = "",
    thankYouMessageContent = "";
  let redirectFn = null;

  if (User.is_passed_attention_check) {
    const totalBonus = getBonusAmount("all");
    const phase1_2Bonus = getBonusAmount(PHASE_NAME.PHASE2);
    const phase3Bonus = getBonusAmount(PHASE_NAME.PHASE3);

    if (totalBonus > 0) {
      bonusMessageContent = `Your total bonus is $${totalBonus},
       which breaks down to $${phase1_2Bonus} for phase 1 and 2, $${phase3Bonus} for phase 3.`;
      thankYouMessageContent = `Thank you for participating in the game! 
Your bonus payment will be distributed shortly.
Now you will be redirected back to Prolific.`;
      redirectFn = redirectProlificBonusPayment;
    } else {
      thankYouMessageContent = `Thank you for participating in the game!
Now you will be redirected back to Prolific.`;
      redirectFn = redirectProlificCompleted;
    }
  } else {
    bonusMessageContent = `Your total bonus is $0 as you failed the attention check.`;
    thankYouMessageContent = `Thank you for participating in the game.
Now you will be redirected back to Prolific.`;
    showEndGameFailedAllAttentionCheckPopUp();
    redirectFn = redirectProlificFailedAllAttentionCheck;
  }

  // update UI first
  bonusMessage.textContent = bonusMessageContent;
  bonusMessage.style.display = bonusMessageContent === "" ? "none" : "block";
  thankYouMessage.textContent = thankYouMessageContent;
  thankYouMessage.style.display = "block";

  // redirect
  // redirectFn?.(); // todo fsy: enable redirect
}
