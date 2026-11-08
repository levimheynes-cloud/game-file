const SHAPE_SIZE = {
  rectangle: { width: 480, height: 270 },
  ellipse: { width: 360, height: 360 }
};

const SHAPE_LABEL = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  text: "Text"
};

export function createProject() {
  return {
    id: "project",
    name: "Untitled",
    width: 1920,
    height: 1080,
    fps: 30,
    duration: 5,
    playhead: 0,
    selectedLayerId: null,
    nextId: 1,
    layers: []
  };
}

export function fitInside(sourceWidth, sourceHeight, frameWidth, frameHeight) {
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return { width: 480, height: 270 };
  }
  const scale = Math.min(frameWidth / sourceWidth, frameHeight / sourceHeight);
  return {
    width: sourceWidth * scale,
    height: sourceHeight * scale
  };
}

function nextLayerId(project) {
  const id = `layer-${project.nextId}`;
  project.nextId += 1;
  return id;
}

function nextShapeName(project, type) {
  const label = SHAPE_LABEL[type];
  let highest = 0;
  const pattern = new RegExp(`^${label} (\\d+)$`);
  for (const layer of project.layers) {
    const match = layer.name.match(pattern);
    if (match) highest = Math.max(highest, Number(match[1]));
  }
  return `${label} ${highest + 1}`;
}

function estimatedTextSize(text, fontSize) {
  const letters = Math.max(String(text || "").length, 1);
  return {
    width: Math.max(fontSize * letters * 0.55, fontSize * 0.5),
    height: fontSize
  };
}

function blankLayer(project, fields) {
  return {
    id: nextLayerId(project),
    name: fields.name,
    type: fields.type,
    visible: true,
    inPoint: 0,
    outPoint: project.duration,
    transform: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 },
    fill: "#ffffff",
    text: fields.text,
    fontSize: fields.fontSize,
    mediaId: fields.mediaId,
    width: fields.width,
    height: fields.height
  };
}

function adopt(project, layer) {
  project.layers.push(layer);
  project.selectedLayerId = layer.id;
  return layer;
}

export function addLayer(project, type) {
  if (!SHAPE_LABEL[type]) throw new Error(`Unknown layer type: ${type}`);
  const text = type === "text" ? "Text" : "";
  const size = type === "text" ? estimatedTextSize(text, 120) : SHAPE_SIZE[type];
  return adopt(project, blankLayer(project, {
    name: nextShapeName(project, type),
    type,
    text,
    fontSize: 120,
    mediaId: null,
    width: size.width,
    height: size.height
  }));
}

export function addMediaLayer(project, spec) {
  const fitted = fitInside(
    spec.sourceWidth,
    spec.sourceHeight,
    project.width,
    project.height
  );
  return adopt(project, blankLayer(project, {
    name: spec.name,
    type: spec.mediaType,
    text: "",
    fontSize: 120,
    mediaId: spec.mediaId,
    width: fitted.width,
    height: fitted.height
  }));
}

export function updateLayer(project, id, patch) {
  const layer = findLayer(project, id);
  if (!layer) return null;
  const { transform, ...rest } = patch;
  Object.assign(layer, rest);
  if (transform) Object.assign(layer.transform, transform);
  if (layer.type === "text" && ("text" in patch || "fontSize" in patch)) {
    const size = estimatedTextSize(layer.text, layer.fontSize);
    layer.width = size.width;
    layer.height = size.height;
  }
  return layer;
}

export function deleteLayer(project, id) {
  const index = project.layers.findIndex((layer) => layer.id === id);
  if (index < 0) return null;
  const [removed] = project.layers.splice(index, 1);
  if (project.selectedLayerId === id) {
    const neighbor = project.layers[index] || project.layers[index - 1] || null;
    project.selectedLayerId = neighbor ? neighbor.id : null;
  }
  return removed;
}

export function selectLayer(project, id) {
  if (id == null) {
    project.selectedLayerId = null;
    return null;
  }
  const layer = findLayer(project, id);
  project.selectedLayerId = layer ? layer.id : null;
  return layer;
}

export function moveLayer(project, id, toIndex) {
  const fromIndex = project.layers.findIndex((layer) => layer.id === id);
  if (fromIndex < 0) return null;
  const [layer] = project.layers.splice(fromIndex, 1);
  const index = Math.max(0, Math.min(toIndex, project.layers.length));
  project.layers.splice(index, 0, layer);
  return layer;
}

export function findLayer(project, id) {
  return project.layers.find((layer) => layer.id === id) || null;
}

export function selectedLayer(project) {
  return findLayer(project, project.selectedLayerId);
}

export function setPlayhead(project, time) {
  const duration = project.duration;
  if (!(duration > 0) || !Number.isFinite(time)) {
    project.playhead = 0;
    return 0;
  }
  let next = time % duration;
  if (next < 0) next += duration;
  project.playhead = next;
  return next;
}
