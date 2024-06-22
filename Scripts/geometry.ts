export function mod(number: number, n: number): number {
  return ((number % n) + n) % n;
}

export function roundToPlaces(number: number, to: number): number {
  const multiplier = 10 ** to;
  return Math.round(number * multiplier) / multiplier;
}

export function roundToNearest(number: number, to: number): number {
  return Math.round(number / to) * to;
}

export class Point2D {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  toMagnitude(magnitude: number): Point2D {
    const magnitudeRatio = magnitude / Math.sqrt(this.x ** 2 + this.y ** 2);
    return new Point2D(this.x * magnitudeRatio, this.y * magnitudeRatio);
  }
}

export function distancePointToPoint(point1: Point2D, point2: Point2D): number {
  return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

export function anglePointToPoint(point1: Point2D, point2: Point2D): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}

export class Line2D {
  gradient: number;
  normalGradient: number;

  angle: number;
  normalAngle: number;

  xIntercept: number;
  yIntercept: number;

  constructor(gradient: number, xIntercept: number, yIntercept: number) {
    this.gradient = gradient === -Infinity ? Infinity : gradient;
    this.normalGradient = -1 / this.gradient;

    this.angle = Math.atan(this.gradient);
    this.normalAngle = Math.atan(this.normalGradient);

    this.yIntercept = yIntercept;
    this.xIntercept = xIntercept;
  }

  static fromGradientAndPoint(gradient: number, point: Point2D): Line2D {
    return new Line2D(gradient, getXIntercept(gradient, point), getYIntercept(gradient, point));
  }

  static fromPoints(point1: Point2D, point2: Point2D): Line2D {
    const gradient = (point1.y - point2.y) / (point1.x - point2.x);
    return new Line2D(gradient, getXIntercept(gradient, point1), getYIntercept(gradient, point1));
  }

  atX(x: number): number | undefined {
    // If gradient is infinity (vertical line), return the x position if it is on the line
    if (this.gradient === Infinity) return x === this.xIntercept ? x : undefined;

    return x * this.gradient + this.yIntercept;
  }

  atY(y: number): number | undefined {
    // If gradient is 0 (horizontal line), return the y position if it is on the line
    if (this.gradient === 0) return y === this.yIntercept ? y : undefined;
    if (this.gradient === Infinity) return this.xIntercept;

    return (y - this.yIntercept) / this.gradient;
  }
}

export function getTranslationAlongAngle(angle: number, distance: number): Point2D {
  return new Point2D(Math.cos(angle) * distance, Math.sin(angle) * distance);
}

export function translatePointAlongLine(point: Point2D, line: Line2D, distance: number): Point2D {
  const translation = getTranslationAlongAngle(line.angle, distance);
  return new Point2D(point.x + translation.x, point.y + translation.y);
}

// Rearrangement of y = mx + c to  = x - y / m
export function getXIntercept(gradient: number, point: Point2D): number {
  return point.x - point.y / gradient;
}

// Rearrangement of y = mx + c to c = y - mx
export function getYIntercept(gradient: number, point: Point2D): number {
  return point.y - gradient * point.x;
}

export class Segment2D extends Line2D {
  point1: Point2D;
  point2: Point2D;

  lowerXBound: number;
  upperXBound: number;
  lowerYBound: number;
  upperYBound: number;

  length: number;

  constructor(point1: Point2D, point2: Point2D) {
    const gradient = (point1.y - point2.y) / (point1.x - point2.x);

    const xIntercept = getXIntercept(gradient, point1);
    const yIntercept = getYIntercept(gradient, point1);

    super(gradient, xIntercept, yIntercept);

    // Point1 should be the left-most point on or above the horizontal line going through the midpoint
    this.point1 = point1;
    this.point2 = point2;

    this.lowerXBound = Math.min(point1.x, point2.x);
    this.upperXBound = Math.max(point1.x, point2.x);

    this.lowerYBound = Math.min(point1.y, point2.y);
    this.upperYBound = Math.max(point1.y, point2.y);

    this.length = distancePointToPoint(point1, point2);
  }
}

// Determines whether point is under a line. If the line is vertical, the point is not under the line unless it is on the line
export function isPointUnderLine(point: Point2D, line: Line2D): boolean {
  if (line.gradient === Infinity) return point.x === line.xIntercept;

  return point.y < line.atX(point.x)!;
}

