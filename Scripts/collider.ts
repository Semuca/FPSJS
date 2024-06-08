import { Circle2D, ClosestSegmentPointToPoint, distancePointToPoint, IntersectionSegmentAndSegment, Point2D, Segment2D, ShortestDistanceFromPointToSegment } from "./geometry";

//TODO: Expand this to various objects, and make this a generic class that can made multiple times for a world (Can also be used for different worlds)
export const colliders: Segment2D[] = [];

// Modifies Circle2D with a new position based on the vector
export function MoveCircle(circle: Circle2D, vector: Point2D): void {
    // Create Segment2D based on movement
    const movVector = new Segment2D(circle.center, new Point2D(vector.x + circle.center.x, vector.y + circle.center.y));

    // Test for the first collider that intersects with the RoundedSegment
    let smallestIntersectionDistance = Number.MAX_VALUE;
    let smallestIntersectionIndex = undefined;
    colliders.forEach((collider, index) => {
        // Calculate intersection. Based on the assumption we do not start in a collider, we can assumed that the intersection will never be a Segment2D
        const intersection = IntersectionSegmentAndSegment(collider, movVector) as Point2D | undefined;
        const p1 = ClosestSegmentPointToPoint(collider.point1, movVector);
        const p1Dist = distancePointToPoint(collider.point1, p1);
        const p2 = ClosestSegmentPointToPoint(collider.point2, movVector);
        const p2Dist = distancePointToPoint(collider.point2, p2);

        // If there is an intersection, and it would occur before the current intersection, store it
        if (intersection) {
            const distance = distancePointToPoint(movVector.point1, intersection);
            if (distance < smallestIntersectionDistance) {
                smallestIntersectionDistance = distance;
                smallestIntersectionIndex = index;
            }
        }

        if (p1Dist < circle.radius) {
            const distance = distancePointToPoint(movVector.point1, p1);
            if (distance < smallestIntersectionDistance) {
                smallestIntersectionDistance = distance;
                smallestIntersectionIndex = index;
            }
        }

        if (p2Dist < circle.radius) {
            const distance = distancePointToPoint(movVector.point1, p2);
            if (distance < smallestIntersectionDistance) {
                smallestIntersectionDistance = distance;
                smallestIntersectionIndex = index;
            }
        }
    });

    // If there is no intersection, move the circle
    if (smallestIntersectionIndex === undefined) {
        circle.center = new Point2D(movVector.point2.x, movVector.point2.y);
        return;
    }

    const collider = colliders[smallestIntersectionIndex];

    // Move the point at collision back by the radius
    const actualMove = vector.toMagnitude(smallestIntersectionDistance - circle.radius);
    const positionAtCollision = new Point2D(circle.center.x + actualMove.x, circle.center.y + actualMove.y);

    // Calculate slide and keep going
    // Get acute angle between the collision gradient and the movVector
    // Calculate length of the slide based using cosine
    // Move the circle by the slide
    circle.center = positionAtCollision;


    // If there is an intersection on a point, move the circle around the point
}