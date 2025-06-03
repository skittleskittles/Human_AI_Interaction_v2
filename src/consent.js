import { consentContainer } from "./data/domElements.js";
import { showInstructions } from "./instructions.js";
import { getCurDate } from "./utils.js";
import { User } from "./collectData.js";

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

      proceedButton.addEventListener("click", function () {
        consentContainer.style.display = "none";
        User.is_consent = true;
        import("./firebase/saveData2Firebase.js").then((module) => {
          module.saveOrUpdateUser(getCurDate()); // update user data
        });
        showInstructions();
      });
    });
}
