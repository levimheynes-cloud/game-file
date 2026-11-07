/*
 * Book Batches – Library bin.
 *
 * Books on the shelf can be dragged into the bin (mouse or touch). Dropping
 * one asks for confirmation before the shelf deletes it. A short press still
 * opens the book as before.
 */

window.setupShelfBin = function setupShelfBin(shelf) {
  const DRAG_THRESHOLD = 6;

  const bin = document.getElementById("shelf-bin");
  const dialog = document.getElementById("bin-confirm");
  const question = document.getElementById("bin-question");
  const cancelButton = document.getElementById("bin-cancel");

  let press = null;
  let pendingId = null;

  function overBin(x, y) {
    const box = bin.getBoundingClientRect();
    const reach = 18;
    return x >= box.left - reach && x <= box.right + reach
      && y >= box.top - reach && y <= box.bottom + reach;
  }

  function clearGhosts() {
    document.querySelectorAll(".volume-ghost").forEach((ghost) => ghost.remove());
  }

  function startDrag(event) {
    clearGhosts();
    const box = press.volume.getBoundingClientRect();
    const ghost = press.volume.cloneNode(true);
    ghost.classList.add("volume-ghost");
    ghost.removeAttribute("id");
    ghost.style.width = box.width + "px";
    ghost.style.height = box.height + "px";
    document.body.append(ghost);
    press.ghost = ghost;
    press.offsetX = press.startX - box.left;
    press.offsetY = press.startY - box.top;
    press.volume.classList.add("is-lifted");
    moveGhost(event);
  }

  function moveGhost(event) {
    press.ghost.style.left = event.clientX - press.offsetX + "px";
    press.ghost.style.top = event.clientY - press.offsetY + "px";
    bin.classList.toggle("is-over", overBin(event.clientX, event.clientY));
  }

  function swallowNextClick() {
    const swallow = (event) => {
      event.stopPropagation();
      event.preventDefault();
    };
    window.addEventListener("click", swallow, { capture: true, once: true });
    window.setTimeout(() => window.removeEventListener("click", swallow, { capture: true }), 80);
  }

  function endDrag(dropped) {
    const { volume, ghost } = press;
    press = null;
    ghost.remove();
    clearGhosts();
    volume.classList.remove("is-lifted");
    bin.classList.remove("is-over");
    swallowNextClick();
    if (dropped) askToDelete(volume.dataset.id);
  }

  function askToDelete(id) {
    const book = shelf.findBook(id);
    if (!book) return;
    pendingId = id;
    dialog.returnValue = "";
    question.textContent = "Are you sure you want to delete \u201c" + (book.title || "Untitled") + "\u201d?";
    dialog.showModal();
    cancelButton.focus();
  }

  shelf.library.addEventListener("pointerdown", (event) => {
    const volume = event.target.closest(".volume");
    if (!volume || event.button !== 0 || dialog.open) return;
    press = { volume, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, ghost: null };
  });

  window.addEventListener("pointermove", (event) => {
    if (!press || event.pointerId !== press.pointerId) return;
    if (!press.ghost) {
      const moved = Math.hypot(event.clientX - press.startX, event.clientY - press.startY);
      if (moved < DRAG_THRESHOLD) return;
      startDrag(event);
    }
    event.preventDefault();
    moveGhost(event);
  });

  window.addEventListener("pointerup", (event) => {
    if (!press || event.pointerId !== press.pointerId) return;
    if (!press.ghost) {
      press = null;
      return;
    }
    endDrag(overBin(event.clientX, event.clientY));
  });

  window.addEventListener("pointercancel", (event) => {
    if (!press || event.pointerId !== press.pointerId) return;
    if (press.ghost) endDrag(false);
    else press = null;
  });

  shelf.library.addEventListener("keydown", (event) => {
    const volume = event.target.closest(".volume");
    if (!volume || (event.key !== "Delete" && event.key !== "Backspace")) return;
    event.preventDefault();
    askToDelete(volume.dataset.id);
  });

  dialog.addEventListener("close", () => {
    const id = pendingId;
    pendingId = null;
    if (dialog.returnValue === "delete" && id) shelf.deleteBook(id);
  });
};