export function IntersectionLineAndSegment(
  line: Line2D,
  segment: Segment2D,
): Segment2D | Point2D | undefined {
  // If the point will not intersect, return undefined
  // y1 = x1m1 + c1; y2 = x2m2 + c2
  // y1 == y2; x1 == x2;
  // x*m1 + c1 = x*m2 + c2
  // x*m1 - x*m2 = c2 - c1
  // x(m1 - m2) = c2 - c1
  // x = (c2 - c1) / (m1 - m2)
  // Make sure x is within points

  // Handle parallel lines
  if (segment.gradient === line.gradient)
    return segment.yIntercept === line.yIntercept ? segment : undefined;

  // Note the line and segment from this point onwards will not be parallel

  // If the gradient of the segment is infinity...
  if (segment.gradient === Infinity) {
    const y = line.atX(segment.point1.x) as number;
    if (segment.lowerYBound <= y && y <= segment.upperYBound)
      return new Point2D(segment.point1.x, y);
    return undefined;
  } else if (segment.gradient === 0) {
    const x = line.atY(segment.point1.y) as number;
    if (segment.lowerXBound <= x && x <= segment.upperXBound)
      return new Point2D(x, segment.point1.y);
    return undefined;
  }

  const x = (segment.yIntercept - line.yIntercept) / (line.gradient - segment.gradient);

  if (segment.lowerXBound <= x && x <= segment.upperXBound)
    return new Point2D(x, line.atX(x) as number);
  return undefined;
}

export function IntersectionLineAndLine(
  line1: Line2D,
  line2: Line2D,
): Line2D | Point2D | undefined {
  // If vertical lines...
  if (line1.gradient === Infinity && line2.gradient === Infinity)
    return line1.xIntercept === line2.xIntercept ? line1 : undefined;

  // If parallel, return either of the lines
  if (line1.gradient === line2.gradient)
    return line1.yIntercept === line2.yIntercept ? line1 : undefined;

  // If these segments are not parallel, then there is guaranteed to be some intersection point from their extensions to lines
  let x, y;
  if (line1.gradient === Infinity) {
    x = line1.xIntercept;
    y = line2.atX(x) as number;
  } else if (line1.gradient === 0) {
    y = line1.yIntercept;
    x = line2.atY(y) as number;
  } else if (line2.gradient === Infinity) {
    x = line2.xIntercept;
    y = line1.atX(x) as number;
  } else if (line2.gradient === 0) {
    y = line2.yIntercept;
    x = line1.atY(y) as number;
  } else {
    x = (line1.yIntercept - line2.yIntercept) / (line2.gradient - line1.gradient);
    y = line1.atX(x) as number;
  }

  return new Point2D(x, y);
}

export function ClosestLinePointToPoint(point: Point2D, line: Line2D): Point2D {
  // 1. Construct normal line starting from point
  // 2. Find intersection between normal line and line
  const normalLine = Line2D.fromGradientAndPoint(line.normalGradient, point);
  return IntersectionLineAndLine(normalLine, line) as Point2D;
}

export function IntersectionSegmentAndSegment(
  _segment1: Segment2D,
  _segment2: Segment2D,
): Segment2D | Point2D | undefined {
  // Order the segments by which one comes first. X is the primary axis for measuring this, Y is the secondary axis.
  const isFirstArgumentBeforeSecond =
    _segment1.lowerXBound != _segment2.lowerXBound
      ? _segment1.lowerXBound < _segment2.lowerXBound
      : _segment1.lowerYBound < _segment2.lowerYBound;
  const segment1 = isFirstArgumentBeforeSecond ? _segment1 : _segment2;
  const segment2 = isFirstArgumentBeforeSecond ? _segment2 : _segment1;

  const intersection = IntersectionLineAndLine(segment1, segment2);

  if (intersection === undefined) return undefined;

  // Get segments from overlapping lines
  if (intersection instanceof Line2D) {
    if (segment1.gradient === Infinity) {
      if (segment1.upperYBound >= segment2.lowerYBound) {
        return new Segment2D(
          new Point2D(segment2.lowerXBound, segment2.lowerYBound),
          segment1.upperYBound < segment2.upperYBound
            ? new Point2D(segment1.upperXBound, segment1.upperYBound)
            : new Point2D(segment2.upperXBound, segment2.upperYBound),
        );
      }
      return undefined;
    }

    if (segment2.lowerXBound < segment1.upperXBound) {
      return new Segment2D(
        new Point2D(segment2.lowerXBound, segment2.lowerYBound),
        segment1.upperXBound < segment2.upperXBound
          ? new Point2D(segment1.upperXBound, segment1.upperYBound)
          : new Point2D(segment2.upperXBound, segment2.upperYBound),
      );
    }

    return undefined;
  }

  const { x, y } = intersection;

  const withinX =
    segment1.lowerXBound <= x &&
    x <= segment1.upperXBound &&
    segment2.lowerXBound <= x &&
    x <= segment2.upperXBound;

  const withinY =
    segment1.lowerYBound <= y &&
    y <= segment1.upperYBound &&
    segment2.lowerYBound <= y &&
    y <= segment2.upperYBound;

  if (withinX && withinY) return intersection;

  return undefined;
}

