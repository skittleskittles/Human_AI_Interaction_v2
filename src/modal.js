import { modalContainer } from "./data/domElements";
import { globalState } from "./data/variable";

// Load Modal
export async function loadModal() {
  const response = await fetch("modal.html");
  const html = await response.text();
  modalContainer.innerHTML = html;

  document.getElementById("closeModal").addEventListener("click", () => {
    document.getElementById("modalOverlay").style.display = "none";
  });
}
