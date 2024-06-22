import {
  Arc2D,
  Circle2D,
  ClosestSegmentPointToPoint,
  distancePointToPoint,
  IntersectionArcAndSegment,
  IntersectionSegmentAndSegment,
  Point2D,
  Segment2D,
} from './geometry';

//TODO: Expand this to various objects, and make this a generic class that can made multiple times for a world (Can also be used for different worlds)
export const colliders: Segment2D[] = [];

// Modifies Circle2D with a new position based on the vector
export function MoveCircle(circle: Circle2D, vector: Point2D): void {
  // Create Segment2D based on movement
  const paths: (Segment2D | Arc2D)[] = [
    new Segment2D(
      circle.center,
      new Point2D(vector.x + circle.center.x, vector.y + circle.center.y),
    ),
  ];

  const magnitude = Math.sqrt(vector.x ** 2 + vector.y ** 2);

  // Keep moving until we go through the entire movement vector
  let loop = 0;
  while (paths.length && loop < 3) {
    const pathSection = paths.shift();
    if (pathSection === undefined) return;

    // Test for the first collider that this section of the path will hit
    let collisionInfo: CollisionInfo | undefined;
    if (pathSection instanceof Segment2D) {
      collisionInfo = GetNextColliderOnSegment(pathSection, circle);
    } else if (pathSection instanceof Arc2D) {
      collisionInfo = GetNextColliderOnArc(pathSection, circle);
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

    paths.push(
      new Segment2D(
        circle.center,
        new Point2D(
          positionAtCollision.x + slideLength * Math.cos(collider.angle),
          positionAtCollision.y + slideLength * Math.sin(collider.angle),
        ),
      ),
    );
    loop++;
  }
}

interface CollisionInfo {
  collider: Segment2D;
  distance: number;
  positionAtCollision: Point2D;
  intersection: Point2D;
}

// Gets next collider from a segment point 1 to point 2
// - Get the point of collision on both the movement vector and the collider?
export function GetNextColliderOnSegment(
  segment: Segment2D,
  circle: Circle2D,
): CollisionInfo | undefined {
  let smallestDistance = Number.MAX_VALUE;
  let nextCollider: Segment2D | undefined = undefined;
  colliders.forEach((collider) => {
    // Calculate intersection. Based on the assumption we do not start in a collider, we can assume that the intersection will never be a Segment2D
    const intersection = IntersectionSegmentAndSegment(collider, segment) as Point2D | undefined;

    const p1 = ClosestSegmentPointToPoint(collider.point1, segment);
    const p1Dist = distancePointToPoint(collider.point1, p1);
    const p2 = ClosestSegmentPointToPoint(collider.point2, segment);
    const p2Dist = distancePointToPoint(collider.point2, p2);

    // If there is an intersection, and it would occur before the current intersection, store it
    if (intersection) {
      const distance = distancePointToPoint(segment.point1, intersection);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nextCollider = collider;
      }
    }

    if (p1Dist < circle.radius) {
      const distance = distancePointToPoint(segment.point1, p1);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nextCollider = collider;
      }
    }

    if (p2Dist < circle.radius) {
      const distance = distancePointToPoint(segment.point1, p2);
      if (distance < smallestDistance) {
        smallestDistance = distance;
        nextCollider = collider;
      }
    }
  });
  return nextCollider ? { collider: nextCollider, distance: smallestDistance } : undefined;
}

// Gets next collider from an arc from starting angle to ending angle
function GetNextColliderOnArc(arc: Arc2D, circle: Circle2D) {
  let smallestDistance = Number.MAX_VALUE;
  let nextCollider: Segment2D | undefined = undefined;
  colliders.forEach((collider) => {
    const intersection = IntersectionArcAndSegment(arc, collider);
  });
  return nextCollider ? { collider: nextCollider, distance: smallestDistance } : undefined;
}
