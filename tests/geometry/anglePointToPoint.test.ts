import { describe, expect, test } from 'vitest';
import { anglePointToPoint, Point2D } from '../../scripts/geometry';

describe('anglePointToPoint', () => {
  test('angle to a point to the right is 0', () => {
    expect(anglePointToPoint(new Point2D(0, 0), new Point2D(1, 0))).toBeCloseTo(0);
  });

  test('angle to a point above is pi / 2', () => {
    expect(anglePointToPoint(new Point2D(0, 0), new Point2D(0, 1))).toBeCloseTo(Math.PI / 2);
  });

  test('angle to a point to the left is pi', () => {
    expect(anglePointToPoint(new Point2D(0, 0), new Point2D(-1, 0))).toBeCloseTo(Math.PI);
  });

  test('angle to a point below is -pi / 2', () => {
    expect(anglePointToPoint(new Point2D(0, 0), new Point2D(0, -1))).toBeCloseTo(-Math.PI / 2);
  });
});
