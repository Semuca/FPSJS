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

export class Line2D {
  gradient: number;
  normalGradient: number;
  xIntercept: number;
  yIntercept: number;

  constructor(gradient: number, xIntercept: number, yIntercept: number) {
    this.gradient = gradient;
    this.normalGradient = -1 / gradient;

    this.yIntercept = yIntercept;
    this.xIntercept = xIntercept;
  }

  static fromGradientAndPoint(gradient: number, point: Point2D): Line2D {
    return new Line2D(gradient, getXIntercept(gradient, point), getYIntercept(gradient, point));
  }

  atX(x: number): number | undefined {
    // If gradient is infinity (vertical line), return the x position if it is on the line
    if (Math.abs(this.gradient) === Infinity) return x === this.xIntercept ? x : undefined;

    return x * this.gradient + this.yIntercept;
  }

  atY(y: number): number | undefined {
    // If gradient is 0 (horizontal line), return the y position if it is on the line
    if (Math.abs(this.gradient) === 0) return y === this.yIntercept ? y : undefined;
    if (Math.abs(this.gradient) === Infinity) return this.xIntercept;

    return (y - this.yIntercept) / this.gradient;
  }
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

  angle: number;
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

    this.angle = Math.atan2(point2.y - point1.y, point2.x - point1.x);

    this.lowerXBound = Math.min(point1.x, point2.x);
    this.upperXBound = Math.max(point1.x, point2.x);

    this.lowerYBound = Math.min(point1.y, point2.y);
    this.upperYBound = Math.max(point1.y, point2.y);

    this.length = distancePointToPoint(point1, point2);
  }
}

// Determines whether point is under a line. If the line is vertical, the point is not under the line unless it is on the line
export function isPointUnderLine(point: Point2D, line: Line2D): boolean {
  if (Math.abs(line.gradient) === Infinity) return point.x === line.xIntercept;

  return point.y < line.atX(point.x)!;
}

// TODO: Should really make some tests for this
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

  //If the segments are parallel, cover the case where they can overlap
  if (segment1.gradient === segment2.gradient) {
    // If they're vertical lines...
    if (
      Math.abs(segment1.gradient) === Infinity &&
      segment1.xIntercept === segment2.xIntercept &&
      segment1.upperYBound < segment2.lowerYBound
    ) {
      return new Segment2D(
        new Point2D(segment1.upperXBound, segment1.upperYBound),
        new Point2D(segment2.lowerXBound, segment2.lowerYBound),
      );
    } else if (
      segment1.yIntercept === segment2.yIntercept &&
      segment2.lowerXBound < segment1.upperXBound
    ) {
      return new Segment2D(
        new Point2D(segment2.lowerXBound, segment2.lowerYBound),
        new Point2D(segment1.upperXBound, segment1.upperYBound),
      );
    }
    return undefined;
  }

  // If these segments are not parallel, then there is guaranteed to be some intersection point from their extensions to lines
  let x, y;
  if (Math.abs(segment1.gradient) === Infinity) {
    x = segment1.point1.x;
    y = segment2.atX(segment1.point1.x) as number;
  } else if (segment1.gradient === 0) {
    x = segment2.atY(segment1.point1.y) as number;
    y = segment1.point1.y;
  } else if (Math.abs(segment2.gradient) === Infinity) {
    x = segment2.point1.x;
    y = segment1.atX(segment2.point1.x) as number;
  } else if (segment2.gradient === 0) {
    x = segment1.atY(segment2.point1.y) as number;
    y = segment2.point1.y;
  } else {
    x = (segment2.yIntercept - segment1.yIntercept) / (segment1.gradient - segment2.gradient);
  }

  const withinX =
    x != undefined &&
    segment1.lowerXBound <= x &&
    x <= segment1.upperXBound &&
    segment2.lowerXBound <= x &&
    x <= segment2.upperXBound;
  const withinY =
    y != undefined &&
    segment1.lowerYBound <= y &&
    y <= segment1.upperYBound &&
    segment2.lowerYBound <= y &&
    y <= segment2.upperYBound;

  if (withinX && withinY) {
    return new Point2D(x, y ?? (segment1.atX(x) as number));
  }

  return undefined;
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
  if (segment.gradient === line.gradient) {
    return segment.yIntercept === line.yIntercept ? segment : undefined;
  }

  // Note the line and segment from this point onwards will not be parallel

  // If the gradient of the segment is infinity...
  if (Math.abs(segment.gradient) === Infinity) {
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

//TODO: Make this generic to N dimensions
export class Circle2D {
  center: Point2D;
  radius: number;

  constructor(center: Point2D, radius: number) {
    this.center = center;
    this.radius = radius;
  }
}

export class RoundedSegment extends Segment2D {
  radius: number;

  constructor(point1: Point2D, point2: Point2D, radius: number) {
    super(point1, point2);
    this.radius = radius;
  }
}
