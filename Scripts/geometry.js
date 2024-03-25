
export class Point2D {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export function distancePointToPoint(point1, point2) {
    return Math.sqrt((point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2);
}

export class Line2D {
    constructor(gradient, yIntercept) {
        this.gradient = gradient;
        this.yIntercept = yIntercept;
    }

    atX(x) {
        return x * this.gradient + this.yIntercept;
    }
}

export function getYIntercept(gradient, point) {
    return point.y - gradient * point.x;
}

export class Segment2D {
    constructor(point1, point2) {
        // Point1 should be the left-most point on or above the horizontal line going through the midpoint
        this.point1 = point1;
        this.point2 = point2;

        this.lowerXBound = Math.min(point1.x, point2.x);
        this.upperXBound = Math.max(point1.x, point2.x);

        this.gradient = (this.point1.y - this.point2.y) / (this.point1.x - this.point2.x);
        this.normalGradient = -1 / this.gradient;

        this.yIntercept = getYIntercept(this.gradient, this.point1);
    }
}

export function isPointUnderLine(point, line) {
    return point.y < line.atX(point.x);
}

export function IntersectionLineAndSegment(line, segment) {
    // If the point will not intersect, return undefined
    // y1 = x1m1 + c1; y2 = x2m2 + c2
    // y1 == y2; x1 == x2;
    // x*m1 + c1 = x*m2 + c2
    // x*m1 - x*m2 = c2 - c1
    // x(m1 - m2) = c2 - c1
    // x = (c2 - c1) / (m1 - m2)
    // Make sure x is within points
    const x = (segment.yIntercept - line.yIntercept) / (line.gradient - segment.gradient);

    if (segment.lowerXBound <= x && x <= segment.upperXBound) return new Point2D(x, line.atX(x));
    return undefined;
}

export function ShortestDistanceFromPointToSegment(point, segment) {
    // First, determine what segment of the line the point is in
    //     X
    //
    // -------O-------
    //        |
    //        |   X
    //        |
    // -------O-------
    //          X
  
    const normalGradient = segment.normalGradient;
    const firstLine = new Line2D(normalGradient, getYIntercept(normalGradient, segment.point1));
    const isUnderFirstLine = isPointUnderLine(point, firstLine);

    const secondLine = new Line2D(normalGradient, getYIntercept(normalGradient, segment.point2));
    const isUnderSecondLine = isPointUnderLine(point, secondLine);

    if (isUnderFirstLine === isUnderSecondLine) {
        // Get the shortest distance to one of the end points
        return Math.min(distancePointToPoint(point, segment.point1), distancePointToPoint(point, segment.point2));
    } else {
        const intersectionPoint = IntersectionLineAndSegment(new Line2D(normalGradient, getYIntercept(normalGradient, point)), segment);
        return distancePointToPoint(point, intersectionPoint);
    }
}