export function ClosestSegmentPointToPoint(point: Point2D, segment: Segment2D): Point2D {
  // First, determine what segment of the line the point is in
  //     X
  //
  // -------O-------
  //        |
  //        |   X
  //        |
  // -------O-------
  //          X

  if (segment.gradient === 0) {
    const order = segment.point1.x < segment.point2.x;
    if (point.x < segment.point1.x && point.x < segment.point2.x) {
      return order ? segment.point1 : segment.point2;
    } else if (segment.point1.x < point.x && segment.point2.x < point.x) {
      return order ? segment.point2 : segment.point1;
    }

    return new Point2D(point.x, segment.point1.y);
  }

  const firstLine = Line2D.fromGradientAndPoint(segment.normalGradient, segment.point1);
  const isUnderFirstLine = isPointUnderLine(point, firstLine);

  const secondLine = Line2D.fromGradientAndPoint(segment.normalGradient, segment.point2);
  const isUnderSecondLine = isPointUnderLine(point, secondLine);

  if (isUnderFirstLine === isUnderSecondLine) {
    // Get the shortest to one of the end points
    if (distancePointToPoint(point, segment.point1) < distancePointToPoint(point, segment.point2)) {
      return segment.point1;
    }
    return segment.point2;
  } else {
    return IntersectionLineAndSegment(
      Line2D.fromGradientAndPoint(segment.normalGradient, point),
      segment,
    ) as Point2D;
  }
}

export function ShortestDistanceFromPointToSegment(point: Point2D, segment: Segment2D): number {
  return distancePointToPoint(point, ClosestSegmentPointToPoint(point, segment));
}

export class Circle2D {
  center: Point2D;
  radius: number;

  constructor(center: Point2D, radius: number) {
    this.center = center;
    this.radius = radius;
  }

  getPointOnAngle(angle: number): Point2D {
    return new Point2D(
      this.center.x + Math.cos(angle) * this.radius,
      this.center.y + Math.sin(angle) * this.radius,
    );
  }
}

export function IntersectionCircleAndLine(
  circle: Circle2D,
  line: Line2D,
): [Point2D, Point2D] | [Point2D] | [] {
  const closestPoint = ClosestLinePointToPoint(circle.center, line);
  const distance = distancePointToPoint(circle.center, closestPoint);
  if (distance > circle.radius) return [];
  if (distance === circle.radius) return [closestPoint];

  // Else, calculate the two intersection points
  const distanceToCircumference = Math.sqrt(circle.radius ** 2 - distance ** 2);
  const xOffset = Math.cos(line.angle) * distanceToCircumference;
  const yOffset = Math.sin(line.angle) * distanceToCircumference;
  return [
    new Point2D(closestPoint.x - xOffset, closestPoint.y - yOffset),
    new Point2D(closestPoint.x + xOffset, closestPoint.y + yOffset),
  ];
}

export function IntersectionCircleAndSegment(
  circle: Circle2D,
  segment: Segment2D,
): [Point2D, Point2D] | [Point2D] | [] {
  const intersections = IntersectionCircleAndLine(circle, segment);

  return intersections.filter(
    (intersection) =>
      segment.lowerXBound <= intersection.x &&
      intersection.x <= segment.upperXBound &&
      segment.lowerYBound <= intersection.y &&
      intersection.y <= segment.upperYBound,
  ) as [Point2D, Point2D] | [Point2D] | [];
}

export class Arc2D extends Circle2D {
  startingAngle: number;
  centralAngle: number;
  endingAngle: number;

  firstPoint: Point2D;
  secondPoint: Point2D;

  constructor(center: Point2D, radius: number, startingAngle: number, angle: number) {
    super(center, radius);

    angle %= 2 * Math.PI;

    if (angle < 0) {
      angle *= -1;
      startingAngle -= angle;
    }

    // centralAngle should be between 0 and 2PI
    this.centralAngle = angle;

    // startingAngle should be between -PI and PI
    startingAngle %= 2 * Math.PI;
    if (startingAngle < -Math.PI) startingAngle += 2 * Math.PI;
    else if (Math.PI < startingAngle) startingAngle -= 2 * Math.PI;
    this.startingAngle = startingAngle;

    // endingAngle should be between -PI and PI
    this.endingAngle = (this.startingAngle + this.centralAngle) % (2 * Math.PI);
    if (this.endingAngle < -Math.PI) this.endingAngle += 2 * Math.PI;
    else if (Math.PI < this.endingAngle) this.endingAngle -= 2 * Math.PI;

    this.firstPoint = this.getPointOnAngle(this.startingAngle);
    this.secondPoint = this.getPointOnAngle(this.endingAngle);
  }
}

