import {
  addLayer,
  addMediaLayer,
  createProject,
  deleteLayer,
  findLayer,
  moveLayer,
  selectLayer,
  selectedLayer,
  setPlayhead,
  updateLayer
} from "./project.js";
import { LAYER_FONT, drawScene, frameLayout, hitTest, layerCenterView, projectPoint } from "./stage.js";
import { mediaById, releaseMedia, rememberFile, syncPlayback } from "./media.js";

const project = createProject();
const canvas = document.getElementById("picture");
const ctx = canvas.getContext("2d");
const measureCtx = document.createElement("canvas").getContext("2d");
const playButton = document.getElementById("play");
const timeReadout = document.getElementById("time");
const layerEmpty = document.getElementById("layer-empty");
const layerList = document.getElementById("layer-list");
const inspectorEmpty = document.getElementById("inspector-empty");
const inspectorForm = document.getElementById("inspector-form");
const fileInput = document.getElementById("import-input");
const tracks = document.getElementById("tracks");
const playhead = document.getElementById("playhead");

const fields = {
  x: document.getElementById("field-x"),
  y: document.getElementById("field-y"),
  scale: document.getElementById("field-scale"),
  rotation: document.getElementById("field-rotation"),
  opacity: document.getElementById("field-opacity"),
  fill: document.getElementById("field-fill"),
  text: document.getElementById("field-text"),
  fontSize: document.getElementById("field-font-size")
};

let viewWidth = 1;
let viewHeight = 1;
let playing = false;
let lastTick = 0;
let gesture = null;
let dragLayerId = null;

bindTabs();
bindAddButtons();
bindInspector();
bindPlayback();
bindPointer();
bindKeys();
bindResize();
refresh();

function bindTabs() {
  const tabs = document.querySelectorAll(".tab");
  const panels = {
    layers: document.getElementById("layers"),
    inspector: document.getElementById("inspector")
  };
  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.panel;
      tabs.forEach((item) => item.classList.toggle("is-selected", item === tab));
      Object.entries(panels).forEach(([key, panel]) => {
        panel.classList.toggle("is-selected", key === name);
      });
    });
  });
}

function bindAddButtons() {
  document.querySelectorAll("[data-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const layer = addLayer(project, button.dataset.add);
      fitText(layer);
      refresh();
    });
  });
  document.getElementById("import-button").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = "";
    if (file) importFile(file);
  });
}

async function importFile(file) {
  const record = rememberFile(file);
  await record.ready;
  addMediaLayer(project, {
    name: file.name,
    mediaType: record.kind,
    mediaId: record.id,
    sourceWidth: record.width,
    sourceHeight: record.height
  });
  if (record.element && record.kind === "video") {
    record.element.addEventListener("seeked", () => {
      if (!playing) draw();
    });
  }
  refresh();
}

function bindInspector() {
  fields.x.addEventListener("input", () => setNumber("x"));
  fields.y.addEventListener("input", () => setNumber("y"));
  fields.scale.addEventListener("input", () => {
    const value = readNumber(fields.scale);
    if (value == null) return;
    const scale = Math.max(value, 0.05);
    patchSelected({ transform: { scaleX: scale, scaleY: scale } });
  });
  fields.rotation.addEventListener("input", () => setNumber("rotation"));
  fields.opacity.addEventListener("input", () => {
    const value = readNumber(fields.opacity);
    if (value == null) return;
    patchSelected({ transform: { opacity: Math.min(1, Math.max(0, value)) } });
  });
  fields.fill.addEventListener("input", () => patchSelected({ fill: fields.fill.value }));
  fields.text.addEventListener("input", () => {
    const layer = patchSelected({ text: fields.text.value });
    fitText(layer);
    draw();
  });
  fields.fontSize.addEventListener("input", () => {
    const value = readNumber(fields.fontSize);
    if (value == null) return;
    const layer = patchSelected({ fontSize: Math.max(1, value) });
    fitText(layer);
    draw();
  });
}

