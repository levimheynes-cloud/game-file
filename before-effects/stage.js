export const LAYER_FONT = '"Avenir Next", "Segoe UI", sans-serif';

const HANDLE = 7;
const HANDLE_REACH = 10;
const ROTATE_GAP = 24;

export function frameLayout(viewWidth, viewHeight, project) {
  const scale = Math.min(viewWidth / project.width, viewHeight / project.height);
  const width = project.width * scale;
  const height = project.height * scale;
  return {
    scale,
    ox: (viewWidth - width) / 2,
    oy: (viewHeight - height) / 2
  };
}

export function projectPoint(layout, project, viewX, viewY) {
  return {
    x: (viewX - layout.ox) / layout.scale - project.width / 2,
    y: (viewY - layout.oy) / layout.scale - project.height / 2
  };
}

export function localToView(layout, project, layer, localX, localY) {
  const scaledX = localX * layer.transform.scaleX;
  const scaledY = localY * layer.transform.scaleY;
  const radians = layer.transform.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const projectX = layer.transform.x + scaledX * cos - scaledY * sin;
  const projectY = layer.transform.y + scaledX * sin + scaledY * cos;
  return {
    x: layout.ox + (projectX + project.width / 2) * layout.scale,
    y: layout.oy + (projectY + project.height / 2) * layout.scale
  };
}

export function layerCenterView(layout, project, layer) {
  return localToView(layout, project, layer, 0, 0);
}

function localPoint(layer, point) {
  const dx = point.x - layer.transform.x;
  const dy = point.y - layer.transform.y;
  const radians = -layer.transform.rotation * Math.PI / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const rotatedX = dx * cos - dy * sin;
  const rotatedY = dx * sin + dy * cos;
  return {
    x: rotatedX / layer.transform.scaleX,
    y: rotatedY / layer.transform.scaleY
  };
}

function handlePoints(layer, layout) {
  const halfWidth = layer.width / 2;
  const halfHeight = layer.height / 2;
  const lift = ROTATE_GAP / (layout.scale * Math.max(Math.abs(layer.transform.scaleY), 0.05));
  return {
    nw: { x: -halfWidth, y: -halfHeight },
    ne: { x: halfWidth, y: -halfHeight },
    se: { x: halfWidth, y: halfHeight },
    sw: { x: -halfWidth, y: halfHeight },
    rotate: { x: 0, y: -halfHeight - lift }
  };
}

function covers(layer, local) {
  if (!(layer.width > 0) || !(layer.height > 0)) return false;
  const nx = local.x / (layer.width / 2);
  const ny = local.y / (layer.height / 2);
  if (layer.type === "ellipse") return nx * nx + ny * ny <= 1;
  return Math.abs(nx) <= 1 && Math.abs(ny) <= 1;
}

function nearView(point, viewX, viewY) {
  const dx = point.x - viewX;
  const dy = point.y - viewY;
  return dx * dx + dy * dy <= HANDLE_REACH * HANDLE_REACH;
}

export function hitTest(project, layout, viewX, viewY) {
  const selected = project.layers.find((layer) => {
    return layer.id === project.selectedLayerId && layer.visible;
  });
  if (selected) {
    const handles = handlePoints(selected, layout);
    for (const [name, local] of Object.entries(handles)) {
      const view = localToView(layout, project, selected, local.x, local.y);
      if (nearView(view, viewX, viewY)) return { type: "handle", handle: name, layer: selected };
    }
  }

  const point = projectPoint(layout, project, viewX, viewY);
  for (let index = project.layers.length - 1; index >= 0; index -= 1) {
    const layer = project.layers[index];
    if (!layer.visible) continue;
    if (Math.abs(layer.transform.scaleX) < 0.0001) continue;
    if (Math.abs(layer.transform.scaleY) < 0.0001) continue;
    if (covers(layer, localPoint(layer, point))) return { type: "layer", layer };
  }
  return { type: "empty" };
}

export function drawScene(ctx, project, layout, viewWidth, viewHeight, mediaFor) {
  ctx.clearRect(0, 0, viewWidth, viewHeight);
  for (const layer of project.layers) {
    if (layer.visible) drawLayer(ctx, project, layout, layer, mediaFor(layer));
  }
  const selected = project.layers.find((layer) => {
    return layer.id === project.selectedLayerId && layer.visible;
  });
  if (selected) drawSelection(ctx, project, layout, selected);
}

function drawLayer(ctx, project, layout, layer, media) {
  ctx.save();
  const origin = layerCenterView(layout, project, layer);
  ctx.translate(origin.x, origin.y);
  ctx.rotate(layer.transform.rotation * Math.PI / 180);
  ctx.scale(layer.transform.scaleX * layout.scale, layer.transform.scaleY * layout.scale);
  ctx.globalAlpha = clamp01(layer.transform.opacity);
  paintLayer(ctx, layer, media);
  ctx.restore();
}

function paintLayer(ctx, layer, media) {
  if (layer.type === "image" || layer.type === "video") {
    paintMedia(ctx, layer, media);
    return;
  }
  ctx.fillStyle = layer.fill || "#ffffff";
  if (layer.type === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(0, 0, layer.width / 2, layer.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    return;
  }
  if (layer.type === "text") {
    ctx.font = `${layer.fontSize}px ${LAYER_FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(layer.text, 0, 0);
    return;
  }
  ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
}

function paintMedia(ctx, layer, media) {
  const drawable = media && !media.failed && media.element && mediaReady(media);
  if (!drawable) {
    paintMissing(ctx, layer);
    return;
  }
  ctx.drawImage(
    media.element,
    -layer.width / 2,
    -layer.height / 2,
    layer.width,
    layer.height
  );
}

function mediaReady(media) {
  if (media.kind !== "video") return true;
  return media.element.readyState >= 2;
}

function paintMissing(ctx, layer) {
  ctx.fillStyle = "#3a3a3a";
  ctx.fillRect(-layer.width / 2, -layer.height / 2, layer.width, layer.height);
  ctx.fillStyle = "#f4efe6";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const size = Math.max(12, Math.min(layer.height * 0.18, 64));
  ctx.font = `${size}px ${LAYER_FONT}`;
  ctx.fillText(trimLabel(ctx, layer.name || "Unreadable", layer.width * 0.82), 0, 0);
}

function trimLabel(ctx, label, maxWidth) {
  if (ctx.measureText(label).width <= maxWidth) return label;
  let text = label;
  while (text.length > 1 && ctx.measureText(`${text}…`).width > maxWidth) {
    text = text.slice(0, -1);
  }
  return `${text}…`;
}

function drawSelection(ctx, project, layout, layer) {
  const handles = handlePoints(layer, layout);
  const corners = ["nw", "ne", "se", "sw"].map((name) => {
    return localToView(layout, project, layer, handles[name].x, handles[name].y);
  });
  const top = localToView(layout, project, layer, 0, -layer.height / 2);
  const rotate = localToView(layout, project, layer, handles.rotate.x, handles.rotate.y);

  ctx.save();
  ctx.strokeStyle = "#f4efe6";
  ctx.fillStyle = "#f4efe6";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const corner of corners.slice(1)) ctx.lineTo(corner.x, corner.y);
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(top.x, top.y);
  ctx.lineTo(rotate.x, rotate.y);
  ctx.stroke();
  for (const point of [...corners, rotate]) {
    ctx.fillRect(point.x - HANDLE / 2, point.y - HANDLE / 2, HANDLE, HANDLE);
  }
  ctx.restore();
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(1, Math.max(0, value));
}
