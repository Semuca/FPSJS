import { expect, test } from 'vitest';
import { IntersectionSegmentAndSegment, Point2D, Segment2D } from '../scripts/geometry';

test('idk', () => {
  expect(
    IntersectionSegmentAndSegment(
      new Segment2D(new Point2D(0, 0), new Point2D(1, 1)),
      new Segment2D(new Point2D(0, 0), new Point2D(1, 0)),
    ),
  ).toEqual(new Point2D(0, 0));
});
