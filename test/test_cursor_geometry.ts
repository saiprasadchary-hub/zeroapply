import assert from 'node:assert/strict';

// Test geometry
const arrowPath = "M 16 8 L 26.5 18.5 L 22.2 18.5 L 25.5 25.1 L 23.5 26.1 L 20.2 19.5 L 16 23.5 Z";

console.log("Testing Arrow Geometry:");
console.log("- Arrow Hotspot:", { x: 16, y: 8 });
console.log("- Arrow bounding box: x in [16, 26.5], y in [8, 26.1]");

// Left earcup coordinates
const leftEarcup = { x: 31.8, y: 36, width: 3.4, height: 11 };
console.log("- Left earcup bounding box: x in [31.8, 35.2], y in [36, 47]");

// Distance calculation
const deltaX = leftEarcup.x - 26.5; // distance from rightmost arrow point to leftmost earcup
const deltaY = leftEarcup.y - 26.1; // distance from bottom-most arrow point to top of earcup
console.log("- Horizontal gap between arrow and avatar:", deltaX.toFixed(2), "px");
console.log("- Vertical gap between arrow bottom and avatar top:", deltaY.toFixed(2), "px");

assert.ok(deltaX > 5, "Horizontal gap must be > 5px for clear distance");
assert.ok(deltaY > 8, "Vertical gap must be > 8px for clear distance");

console.log("✅ Math checks out! Generous clearance between cursor arrow and avatar.");
