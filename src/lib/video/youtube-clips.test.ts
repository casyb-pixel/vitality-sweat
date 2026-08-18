import test from "node:test";
import assert from "node:assert/strict";
import {
  formatSecondsToClock,
  parseClockToSeconds,
  parseYouTubeVideoId,
  youtubeEmbedSrc,
} from "./youtube-clips";

test("parses watch, short, live, and youtu.be ids", () => {
  assert.equal(
    parseYouTubeVideoId("https://www.youtube.com/watch?v=dQw4w9wgGcQ"),
    "dQw4w9wgGcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://youtu.be/dQw4w9wgGcQ"),
    "dQw4w9wgGcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://www.youtube.com/live/dQw4w9wgGcQ"),
    "dQw4w9wgGcQ",
  );
  assert.equal(
    parseYouTubeVideoId("https://www.youtube.com/shorts/dQw4w9wgGcQ"),
    "dQw4w9wgGcQ",
  );
});

test("clock strings convert both ways", () => {
  assert.equal(parseClockToSeconds("83"), 83);
  assert.equal(parseClockToSeconds("1:23"), 83);
  assert.equal(parseClockToSeconds("1:02:03"), 3723);
  assert.equal(formatSecondsToClock(83), "1:23");
  assert.equal(formatSecondsToClock(3723), "1:02:03");
});

test("embed includes start and end", () => {
  const src = youtubeEmbedSrc({
    videoId: "dQw4w9wgGcQ",
    startSec: 12,
    endSec: 40,
    autoplay: false,
  });
  assert.match(src, /embed\/dQw4w9wgGcQ/);
  assert.match(src, /start=12/);
  assert.match(src, /end=40/);
});
