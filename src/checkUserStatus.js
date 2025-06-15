import { User } from "./collectData";
import { checkIfUserExists } from "./firebase/saveData2Firebase";
import { showMultipleAttemptsPopUp, showErrorModal } from "./modal";

let userCheckStatus = null; // true / false / "error" / null

/**
 * Checks if the current user has already participated.
 * Always shows UI if the user is a repeat participant or there's a network error.
 * Caches result in `userCheckStatus` for reuse.
 *
 * @returns {Promise<boolean>} true = should block the user (repeat or error), false = safe to continue
 */
export async function checkUserParticipation() {
  if (userCheckStatus === true) {
    showMultipleAttemptsPopUp();
    return true;
  }

  if (userCheckStatus === "error") {
    showErrorModal();
    return true;
  }

  try {
    const exists = await checkIfUserExists(User.prolific_pid);
    userCheckStatus = exists;
    if (exists) {
      showMultipleAttemptsPopUp();
      return true;
    }
  } catch (error) {
    userCheckStatus = "error";
    showErrorModal();
    return true;
  }

  return false; // All clear, continue
}
