import assert from "node:assert/strict";
import test from "node:test";
import { addLayer, createProject, updateLayer } from "./project.js";
import { frameLayout, hitTest } from "./stage.js";

function layoutFor(project) {
  return frameLayout(project.width, project.height, project);
}

test("hitTest selects the front layer and misses empty space", () => {
  const project = createProject();
  const back = addLayer(project, "rectangle");
  const front = addLayer(project, "ellipse");
  updateLayer(project, front.id, { transform: { x: 400 } });
  const layout = layoutFor(project);

  const center = hitTest(project, layout, 960, 540);
  assert.equal(center.type, "layer");
  assert.equal(center.layer.id, back.id);

  const onFront = hitTest(project, layout, 960 + 400, 540);
  assert.equal(onFront.layer.id, front.id);

  const outside = hitTest(project, layout, 10, 10);
  assert.equal(outside.type, "empty");
});

test("a hidden layer cannot be hit on the picture", () => {
  const project = createProject();
  const rectangle = addLayer(project, "rectangle");
  updateLayer(project, rectangle.id, { visible: false });
  const hit = hitTest(project, layoutFor(project), 960, 540);
  assert.equal(hit.type, "empty");
});

test("the handle above a selected layer rotates it", () => {
  const project = createProject();
  const rectangle = addLayer(project, "rectangle");
  const layout = layoutFor(project);
  const hit = hitTest(project, layout, 960, 540 - rectangle.height / 2 - 24);
  assert.equal(hit.type, "handle");
  assert.equal(hit.handle, "rotate");
});

test("the corner of a selected layer is a scale handle", () => {
  const project = createProject();
  const rectangle = addLayer(project, "rectangle");
  const layout = layoutFor(project);
  const hit = hitTest(project, layout, 960 + rectangle.width / 2, 540 - rectangle.height / 2);
  assert.equal(hit.type, "handle");
  assert.equal(hit.handle, "ne");
  assert.equal(hit.layer.id, rectangle.id);
});
