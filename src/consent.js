import { consentContainer } from "./data/domElements.js";
import { showInstructions } from "./instructions.js";
import { getCurDate } from "./utils.js";
import { User } from "./collectData.js";
import { checkUserParticipation } from "./checkUserStatus.js";

export function showConsent() {
  fetch("consent.html")
    .then((response) => response.text())
    .then((html) => {
      consentContainer.innerHTML = html;

      const checkbox = document.getElementById("confirmParticipation");
      const proceedButton = document.getElementById("proceedButton");

      checkbox.addEventListener("change", function () {
        proceedButton.disabled = !this.checked;
      });

      proceedButton.addEventListener("click", async function () {
        const shouldBlock = await checkUserParticipation();
        if (shouldBlock) return;

        consentContainer.style.display = "none";
        User.is_consent = true;
        User.create_time = getCurDate();

        import("./firebase/saveData2Firebase.js").then((module) => {
          module.saveOrUpdateUser(getCurDate());
        });

        showInstructions();
      });
    });
}
