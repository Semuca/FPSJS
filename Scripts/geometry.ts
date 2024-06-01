export function roundToNearest(number: number, to: number): number {
    return Math.round(number / to) * to;
}

export class Point2D {
    x: number;
    y: number;

    constructor(x, y) {
        this.x = x;
        this.y = y;
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
        return new Line2D(gradient, getXIntercept(gradient, point), getYIntercept(gradient, point))
    }

    atX(x: number): number | undefined {
        // If gradient is infinity (vertical line), return the x position if it is on the line
        if (Math.abs(this.gradient) === Infinity) return (x === this.xIntercept) ? x : undefined;

        return x * this.gradient + this.yIntercept;
    }

    atY(y: number): number | undefined {
        // If gradient is 0 (horizontal line), return the y position if it is on the line
        if (Math.abs(this.gradient) === 0) return (y === this.yIntercept) ? y : undefined;
        if (Math.abs(this.gradient) === Infinity) return this.xIntercept;

        return (y - this.yIntercept) / this.gradient;
    }
}

export function getXIntercept(gradient: number, point: Point2D): number {
    return point.x - point.y / gradient;
}

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

export function isPointUnderLine(point: Point2D, line: Line2D): boolean {
    const atX = line.atX(point.x);

    // If the line is vertical, check if the point is to the left
    return (atX === undefined) ? point.x < line.xIntercept : point.y < atX;
}

export function IntersectionSegmentAndSegment(segment1: Segment2D, segment2: Segment2D): Segment2D | Point2D | undefined {

    //If the segments are parallel, cover the case where they can overlap
    if (segment1.gradient === segment2.gradient) {

        // If they're vertical lines...
        if (Math.abs(segment1.gradient) === Infinity && segment1.xIntercept === segment2.xIntercept) {
            const isOverlapLeftSegment = (segment1.upperYBound < segment2.lowerYBound);
            const isOverlapRightSegment = (segment2.upperYBound < segment1.lowerYBound);

            if (isOverlapLeftSegment) return new Segment2D(new Point2D(segment1.upperXBound, segment1.upperYBound), new Point2D(segment2.lowerXBound, segment2.lowerYBound));

            if (isOverlapRightSegment) return new Segment2D(new Point2D(segment1.upperXBound, segment1.upperYBound), new Point2D(segment2.lowerXBound, segment2.lowerYBound));

        } else if (segment1.yIntercept === segment2.yIntercept) {
            const isOverlapLeftSegment = (segment1.upperXBound < segment2.lowerXBound);
            const isOverlapRightSegment = (segment2.upperXBound < segment1.lowerXBound);

            if (isOverlapLeftSegment) return new Segment2D(new Point2D(segment1.upperXBound, segment1.upperYBound), new Point2D(segment2.lowerXBound, segment2.lowerYBound));

            if (isOverlapRightSegment) return new Segment2D(new Point2D(segment1.upperXBound, segment1.upperYBound), new Point2D(segment2.lowerXBound, segment2.lowerYBound));
        }
        return undefined;
    }

    if (Math.abs(segment1.gradient) === Infinity) {
        const intersectionY = segment2.atX(segment1.point1.x);
        if (segment1.lowerYBound <= intersectionY && intersectionY <= segment1.upperYBound &&
            segment2.lowerYBound <= intersectionY && intersectionY <= segment2.upperYBound) {
            return new Point2D(segment1.point1.x, intersectionY);
        }

        return undefined;
    } else if (segment1.gradient === 0) { //Segment 1 is a horizontal line
        const intersectionX = segment2.atY(segment1.point1.y); // Get intersection x point if they were both lines
        if (segment1.lowerXBound <= intersectionX && intersectionX <= segment1.upperXBound &&
            segment2.lowerXBound <= intersectionX && intersectionX <= segment2.upperXBound) {
            return new Point2D(intersectionX, segment1.point1.y);
        }

        return undefined;

    } else if (Math.abs(segment2.gradient) === Infinity) {
        const intersectionY = segment1.atX(segment2.point1.x);
        if (segment1.lowerYBound <= intersectionY && intersectionY <= segment1.upperYBound &&
            segment2.lowerYBound <= intersectionY && intersectionY <= segment2.upperYBound) {
            return new Point2D(segment2.point1.x, intersectionY);
        }

        return undefined;
    } else if (segment2.gradient === 0) {
        const intersectionX = segment1.atY(segment2.point1.y); // Get intersection x point if they were both lines
        if (segment1.lowerXBound <= intersectionX && intersectionX <= segment1.upperXBound &&
            segment2.lowerXBound <= intersectionX && intersectionX <= segment2.upperXBound) {
            return new Point2D(intersectionX, segment2.point1.y);
        }

        return undefined;
    }

    const x = (segment2.yIntercept - segment1.yIntercept) / (segment1.gradient - segment2.gradient);

    if (segment1.lowerXBound <= x && x <= segment1.upperXBound &&
        segment2.lowerXBound <= x && x <= segment2.upperXBound) {
        return new Point2D(x, segment1.atX(x));
    }
    return undefined;
}

export function IntersectionLineAndSegment(line: Line2D, segment: Segment2D): Segment2D | Point2D | undefined{
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

export function ShortestDistanceFromPointToSegment(point: Point2D, segment: Segment2D): number {
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
        if (intersectionPoint instanceof Segment2D) return undefined; //TODO: Implement this
        return distancePointToPoint(point, intersectionPoint);
    }
}