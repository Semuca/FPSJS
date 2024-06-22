import { describe, expect, test } from 'vitest';
import { IntersectionLineAndLine, Line2D, Point2D } from '../../scripts/geometry';

function testIntersectionLineAndLine(
  firstLinePoint1: Point2D,
  firstLinePoint2: Point2D,
  secondLinePoint1: Point2D,
  secondLinePoint2: Point2D,
  equals: ReturnType<typeof IntersectionLineAndLine>,
) {
  const line1 = Line2D.fromPoints(firstLinePoint1, firstLinePoint2);
  const reversedLine1 = Line2D.fromPoints(firstLinePoint2, firstLinePoint1);

  const line2 = Line2D.fromPoints(secondLinePoint1, secondLinePoint2);
  const reversedLine2 = Line2D.fromPoints(secondLinePoint2, secondLinePoint1);

  [line1, reversedLine1].forEach((first) => {
    [line2, reversedLine2].forEach((second) => {
      expect(IntersectionLineAndLine(first, second)).toEqual(equals);
    });
  });
}

function testIntersectionLineAndLineOverlap(
  firstLinePoint1: Point2D,
  firstLinePoint2: Point2D,
  secondLinePoint1: Point2D,
  secondLinePoint2: Point2D,
) {
  const line1 = Line2D.fromPoints(firstLinePoint1, firstLinePoint2);
  const reversedLine1 = Line2D.fromPoints(firstLinePoint2, firstLinePoint1);

  const line2 = Line2D.fromPoints(secondLinePoint1, secondLinePoint2);
  const reversedLine2 = Line2D.fromPoints(secondLinePoint2, secondLinePoint1);

  [line1, reversedLine1].forEach((first) => {
    [line2, reversedLine2].forEach((second) => {
      expect(IntersectionLineAndLine(first, second)).toEqual(first);
    });
  });
}

describe('IntersectionLineAndLine', () => {
  describe('parallel lines', () => {
    describe('vertical lines', () => {
      test("don't intersect when next to each other", () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(0, 1),
          new Point2D(1, 0),
          new Point2D(1, 1),
          undefined,
        );
      });

      test('intersect when overlap', () => {
        testIntersectionLineAndLineOverlap(
          new Point2D(0, 0),
          new Point2D(0, 1),
          new Point2D(0, 1),
          new Point2D(0, 2),
        );
      });
    });

    describe('horizontal lines', () => {
      test("don't intersect when above each other", () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(0, 1),
          new Point2D(1, 1),
          undefined,
        );
      });

      test('intersect when overlap', () => {
        testIntersectionLineAndLineOverlap(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(2, 0),
          new Point2D(3, 0),
        );
      });
    });

    describe('diagonal lines', () => {
      test("don't intersect when above each other", () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(1, 1),
          new Point2D(0, 1),
          new Point2D(1, 2),
          undefined,
        );
      });

      test('intersect when overlap', () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(1, 1),
          new Point2D(2, 2),
          new Point2D(3, 3),
          Line2D.fromPoints(new Point2D(0, 0), new Point2D(1, 1)),
        );
      });
    });
  });

  describe('non-parallel lines', () => {
    describe('one vertical line', () => {
      test('intersect with horizontal line', () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(0, 2),
          new Point2D(0, 3),
          new Point2D(0, 0),
        );
      });
    });

    describe('diagonal lines', () => {
      test('intersects', () => {
        testIntersectionLineAndLine(
          new Point2D(0, 0),
          new Point2D(4, 4),
          new Point2D(1, 0),
          new Point2D(3, 4),
          new Point2D(2, 2),
        );
      });
    });
  });
});
