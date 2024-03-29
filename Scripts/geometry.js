
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
    constructor(gradient, xIntercept, yIntercept) {
        this.gradient = gradient;
        this.normalGradient = -1 / gradient;

        this.yIntercept = yIntercept;
        this.xIntercept = xIntercept;
    }

    static fromGradientAndPoint(gradient, point) {
        return new Line2D(gradient, getXIntercept(gradient, point), getYIntercept(gradient, point))
    }

    atX(x) {
        // If gradient is infinity (vertical line), return the x position if it is on the line
        if (Math.abs(this.gradient) === Infinity) return (x === this.xIntercept) ? x : undefined;

        return x * this.gradient + this.yIntercept;
    }

    atY(y) {
        // If gradient is 0 (horizontal line), return the y position if it is on the line
        if (Math.abs(this.gradient) === 0) return (y === this.yIntercept) ? y : undefined;
        if (Math.abs(this.gradient) === Infinity) return this.xIntercept;

        return (y - this.yIntercept) / this.gradient;
    }
}

export function getXIntercept(gradient, point) {
    return point.x - point.y / gradient;
}

export function getYIntercept(gradient, point) {
    return point.y - gradient * point.x;
}

export class Segment2D extends Line2D {
    constructor(point1, point2) {
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

export function isPointUnderLine(point, line) {
    const atX = line.atX(point.x);

    // If the line is vertical, check if the point is to the left
    return (atX === undefined) ? point.x < line.xIntercept : point.y < atX;
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

    // Handle parallel lines
    if (segment.gradient === line.gradient) {
        return (segment.yIntercept === line.yIntercept) ? segment : undefined;
    }

    // Note the line and segment from this point onwards will not be parallel

    // If the gradient of the segment is infinity...
    if (Math.abs(segment.gradient) === Infinity) {
        const y = line.atX(segment.point1.x);
        if (segment.lowerYBound <= y && y <= segment.upperYBound) return new Point2D(segment.point1.x, y);
        return undefined;
    } else if (segment.gradient === 0) {
        const x = line.atY(segment.point1.y);
        if (segment.lowerXBound <= x && x <= segment.upperXBound) return new Point2D(x, segment.point1.y);
        return undefined;
    }

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
    const firstLine = Line2D.fromGradientAndPoint(normalGradient, segment.point1);
    const isUnderFirstLine = isPointUnderLine(point, firstLine);

    const secondLine = Line2D.fromGradientAndPoint(normalGradient, segment.point2);
    const isUnderSecondLine = isPointUnderLine(point, secondLine);

    if (isUnderFirstLine === isUnderSecondLine) {
        // Get the shortest distance to one of the end points
        return Math.min(distancePointToPoint(point, segment.point1), distancePointToPoint(point, segment.point2));
    } else {
        const intersectionPoint = IntersectionLineAndSegment(Line2D.fromGradientAndPoint(normalGradient, point), segment);
        return distancePointToPoint(point, intersectionPoint);
    }
}