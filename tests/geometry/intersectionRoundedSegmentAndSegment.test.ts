import { describe, expect, test } from 'vitest';
import {
  IntersectionRoundedSegmentAndSegment,
  Point2D,
  RoundedSegment2D,
  Segment2D,
} from '../../scripts/geometry';

describe('IntersectionRoundedSegmentAndSegment', () => {
  describe('no intersection', () => {
    test("don't intersect when next to each other", () => {
      expect(
        IntersectionRoundedSegmentAndSegment(
          new RoundedSegment2D(new Point2D(2, 0), new Point2D(2, 2), 1),
          new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
        ),
      ).toEqual([]);
    });

    test("don't intersect when above to each other", () => {
      expect(
        IntersectionRoundedSegmentAndSegment(
          new RoundedSegment2D(new Point2D(0, 0), new Point2D(0, 2), 1),
          new Segment2D(new Point2D(0, 4), new Point2D(0, 5)),
        ),
      ).toEqual([]);
    });
  });

  describe('intersection', () => {
    test('intersect with line segments', () => {
      expect(
        IntersectionRoundedSegmentAndSegment(
          new RoundedSegment2D(new Point2D(2, 0), new Point2D(2, 2), 1),
          new Segment2D(new Point2D(0, 1), new Point2D(3, 1)),
        ),
      ).toEqual([new Point2D(3, 1), new Point2D(1, 1)]);
    });
  });
});
