import {
  Arc2D,
  Circle2D,
  distancePointToPoint,
  IntersectionRoundedSegmentAndSegment,
  IntersectionSegmentAndSegment,
  Point2D,
  RoundedSegment2D,
  Segment2D,
} from './geometry';

//TODO: Expand this to various objects, and make this a generic class that can made multiple times for a world (Can also be used for different worlds)
export const colliders: Segment2D[] = [];

// Modifies Circle2D with a new position based on the vector
export function MoveCircle(circle: Circle2D, vector: Point2D): void {
  // Create Segment2D based on movement
  const touchingColliders: Segment2D[] = [];
  const paths: (Segment2D | Arc2D)[] = [
    new Segment2D(
      circle.center,
      new Point2D(vector.x + circle.center.x, vector.y + circle.center.y),
    ),
  ];

  const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);

  // Keep moving until we go through the entire movement vector
  while (paths.length) {
    const pathSection = paths.shift();
    if (pathSection === undefined) return;

    // Test for the first collider that this section of the path will hit
    let collisionInfo: CollisionInfo | undefined;
    if (pathSection instanceof Segment2D) {
      collisionInfo = GetNextColliderOnSegment(pathSection, circle);
    } else if (pathSection instanceof Arc2D) {
      // collisionInfo = GetNextColliderOnArc(pathSection, circle);
    }

    // If there is no intersection, move the circle
    if (collisionInfo === undefined) {
      if (pathSection instanceof Segment2D) {
        circle.center = new Point2D(pathSection.point2.x, pathSection.point2.y);
      } else if (pathSection instanceof Arc2D) {
        circle.center = new Point2D(pathSection.secondPoint.x, pathSection.secondPoint.y);
      }
      continue;
    }

    const collider = collisionInfo.collider;
    if (touchingColliders.includes(collider)) {
      // If we are touching the same collider again, we are stuck
      break;
    }
    touchingColliders.push(collider);

    // Else (if there is some collision), construct the new paths from the vector and the collider
    paths.splice(0, paths.length);

    // Move the point at collision back by the radius
    const actualMoveLength = collisionInfo.distance - circle.radius;
    const extraMoveLength = magnitude - actualMoveLength;
    const actualMove = vector.toMagnitude(actualMoveLength);
    const positionAtCollision = new Point2D(
      circle.center.x + actualMove.x,
      circle.center.y + actualMove.y,
    );

    // Calculate slide and keep going
    // 1. Get acute angle between the collision gradient and the movVector
    const angle = Math.acos(
      ((collider.point1.x - collider.point2.x) * vector.x +
        (collider.point1.y - collider.point2.y) * vector.y) /
        (collider.length * magnitude),
    );
    // 2. Calculate length of the slide based using cosine
    const slideLength = Math.cos(angle) * extraMoveLength;
    // 3. Move the circle by the slide length
    circle.center = positionAtCollision;

    const colliderAngle = collider.angle < 0 ? collider.angle + Math.PI : collider.angle;
    paths.push(
      new Segment2D(
        circle.center,
        new Point2D(
          positionAtCollision.x + slideLength * Math.cos(colliderAngle),
          positionAtCollision.y + slideLength * Math.sin(colliderAngle),
        ),
      ),
    );
  }
}

interface CollisionInfo {
  collider: Segment2D;
  distance: number;
  intersection: Point2D;
}

// Gets next collider from a segment point 1 to point 2
// - Get the point of collision on both the movement vector and the collider?
export function GetNextColliderOnSegment(
  segment: Segment2D,
  circle?: Circle2D,
): CollisionInfo | undefined {
  let collisionInfo: CollisionInfo | undefined = undefined;
  colliders.forEach((collider) => {
    // Calculate intersection. Based on the assumption we do not start in a collider, we can assume that the intersection will never be a Segment2D
    let intersections: Point2D[] = [];
    if (!circle) {
      const _intersections = IntersectionSegmentAndSegment(segment, collider);
      if (_intersections === undefined) return;
      intersections =
        _intersections instanceof Segment2D
          ? [_intersections.point1, _intersections.point2]
          : [_intersections];
    } else {
      intersections = IntersectionRoundedSegmentAndSegment(
        new RoundedSegment2D(collider.point1, collider.point2, circle.radius),
        segment,
      );
    }

    intersections.forEach((intersection) => {
      const distance = distancePointToPoint(segment.point1, intersection);
      if (collisionInfo === undefined || distance < collisionInfo.distance) {
        collisionInfo = {
          collider,
          distance,
          intersection,
        };
      }
    });
  });
  return collisionInfo;
}

// Gets next collider from an arc from starting angle to ending angle
// function GetNextColliderOnArc(arc: Arc2D, circle: Circle2D) {
//   let smallestDistance = Number.MAX_VALUE;
//   let nextCollider: Segment2D | undefined = undefined;
//   colliders.forEach((collider) => {
//     const intersection = IntersectionArcAndSegment(arc, collider);
//   });
//   return nextCollider ? { collider: nextCollider, distance: smallestDistance } : undefined;
// }
