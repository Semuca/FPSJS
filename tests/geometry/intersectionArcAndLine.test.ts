import { describe, expect, test } from 'vitest';
import { Arc2D, IntersectionArcAndLine, Line2D, Point2D } from '../../scripts/geometry';
import { comparePoints } from '../helpers';

describe('IntersectionArcAndLine', () => {
  describe('no intersection', () => {
    test('horizontal line intersecting full circle', () => {
      expect(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, Math.PI / 4, Math.PI / 2),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 0)),
        ),
      ).toEqual([]);
    });

    test('vertical line intersecting full circle', () => {
      expect(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, 0, Math.PI / 4),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(0, 0)),
        ),
      ).toEqual([]);
    });
  });

  describe('one intersection', () => {
    test('horizontal line intersecting arc', () => {
      comparePoints(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, 0, Math.PI / 2),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 0)),
        ),
        [new Point2D(1, 0)],
      );
    });

    test('horizontal line intersecting arc on the negative x axis', () => {
      comparePoints(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, Math.PI / 4, Math.PI),
          Line2D.fromGradientAndPoint(0, new Point2D(0, 0)),
        ),
        [new Point2D(-1, 0)],
      );
    });

    test('vertical line intersecting arc', () => {
      comparePoints(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, 0, Math.PI),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(0, 0)),
        ),
        [new Point2D(0, 1)],
      );
    });

    test('vertical line intersecting arc on the negative y axis', () => {
      comparePoints(
        IntersectionArcAndLine(
          new Arc2D(new Point2D(0, 0), 1, Math.PI, Math.PI),
          Line2D.fromGradientAndPoint(Infinity, new Point2D(0, 0)),
        ),
        [new Point2D(0, -1)],
      );
    });
  });
});
