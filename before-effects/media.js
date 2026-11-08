const items = new Map();
let nextMediaId = 1;

const KIND_BY_EXTENSION = {
  png: "image",
  jpg: "image",
  jpeg: "image",
  webp: "image",
  gif: "image",
  mp4: "video",
  webm: "video",
  mov: "video"
};

export function kindForFile(file) {
  const extension = file.name.split(".").pop().toLowerCase();
  if (KIND_BY_EXTENSION[extension]) return KIND_BY_EXTENSION[extension];
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  return null;
}

export function rememberFile(file) {
  const kind = kindForFile(file);
  const record = {
    id: `media-${nextMediaId}`,
    kind: kind || "image",
    url: URL.createObjectURL(file),
    failed: kind == null,
    width: kind == null ? 480 : 0,
    height: kind == null ? 270 : 0,
    element: null,
    ready: null
  };
  nextMediaId += 1;
  items.set(record.id, record);
  record.ready = record.failed ? Promise.resolve(record) : loadRecord(record);
  return record;
}

export function mediaById(id) {
  return items.get(id) || null;
}

export function releaseMedia(id) {
  const record = items.get(id);
  if (!record) return;
  if (record.element) {
    if (typeof record.element.pause === "function") record.element.pause();
    record.element.remove();
    record.element.src = "";
  }
  URL.revokeObjectURL(record.url);
  items.delete(id);
}

export function syncPlayback(project, playing) {
  for (const layer of project.layers) {
    if (layer.type !== "video" || !layer.visible) continue;
    const record = items.get(layer.mediaId);
    const video = record && record.element;
    if (!video || record.failed || !Number.isFinite(video.duration) || video.duration <= 0) continue;
    const target = clampTime(project.playhead - layer.inPoint, video.duration);
    const drift = video.currentTime - target;
    if (playing) {
      if (Math.abs(drift) > 0.3) video.currentTime = target;
      if (video.paused) video.play().catch(() => {});
      continue;
    }
    if (!video.paused) video.pause();
    if (Math.abs(drift) > 0.04) video.currentTime = target;
  }
}

function loadRecord(record) {
  return record.kind === "video" ? loadVideo(record) : loadImage(record);
}

function loadImage(record) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      record.element = image;
      record.width = image.naturalWidth;
      record.height = image.naturalHeight;
      record.failed = !(record.width > 0 && record.height > 0);
      if (record.failed) assignFallback(record);
      resolve(record);
    };
    image.onerror = () => {
      record.failed = true;
      assignFallback(record);
      resolve(record);
    };
    image.src = record.url;
  });
}

function loadVideo(record) {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-hidden", "true");
    video.style.cssText = "position:fixed;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.append(video);
    video.src = record.url;
    const finish = () => {
      record.element = video;
      record.width = video.videoWidth || 0;
      record.height = video.videoHeight || 0;
      record.failed = !(record.width > 0 && record.height > 0);
      if (record.failed) assignFallback(record);
      resolve(record);
    };
    video.onloadeddata = finish;
    video.onerror = () => {
      record.failed = true;
      assignFallback(record);
      resolve(record);
    };
  });
}

function assignFallback(record) {
  record.width = 480;
  record.height = 270;
}

function clampTime(time, duration) {
  const end = Math.max(duration - 0.04, 0);
  return Math.min(Math.max(time, 0), end);
}
