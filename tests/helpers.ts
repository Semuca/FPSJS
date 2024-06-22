import { expect } from 'vitest';
import { Point2D } from '../scripts/geometry';

export function comparePoints(points: Point2D[], expected: Point2D[]) {
  expect(points.length).toBe(expected.length);
  for (let i = 0; i < points.length; i++) {
    comparePoint(points[i], expected[i]);
  }
}

export function comparePoint(point: Point2D, expected: Point2D) {
  expect(point.x).toBeCloseTo(expected.x);
  expect(point.y).toBeCloseTo(expected.y);
}
