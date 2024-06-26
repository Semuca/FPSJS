import { describe, expect, test } from 'vitest';
import { IntersectionSegmentAndSegment, Point2D, Segment2D } from '../../scripts/geometry';

function testIntersection(
  firstSegmentPoint1: Point2D,
  firstSegmentPoint2: Point2D,
  secondSegmentPoint1: Point2D,
  secondSegmentPoint2: Point2D,
  equals: ReturnType<typeof IntersectionSegmentAndSegment>,
) {
  const segment1 = new Segment2D(firstSegmentPoint1, firstSegmentPoint2);
  const reversedSegment1 = new Segment2D(firstSegmentPoint2, firstSegmentPoint1);

  const segment2 = new Segment2D(secondSegmentPoint1, secondSegmentPoint2);
  const reversedSegment2 = new Segment2D(secondSegmentPoint2, secondSegmentPoint1);

  [segment1, reversedSegment1].forEach((first) => {
    [segment2, reversedSegment2].forEach((second) => {
      expect(IntersectionSegmentAndSegment(first, second)).toEqual(equals);
    });
  });
}

describe('IntersectionSegmentAndSegment', () => {
  describe('parallel lines', () => {
    describe('vertical lines', () => {
      test("don't intersect when above each other", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(0, 1),
          new Point2D(0, 2),
          new Point2D(0, 3),
          undefined,
        );
      });

      test("don't intersect when next to each other", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(0, 1),
          new Point2D(1, 0),
          new Point2D(1, 1),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Point2D(0, 1),
          new Point2D(0, 3),
          new Point2D(0, 0),
          new Point2D(0, 2),
          new Segment2D(new Point2D(0, 1), new Point2D(0, 2)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Point2D(0, 1),
          new Point2D(0, 2),
          new Point2D(0, 0),
          new Point2D(0, 3),
          new Segment2D(new Point2D(0, 1), new Point2D(0, 2)),
        );
      });
    });

    describe('horizontal lines', () => {
      test("don't intersect when above each other", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(0, 1),
          new Point2D(1, 1),
          undefined,
        );
      });

      test("don't intersect when next to each other", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(2, 0),
          new Point2D(3, 0),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Point2D(1, 0),
          new Point2D(3, 0),
          new Point2D(0, 0),
          new Point2D(2, 0),
          new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Point2D(1, 0),
          new Point2D(2, 0),
          new Point2D(0, 0),
          new Point2D(3, 0),
          new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
        );
      });
    });

    describe('diagonal lines', () => {
      test("don't intersect when aligned but not overlapping", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 1),
          new Point2D(2, 2),
          new Point2D(3, 3),
          undefined,
        );
      });

      test("don't intersect when within each other's bounding box", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(2, 2),
          new Point2D(1, 0),
          new Point2D(2, 1),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(2, 2),
          new Point2D(1, 1),
          new Point2D(3, 3),
          new Segment2D(new Point2D(1, 1), new Point2D(2, 2)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(2, 2),
          new Point2D(1, 1),
          new Point2D(3, 3),
          new Segment2D(new Point2D(1, 1), new Point2D(2, 2)),
        );
      });
    });
  });

  describe('non-parallel lines', () => {
    describe('one vertical line', () => {
      describe('horizontal line', () => {
        test("doesn't intersect when above", () => {
          testIntersection(
            new Point2D(0, 0),
            new Point2D(0, 1),
            new Point2D(0, 2),
            new Point2D(2, 2),
            undefined,
          );
        });

        test("doesn't intersect when adjacent", () => {
          testIntersection(
            new Point2D(0, 0),
            new Point2D(0, 1),
            new Point2D(1, 0),
            new Point2D(2, 0),
            undefined,
          );
        });
      });
    });

    describe('one horizontal line', () => {
      test("doesn't intersect with diagonal line when above", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(0, 1),
          new Point2D(1, 2),
          undefined,
        );
      });

      test("doesn't intersect with diagonal line when adjacent", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(2, 0),
          new Point2D(3, 1),
          undefined,
        );
      });

      test('intersects with diagonal line when overlapping end', () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(1, 0),
          new Point2D(0, 0),
          new Point2D(1, 1),
          new Point2D(0, 0),
        );
      });

      test('intersects with diagonal line when overlapping middle', () => {
        testIntersection(
          new Point2D(0, 1),
          new Point2D(2, 1),
          new Point2D(0, 0),
          new Point2D(2, 2),
          new Point2D(1, 1),
        );
      });
    });

    describe('diagonal lines', () => {
      test("doesn't intersect when bounding boxes intersect and diagonals point towards each other", () => {
        testIntersection(
          new Point2D(0, 0),
          new Point2D(4, 4),
          new Point2D(0, 4),
          new Point2D(1, 3),
          undefined,
        );
      });

      test('intersects overlapping lines', () => {
        testIntersection(
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
