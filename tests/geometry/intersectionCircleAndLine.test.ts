import { describe, expect, test } from 'vitest';
import {
  Circle2D,
  IntersectionCircleAndLine,
  Line2D,
  Point2D,
  roundToPlaces,
} from '../../scripts/geometry';
import { comparePoints } from '../helpers';

const sqrt2 = roundToPlaces(1 / Math.sqrt(2), 6);

describe('IntersectionCircleAndLine', () => {
  describe('no intersection', () => {
    test('horizontal line', () => {
      expect(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 2)),
        ),
      ).toEqual([]);
    });
    test('vertical line', () => {
      expect(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(2, 0)),
        ),
      ).toEqual([]);
    });
    test('positive diagonal line', () => {
      expect(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(1, new Point2D(0, 2)),
        ),
      ).toEqual([]);
    });
    test('negative diagonal line', () => {
      expect(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(-1, new Point2D(0, 2)),
        ),
      ).toEqual([]);
    });
  });

  describe('one intersection', () => {
    test('horizontal line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 1)),
        ),
        [new Point2D(0, 1)],
      );
    });
    test('vertical line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(1, 0)),
        ),
        [new Point2D(1, 0)],
      );
    });
  });

  describe('two intersections', () => {
    test('horizontal line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 0)),
        ),
        [new Point2D(-1, 0), new Point2D(1, 0)],
      );
    });
    test('vertical line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(0, 0)),
        ),
        [new Point2D(0, -1), new Point2D(0, 1)],
      );
    });
    test('positive diagonal line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(1, new Point2D(0, 0)),
        ),
        [new Point2D(-sqrt2, -sqrt2), new Point2D(sqrt2, sqrt2)],
      );
    });
    test('positive diagonal line', () => {
      comparePoints(
        IntersectionCircleAndLine(
          new Circle2D(new Point2D(0, 0), 1),
          Line2D.fromGradientAndPoint(-1, new Point2D(0, 0)),
        ),
        [new Point2D(-sqrt2, sqrt2), new Point2D(sqrt2, -sqrt2)],
      );
    });
  });
});
