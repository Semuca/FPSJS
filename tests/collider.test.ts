import { describe, expect, test } from 'vitest';
import { Circle2D, Point2D, Segment2D } from '../scripts/geometry';
import { colliders, MoveCircle } from '../scripts/collider';

// describe('GetNextColliderOnSegment', () => {
//   const circle = new Circle2D(new Point2D(0, 0), 1);
//   colliders.push(new Segment2D(new Point2D(2, 0), new Point2D(2, 2)));

//   test('no collision', () => {
//     const result = GetNextColliderOnSegment(
//       new Segment2D(new Point2D(0, 0), new Point2D(0, 1)),
//       circle,
//     );
//     expect(result?.collider).toEqual(colliders[0]);
//   });
//   test('no collision', () => {
//     const result = GetNextColliderOnSegment(
//       new Segment2D(new Point2D(0, 1), new Point2D(1, 1)),
//       circle,
//     );
//     expect(result?.collider).toEqual(colliders[0]);
//   });
// });

colliders.splice(0, colliders.length);

describe('MoveCircle', () => {
  colliders.push(
    new Segment2D(new Point2D(1, 0), new Point2D(1, 2)),
    new Segment2D(new Point2D(1, 2), new Point2D(0, 4)),
  );

  test('no collision', () => {
    const circle = new Circle2D(new Point2D(0, 0), 0);

    MoveCircle(circle, new Point2D(0, 1));
    expect(circle.center).toEqual(new Point2D(0, 1));
  });

  // test('collision with slide', () => {
  //   const circle = new Circle2D(new Point2D(0, 0), 0);

  //   MoveCircle(circle, new Point2D(2, 2));
  //   expect(circle.center.x).toBeCloseTo(1);
  //   expect(circle.center.y).toBeCloseTo(2);
  // });

  // test('collision with slide on two walls', () => {
  //   colliders.splice(0, colliders.length);
  //   colliders.push(
  //     new Segment2D(new Point2D(-3, -3), new Point2D(5, 3)),
  //     new Segment2D(new Point2D(5, 3), new Point2D(11, 11)),
  //   );
  //   const circle = new Circle2D(new Point2D(0, 0), 0);

  //   MoveCircle(circle, new Point2D(15, 0));
  //   expect(circle.center).toEqual(new Point2D(8, 7));
  // });
});
