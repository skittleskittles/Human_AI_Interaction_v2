import { incrementSteps } from "./data/variable.js";
import {
  hideSubmissionResultContent,
  refreshInteractionState,
} from "./uiState.js";

export function bindDragDropEvents() {
  bindDragEvents();
  bindDropEvents();
}

export function disableDrag() {
  document.querySelectorAll(".option").forEach((el) => {
    el.setAttribute("draggable", "false");
    el.style.cursor = "not-allowed";
  });
}

export function enableDrag() {
  document.querySelectorAll(".option").forEach((el) => {
    el.setAttribute("draggable", "true");
    el.style.cursor = "move";
  });
}

function bindDragEvents() {
  document.querySelectorAll(".option").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text", e.target.id);
    });
  });
}

function bindDropEvents() {
  const boxContainer = document.getElementById("box-container");

  boxContainer.replaceWith(boxContainer.cloneNode(true));
  const newContainer = document.getElementById("box-container");

  newContainer.addEventListener("dragover", (e) => {
    if (e.target.classList.contains("box") || e.target.closest(".box")) {
      e.preventDefault();
    }
  });

  newContainer.addEventListener("drop", (e) => {
    e.preventDefault();

    const dropBox = getBoxElement(e.target);
    if (!dropBox) return;

    const draggedId = e.dataTransfer.getData("text");
    const draggedEl = document.getElementById(draggedId);
    const sourceBox = draggedEl.parentElement;

    if (dropBox === sourceBox) return;

    const targetEl = dropBox.firstElementChild;

    if (targetEl) {
      // 正确交换逻辑：顺序不能错
      sourceBox.appendChild(targetEl);
    }

    dropBox.appendChild(draggedEl);

    incrementSteps();
    refreshInteractionState();
    hideSubmissionResultContent();
  });
}

function getBoxElement(el) {
  return el.classList.contains("box") ? el : el.closest(".box");
}