function setNumber(key) {
  const value = readNumber(fields[key]);
  if (value == null) return;
  patchSelected({ transform: { [key]: value } });
}

function patchSelected(patch) {
  const layer = selectedLayer(project);
  if (!layer) return null;
  updateLayer(project, layer.id, patch);
  draw();
  return layer;
}

function bindPlayback() {
  playButton.addEventListener("click", () => {
    playing = !playing;
    playButton.classList.toggle("is-playing", playing);
    playButton.setAttribute("aria-label", playing ? "Pause" : "Play");
    syncPlayback(project, playing);
    if (!playing) {
      draw();
      return;
    }
    lastTick = performance.now();
    requestAnimationFrame(tick);
  });
}

function tick(now) {
  if (!playing) return;
  const elapsed = Math.min((now - lastTick) / 1000, 0.1);
  lastTick = now;
  setPlayhead(project, project.playhead + elapsed);
  timeReadout.textContent = formatTime(project.playhead);
  placePlayhead();
  syncPlayback(project, true);
  draw();
  requestAnimationFrame(tick);
}

function bindPointer() {
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", endGesture);
  canvas.addEventListener("pointercancel", endGesture);
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  event.preventDefault();
  if (event.pointerId != null) {
    try { canvas.setPointerCapture(event.pointerId); } catch { /* The pointer is already gone. */ }
  }
  const { point, layout } = eventSpace(event);
  const hit = hitTest(project, layout, point.x, point.y);
  if (hit.type === "empty") {
    selectLayer(project, null);
    gesture = null;
    refresh();
    return;
  }
  selectLayer(project, hit.layer.id);
  gesture = startGesture(hit, point, layout);
  refresh();
}

function startGesture(hit, point, layout) {
  const layer = hit.layer;
  const base = {
    id: layer.id,
    startX: point.x,
    startY: point.y,
    originX: layer.transform.x,
    originY: layer.transform.y,
    startScaleX: layer.transform.scaleX,
    startScaleY: layer.transform.scaleY,
    startRotation: layer.transform.rotation
  };
  if (hit.type === "handle" && hit.handle === "rotate") {
    const center = layerCenterView(layout, project, layer);
    return {
      ...base,
      mode: "rotate",
      startAngle: angleOf(point, center)
    };
  }
  if (hit.type === "handle") return { ...base, mode: "scale" };
  return { ...base, mode: "move" };
}

function onPointerMove(event) {
  if (!gesture) return;
  const layer = findLayer(project, gesture.id);
  if (!layer) return;
  const { point, layout } = eventSpace(event);
  if (gesture.mode === "move") moveLayerTo(layer, point, layout);
  if (gesture.mode === "scale") scaleLayer(layer, point, layout);
  if (gesture.mode === "rotate") rotateLayer(layer, point, layout);
  draw();
  renderInspector();
}

function moveLayerTo(layer, point, layout) {
  const start = projectPoint(layout, project, gesture.startX, gesture.startY);
  const now = projectPoint(layout, project, point.x, point.y);
  updateLayer(project, layer.id, {
    transform: {
      x: gesture.originX + now.x - start.x,
      y: gesture.originY + now.y - start.y
    }
  });
}

function scaleLayer(layer, point, layout) {
  const center = layerCenterView(layout, project, layer);
  const startDistance = Math.hypot(gesture.startX - center.x, gesture.startY - center.y);
  const distance = Math.hypot(point.x - center.x, point.y - center.y);
  const factor = startDistance < 1 ? 1 : distance / startDistance;
  updateLayer(project, layer.id, {
    transform: {
      scaleX: Math.max(gesture.startScaleX * factor, 0.05),
      scaleY: Math.max(gesture.startScaleY * factor, 0.05)
    }
  });
}

function rotateLayer(layer, point, layout) {
  const center = layerCenterView(layout, project, layer);
  const turn = angleOf(point, center) - gesture.startAngle;
  updateLayer(project, layer.id, {
    transform: { rotation: gesture.startRotation + turn }
  });
}