export function IntersectionArcAndLine(
  arc: Arc2D,
  line: Line2D,
): [Point2D, Point2D] | [Point2D] | [] {
  const intersections = IntersectionCircleAndLine(arc, line);

  return intersections.filter((intersection) => {
    const angle = anglePointToPoint(arc.center, intersection);
    if (arc.startingAngle > arc.endingAngle) {
      return arc.startingAngle <= angle || angle <= arc.endingAngle;
    } else {
      return arc.startingAngle <= angle && angle <= arc.endingAngle;
    }
  }) as [Point2D, Point2D] | [Point2D] | [];
}

export function IntersectionArcAndSegment(
  arc: Arc2D,
  segment: Segment2D,
): [Point2D, Point2D] | [Point2D] | [] {
  const intersections = IntersectionArcAndLine(arc, segment);

  return intersections.filter(
    (intersection) =>
      segment.lowerXBound <= intersection.x &&
      intersection.x <= segment.upperXBound &&
      segment.lowerYBound <= intersection.y &&
      intersection.y <= segment.upperYBound,
  ) as [Point2D, Point2D] | [Point2D] | [];
}

export function ClosestArcPointToPoint(
  point: Point2D,
  arc: Arc2D,
): Arc2D | [Point2D, Point2D] | Point2D {
  if (point.x === arc.center.x && point.y === arc.center.y) return arc;

  // If the point is within the arc, return the point on the arc through the center
  const angle = Math.atan2(point.y - arc.center.y, point.x - arc.center.x);
  if (arc.startingAngle <= angle && angle <= arc.startingAngle + arc.centralAngle) {
    return arc.getPointOnAngle(angle);
  }

  // Else, return the closest point on the circumference
  const firstPointDistance = distancePointToPoint(point, arc.firstPoint);
  const secondPointDistance = distancePointToPoint(point, arc.secondPoint);

  if (firstPointDistance === secondPointDistance) return [arc.firstPoint, arc.secondPoint];
  if (firstPointDistance < secondPointDistance) return arc.firstPoint;

  return arc.secondPoint;
}

// export function ClosestSegmentPoints(
//   segment1: Segment2D,
//   segment2: Segment2D,
// ): [Point2D, Point2D] | [Segment2D, Segment2D] {}

export class RoundedSegment2D extends Segment2D {
  radius: number;

  constructor(point1: Point2D, point2: Point2D, radius: number) {
    super(point1, point2);
    this.radius = radius;
  }
}

export function IntersectionRoundedSegmentAndSegment(
  roundedSegment: RoundedSegment2D,
  segment: Segment2D,
): Segment2D | [Point2D, Point2D] | [Point2D] | [] {
  // Construct the lines and arcs from the rounded segment
  const translation = getTranslationAlongAngle(roundedSegment.normalAngle, roundedSegment.radius);
  const segment1 = new Segment2D(
    new Point2D(roundedSegment.point1.x + translation.x, roundedSegment.point1.y + translation.y),
    new Point2D(roundedSegment.point2.x + translation.x, roundedSegment.point2.y + translation.y),
  );
  const segment2 = new Segment2D(
    new Point2D(roundedSegment.point1.x - translation.x, roundedSegment.point1.y - translation.y),
    new Point2D(roundedSegment.point2.x - translation.x, roundedSegment.point2.y - translation.y),
  );

  const arc1 = new Arc2D(
    roundedSegment.point1,
    roundedSegment.radius,
    anglePointToPoint(roundedSegment.point1, segment2.point1),
    Math.PI,
  );
  const arc2 = new Arc2D(
    roundedSegment.point2,
    roundedSegment.radius,
    anglePointToPoint(roundedSegment.point2, segment1.point2),
    Math.PI,
  );

  const segmentIntersections = [segment1, segment2]
    .map((_segment) => IntersectionSegmentAndSegment(_segment, segment))
    .flat()
    .filter(Boolean);
  const arcIntersections = [arc1, arc2]
    .map((arc) => IntersectionArcAndSegment(arc, segment))
    .flat()
    .filter(Boolean);
  return [...segmentIntersections, ...arcIntersections] as [Point2D, Point2D] | [Point2D] | [];
}
