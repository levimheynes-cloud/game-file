import assert from "node:assert/strict";
import test from "node:test";
import {
  addLayer,
  addMediaLayer,
  createProject,
  deleteLayer,
  moveLayer,
  selectLayer,
  updateLayer
} from "./project.js";

test("a new project is an empty 1920 by 1080 frame", () => {
  const project = createProject();
  assert.equal(project.width, 1920);
  assert.equal(project.height, 1080);
  assert.equal(project.fps, 30);
  assert.equal(project.duration, 5);
  assert.equal(project.playhead, 0);
  assert.equal(project.selectedLayerId, null);
  assert.deepEqual(project.layers, []);
});

test("adding a shape centers it, names it, and selects it", () => {
  const project = createProject();
  const rectangle = addLayer(project, "rectangle");
  assert.equal(rectangle.name, "Rectangle 1");
  assert.equal(rectangle.type, "rectangle");
  assert.equal(rectangle.width, 480);
  assert.equal(rectangle.height, 270);
  assert.equal(rectangle.fill, "#ffffff");
  assert.equal(rectangle.visible, true);
  assert.equal(rectangle.inPoint, 0);
  assert.equal(rectangle.outPoint, 5);
  assert.equal(rectangle.transform.x, 0);
  assert.equal(rectangle.transform.y, 0);
  assert.equal(rectangle.transform.scaleX, 1);
  assert.equal(rectangle.transform.scaleY, 1);
  assert.equal(rectangle.transform.rotation, 0);
  assert.equal(rectangle.transform.opacity, 1);
  assert.equal(project.selectedLayerId, rectangle.id);

  const ellipse = addLayer(project, "ellipse");
  assert.equal(ellipse.name, "Ellipse 1");
  assert.equal(ellipse.width, 360);
  assert.equal(ellipse.height, 360);
  assert.equal(project.selectedLayerId, ellipse.id);

  const text = addLayer(project, "text");
  assert.equal(text.name, "Text 1");
  assert.equal(text.text, "Text");
  assert.equal(text.fontSize, 120);
  assert.equal(text.height, 120);
  assert.ok(text.width > 0);
});

test("shape names keep counting after one is deleted", () => {
  const project = createProject();
  const first = addLayer(project, "rectangle");
  addLayer(project, "rectangle");
  deleteLayer(project, first.id);
  assert.equal(addLayer(project, "rectangle").name, "Rectangle 3");
});

test("select, rename, update, and delete go through the writers", () => {
  const project = createProject();
  const rectangle = addLayer(project, "rectangle");
  const text = addLayer(project, "text");

  selectLayer(project, rectangle.id);
  assert.equal(project.selectedLayerId, rectangle.id);

  updateLayer(project, text.id, { name: "Title", text: "Hello", fontSize: 80 });
  assert.equal(text.name, "Title");
  assert.equal(text.text, "Hello");
  assert.equal(text.fontSize, 80);
  assert.equal(text.height, 80);

  updateLayer(project, rectangle.id, {
    fill: "#ff0000",
    transform: { x: 20, y: -10 }
  });
  assert.equal(rectangle.fill, "#ff0000");
  assert.equal(rectangle.transform.x, 20);
  assert.equal(rectangle.transform.y, -10);
  assert.equal(rectangle.transform.scaleX, 1);

  deleteLayer(project, rectangle.id);
  assert.equal(project.layers.length, 1);
  assert.equal(project.selectedLayerId, text.id);

  selectLayer(project, null);
  assert.equal(project.selectedLayerId, null);
});

test("an imported image or video fits inside the frame", () => {
  const project = createProject();
  const image = addMediaLayer(project, {
    name: "still.png",
    mediaType: "image",
    mediaId: "media-1",
    sourceWidth: 1000,
    sourceHeight: 500
  });
  assert.equal(image.type, "image");
  assert.equal(image.name, "still.png");
  assert.equal(image.mediaId, "media-1");
  assert.equal(image.width, 1920);
  assert.equal(image.height, 960);
  assert.equal(image.transform.x, 0);
  assert.equal(project.selectedLayerId, image.id);

  const video = addMediaLayer(project, {
    name: "clip.mp4",
    mediaType: "video",
    mediaId: "media-2",
    sourceWidth: 1080,
    sourceHeight: 1920
  });
  assert.equal(video.type, "video");
  assert.equal(video.mediaId, "media-2");
  assert.equal(video.width, 607.5);
  assert.equal(video.height, 1080);

  const unreadable = addMediaLayer(project, {
    name: "bad.mov",
    mediaType: "video",
    mediaId: "media-3",
    sourceWidth: 0,
    sourceHeight: 0
  });
  assert.equal(unreadable.name, "bad.mov");
  assert.equal(unreadable.width, 480);
  assert.equal(unreadable.height, 270);
});

test("moveLayer changes stack order and keeps every layer", () => {
  const project = createProject();
  const back = addLayer(project, "rectangle");
  const middle = addLayer(project, "ellipse");
  const front = addLayer(project, "text");
  moveLayer(project, back.id, 2);
  assert.deepEqual(
    project.layers.map((layer) => layer.id),
    [middle.id, front.id, back.id]
  );
});