function endGesture() {
  gesture = null;
}

function bindKeys() {
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Delete" && event.key !== "Backspace") return;
    if (isTyping(event.target)) return;
    const layer = selectedLayer(project);
    if (!layer) return;
    event.preventDefault();
    if (layer.mediaId) releaseMedia(layer.mediaId);
    deleteLayer(project, layer.id);
    refresh();
  });
}

function bindResize() {
  const frame = canvas.parentElement;
  const observer = new ResizeObserver(() => resize());
  observer.observe(frame);
  resize();
}

function resize() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  viewWidth = Math.max(rect.width, 1);
  viewHeight = Math.max(rect.height, 1);
  canvas.width = Math.round(viewWidth * ratio);
  canvas.height = Math.round(viewHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  draw();
}

function refresh() {
  renderList();
  renderTimeline();
  renderInspector();
  timeReadout.textContent = formatTime(project.playhead);
  placePlayhead();
  draw();
}

function placePlayhead() {
  const ratio = project.duration > 0 ? project.playhead / project.duration : 0;
  playhead.style.left = `${ratio * 100}%`;
}

function renderTimeline() {
  tracks.classList.toggle("has-layers", project.layers.length > 0);
  tracks.replaceChildren();
  if (project.layers.length === 0) {
    for (let index = 0; index < 5; index += 1) {
      const track = document.createElement("div");
      track.className = "track";
      tracks.append(track);
    }
    return;
  }
  for (const layer of [...project.layers].reverse()) tracks.append(clipRow(layer));
}

function clipRow(layer) {
  const row = document.createElement("div");
  row.className = "track";
  row.dataset.id = layer.id;
  if (layer.id === project.selectedLayerId) row.classList.add("is-selected");
  const clip = document.createElement("button");
  clip.type = "button";
  clip.className = "clip";
  if (!layer.visible) clip.classList.add("is-hidden");
  const span = project.duration || 1;
  clip.style.left = `${(layer.inPoint / span) * 100}%`;
  clip.style.width = `${Math.max((layer.outPoint - layer.inPoint) / span, 0) * 100}%`;
  clip.textContent = layer.name;
  clip.addEventListener("click", () => {
    selectLayer(project, layer.id);
    markSelection();
    renderInspector();
    draw();
  });
  row.append(clip);
  return row;
}

function draw() {
  drawScene(ctx, project, currentLayout(), viewWidth, viewHeight, mediaFor);
}

function currentLayout() {
  return frameLayout(viewWidth, viewHeight, project);
}

function mediaFor(layer) {
  if (layer.type !== "image" && layer.type !== "video") return null;
  return mediaById(layer.mediaId);
}

function markSelection() {
  const selected = project.selectedLayerId;
  layerList.querySelectorAll(".layer-row").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.id === selected);
  });
  tracks.querySelectorAll(".track").forEach((row) => {
    row.classList.toggle("is-selected", row.dataset.id === selected);
  });
}

function renderList() {
  layerEmpty.hidden = project.layers.length > 0;
  layerList.replaceChildren();
  const visual = [...project.layers].reverse();
  for (const layer of visual) layerList.append(layerRow(layer));
}

function layerRow(layer) {
  const row = document.createElement("div");
  row.className = "layer-row";
  row.dataset.id = layer.id;
  row.draggable = true;
  if (layer.id === project.selectedLayerId) row.classList.add("is-selected");
  row.append(eyeButton(layer), nameButton(layer));
  row.addEventListener("click", () => {
    selectLayer(project, layer.id);
    markSelection();
    renderInspector();
    draw();
  });
  row.addEventListener("dragstart", (event) => {
    if (event.target.closest(".eye") || event.target.closest("input")) {
      event.preventDefault();
      return;
    }
    dragLayerId = layer.id;
    event.dataTransfer.setData("text/plain", layer.id);
    event.dataTransfer.effectAllowed = "move";
  });
  row.addEventListener("dragover", (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  });
  row.addEventListener("drop", (event) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || dragLayerId;
    const toIndex = project.layers.findIndex((item) => item.id === layer.id);
    if (id && toIndex >= 0) moveLayer(project, id, toIndex);
    dragLayerId = null;
    refresh();
  });
  return row;
}

