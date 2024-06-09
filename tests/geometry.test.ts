import { describe, expect, test } from 'vitest';
import { IntersectionSegmentAndSegment, Point2D, Segment2D } from '../scripts/geometry';

function testIntersection(segment1: Segment2D, segment2: Segment2D, equals: any) {
  expect(IntersectionSegmentAndSegment(segment1, segment2)).toEqual(equals);
  expect(IntersectionSegmentAndSegment(segment2, segment1)).toEqual(equals);
}

describe('IntersectionSegmentAndSegment', () => {
  describe('parallel lines', () => {
    describe('vertical lines', () => {
      test("don't intersect when above each other", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
          new Segment2D(new Point2D(0, 2), new Point2D(0, 3)),
          undefined,
        );
      });

      test("don't intersect when next to each other", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
          new Segment2D(new Point2D(1, 0), new Point2D(1, 1)),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(0, 1), new Point2D(0, 3)),
          new Segment2D(new Point2D(0, 0), new Point2D(0, 2)),
          new Segment2D(new Point2D(0, 1), new Point2D(0, 2)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(0, 1), new Point2D(0, 2)),
          new Segment2D(new Point2D(0, 0), new Point2D(0, 3)),
          new Segment2D(new Point2D(0, 1), new Point2D(0, 2)),
        );
      });
    });

    describe('horizontal lines', () => {
      test("don't intersect when above each other", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(1, 0)),
          new Segment2D(new Point2D(0, 1), new Point2D(1, 1)),
          undefined,
        );
      });

      test("don't intersect when next to each other", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(1, 0)),
          new Segment2D(new Point2D(2, 0), new Point2D(3, 0)),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(1, 0), new Point2D(3, 0)),
          new Segment2D(new Point2D(0, 0), new Point2D(2, 0)),
          new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
          new Segment2D(new Point2D(0, 0), new Point2D(3, 0)),
          new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
        );
      });
    });

    describe('diagonal lines', () => {
      test("don't intersect when aligned but not overlapping", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(1, 1)),
          new Segment2D(new Point2D(2, 2), new Point2D(3, 3)),
          undefined,
        );
      });

      test("don't intersect when within each other's bounding box", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(2, 2)),
          new Segment2D(new Point2D(1, 0), new Point2D(2, 1)),
          undefined,
        );
      });

      test('intersect when partially overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(2, 2)),
          new Segment2D(new Point2D(1, 1), new Point2D(3, 3)),
          new Segment2D(new Point2D(1, 1), new Point2D(2, 2)),
        );
      });

      test('intersect when completely overlap', () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(2, 2)),
          new Segment2D(new Point2D(1, 1), new Point2D(3, 3)),
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
            new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
            new Segment2D(new Point2D(0, 2), new Point2D(2, 2)),
            undefined,
          );
        });

        test("doesn't intersect when adjacent", () => {
          testIntersection(
            new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
            new Segment2D(new Point2D(1, 0), new Point2D(2, 0)),
            undefined,
          );
        });
      });
    });

    describe('one horizontal line', () => {
      test("doesn't intersect with diagonal line when above", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(1, 0)),
          new Segment2D(new Point2D(0, 1), new Point2D(1, 2)),
          undefined,
        );
      });

      test("doesn't intersect with diagonal line when adjacent", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(1, 0)),
          new Segment2D(new Point2D(2, 0), new Point2D(3, 1)),
          undefined,
        );
      });
    });

    describe('diagonal lines', () => {
      test("doesn't intersect when bounding boxes intersect and diagonals point towards each other", () => {
        testIntersection(
          new Segment2D(new Point2D(0, 0), new Point2D(4, 4)),
          new Segment2D(new Point2D(0, 4), new Point2D(3, 3)),
          undefined,
        );
      });
    });
  });
});
