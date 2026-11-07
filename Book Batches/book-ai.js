/*
 * Book Batches – Ask AI pictures.
 *
 * Runs entirely in the browser (the game is hosted as static files), asking
 * the free Pollinations picture service directly. Each tab may make one
 * picture per minute; the wait survives reloading the tab.
 */

window.setupAiPictures = function setupAiPictures(game) {
  const AI_ENDPOINT = "https://image.pollinations.ai/prompt/";
  const COOLDOWN_MS = 60000;
  const TIMEOUT_MS = 120000;
  const READY_KEY = "book-batches-ai-ready-at";

  const form = document.getElementById("ai-maker");
  const input = document.getElementById("ai-prompt");
  const button = document.getElementById("ai-create");
  const status = document.getElementById("ai-status");

  let readyAt = Number(sessionStorage.getItem(READY_KEY)) || 0;
  let ticker = 0;
  let busy = false;
  let note = "";

  function secondsLeft() {
    return Math.max(0, Math.ceil((readyAt - Date.now()) / 1000));
  }

  function refresh() {
    const left = secondsLeft();
    button.disabled = busy || left > 0;
    if (busy) return;
    const wait = left > 0 ? "Next picture in " + left + "s…" : "";
    status.textContent = [note, wait].filter(Boolean).join(" ");
    if (left === 0) {
      window.clearInterval(ticker);
      ticker = 0;
    }
  }

  function startCooldown() {
    readyAt = Date.now() + COOLDOWN_MS;
    sessionStorage.setItem(READY_KEY, String(readyAt));
    if (!ticker) ticker = window.setInterval(refresh, 1000);
    refresh();
  }

  function pictureUrl(prompt) {
    const seed = Math.floor(Math.random() * 999999) + 1;
    return AI_ENDPOINT + encodeURIComponent(prompt)
      + "?width=768&height=768&nologo=true&safe=true&seed=" + seed;
  }

  function failureNote(error) {
    if (error.name === "AbortError") return "The picture took too long. Please try again.";
    if (error.message === "busy") return "The picture service is busy right now. Please try again later.";
    if (error instanceof TypeError) return "The picture service could not be reached. Check the internet connection.";
    return "The picture service could not make this picture. Please try again.";
  }

  async function fetchPicture(prompt, signal) {
    const response = await fetch(pictureUrl(prompt), { signal });
    if (response.status === 402 || response.status === 429) throw new Error("busy");
    const kind = response.headers.get("Content-Type") || "";
    if (!response.ok || !kind.startsWith("image/")) throw new Error("service");
    return response.blob();
  }

  async function placePicture(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const image = await game.loadImage(url);
      game.setDrawMode(false);
      game.placeImportedPhoto(game.imageToDataUrl(image, "image/jpeg"));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function createPicture(prompt) {
    if (busy || secondsLeft() > 0) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
    busy = true;
    note = "";
    startCooldown();
    status.textContent = "Drawing your picture… this can take up to a minute.";
    try {
      await placePicture(await fetchPicture(prompt, controller.signal));
      game.setStylesOpen(false);
    } catch (error) {
      note = failureNote(error);
    } finally {
      window.clearTimeout(timer);
      busy = false;
      refresh();
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt) {
      input.focus();
      return;
    }
    createPicture(prompt);
  });

  if (secondsLeft() > 0) ticker = window.setInterval(refresh, 1000);
  refresh();
};