function eyeButton(layer) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "eye";
  button.textContent = layer.visible ? "●" : "○";
  button.setAttribute("aria-pressed", layer.visible ? "true" : "false");
  button.setAttribute("aria-label", `${layer.visible ? "Hide" : "Show"} ${layer.name}`);
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    updateLayer(project, layer.id, { visible: !layer.visible });
    refresh();
  });
  return button;
}

function nameButton(layer) {
  const name = document.createElement("span");
  name.className = "layer-name";
  name.textContent = layer.name;
  name.title = layer.name;
  name.addEventListener("dblclick", (event) => {
    event.stopPropagation();
    beginRename(layer, name);
  });
  return name;
}

function beginRename(layer, nameEl) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = layer.name;
  input.className = "layer-name";
  input.setAttribute("aria-label", "Layer name");
  nameEl.replaceWith(input);
  const row = input.closest(".layer-row");
  row.draggable = false;
  input.focus();
  input.select();
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") input.blur();
    if (event.key === "Escape") {
      input.value = layer.name;
      input.blur();
    }
  });
  input.addEventListener("blur", () => {
    const name = input.value.trim() || layer.name;
    updateLayer(project, layer.id, { name });
    refresh();
  });
}

function renderInspector() {
  const layer = selectedLayer(project);
  inspectorEmpty.hidden = Boolean(layer);
  inspectorForm.hidden = !layer;
  if (!layer) return;
  writeField(fields.x, layer.transform.x, 1);
  writeField(fields.y, layer.transform.y, 1);
  writeField(fields.scale, layer.transform.scaleX, 2);
  writeField(fields.rotation, layer.transform.rotation, 1);
  writeField(fields.opacity, layer.transform.opacity, 2);
  const showFill = layer.type === "rectangle" || layer.type === "ellipse" || layer.type === "text";
  fields.fill.closest("label").hidden = !showFill;
  if (showFill && document.activeElement !== fields.fill) fields.fill.value = toColor(layer.fill);
  const showText = layer.type === "text";
  fields.text.closest("label").hidden = !showText;
  fields.fontSize.closest("label").hidden = !showText;
  if (showText && document.activeElement !== fields.text) fields.text.value = layer.text;
  if (showText) writeField(fields.fontSize, layer.fontSize, 0);
}

function writeField(input, value, digits) {
  if (document.activeElement === input) return;
  input.value = String(roundTo(value, digits));
}

function fitText(layer) {
  if (!layer || layer.type !== "text") return;
  measureCtx.font = `${layer.fontSize}px ${LAYER_FONT}`;
  const width = Math.max(measureCtx.measureText(layer.text || " ").width, 1);
  updateLayer(project, layer.id, { width, height: layer.fontSize });
}

function eventSpace(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    point: { x: event.clientX - rect.left, y: event.clientY - rect.top },
    layout: frameLayout(rect.width, rect.height, project)
  };
}

function angleOf(point, center) {
  return Math.atan2(point.y - center.y, point.x - center.x) * 180 / Math.PI;
}

function readNumber(input) {
  if (input.value.trim() === "") return null;
  const value = Number(input.value);
  return Number.isFinite(value) ? value : null;
}

function roundTo(value, digits) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
}

function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds * 100 + 1e-6));
  const minutes = Math.floor(total / 6000);
  const secs = Math.floor(total / 100) % 60;
  const hundredths = total % 100;
  return `${minutes}:${String(secs).padStart(2, "0")}.${String(hundredths).padStart(2, "0")}`;
}

function isTyping(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}
