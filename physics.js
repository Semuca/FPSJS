// I've considered data redundancy with storing object points, however usually models have many more points then objects, and the collider doesn't match up anyway

//Where all the colliders are stored and simulated
export class PhysicsScene {

    constructor() {
        this.pobjecs = [];
    }

    addPobjec (pobjec) {
        this.pobjecs.push(pobjec);
        return this.pobjecs.length - 1; //an id that can be used to destroy the pobjec
    }

    ProposedMove(position, movement, pobjecID) { //Somehow this isn't working perfectly, won't slide along objects
        let newPos = vec3.create();
        vec3.add(newPos, position, movement);
        //newPos[0] = position[0] + movement[0]; //Really need to create my own math library, this is not on
        //newPos[1] = position[1] + movement[1];
        //newPos[2] = position[2] + movement[2];

        for (let i = 0; i < this.pobjecs.length; i++) {
            if (pobjecID == i) {
                continue;
            }

            if (this.pobjecs[i].enabled === false) {
                continue;
            }

            if (this.CheckForCollision(newPos, i) == true) {
                //The old position will have the point where the two cubes intersect, the new one won't. How do I get the point where they intersect?
                //The point of intersection will have a position on that line (LERP)
                //The point of intersection will be where the two sides in 1d space line up first. i.e where abs(pos.x/y/z - pobjPos.x/y/z) = 2 as first t: 0->1

                //For x... abs( pos.x + k * move.x - pobjPos.x ) = 2. This exists because we've checked this exists
                //          If the math inside abs is positive, pos.x + k * move.x - pobjPos.x = 2      =>      k = (2 + pobjPos.x - pos.x) / move.x
                //          If the math inside abs is negative, -pos.x - k * move.x + pobjPos.x = 2     =>      -k * move.x = 2 - pobjPos.x + pos.x   =>      k = (pobjPos.x - pos.x - 2) / move.x
                
                let x_t = 0;
                let y_t = 0;
                let z_t = 0;
                let xCollisionPoint = 0;
                let yCollisionPoint = 0;
                let zCollisionPoint = 0;

                if (Math.abs(position[0] - this.pobjecs[i].position[0]) > 2) { //If an axis already intersects, ignore checking for intersections.
                    xCollisionPoint = this.pobjecs[i].position[0] - 2 * Math.sign(movement[0]); //Gets the point where x should collide on the x-axis
                    x_t = Math.abs(position[0] - xCollisionPoint) / Math.abs(position[0] - newPos[0]);
                }

                if (Math.abs(position[1] - this.pobjecs[i].position[1]) > 2) {
                    yCollisionPoint = this.pobjecs[i].position[1] - 2 * Math.sign(movement[1]);
                    y_t = Math.abs(position[1] - yCollisionPoint) / Math.abs(position[1] - newPos[1]);
                }

                if (Math.abs(position[2] - this.pobjecs[i].position[2]) > 2) {
                    zCollisionPoint = this.pobjecs[i].position[2] - 2 * Math.sign(movement[2]);
                    z_t = Math.abs(position[2] - zCollisionPoint) / Math.abs(position[2] - newPos[2]);
                }

                if (x_t > y_t && x_t > z_t) {
                    newPos[0] = position[0] + x_t * movement[0];
                    newPos[1] = position[1] + x_t * movement[1];
                    newPos[2] = position[2] + x_t * movement[2];
                } else if (y_t > x_t && y_t > z_t) {
                    newPos[0] = position[0] + y_t * movement[0];
                    newPos[1] = position[1] + y_t * movement[1];
                    newPos[2] = position[2] + y_t * movement[2];
                } else {
                    newPos[0] = position[0] + z_t * movement[0];
                    newPos[1] = position[1] + z_t * movement[1];
                    newPos[2] = position[2] + z_t * movement[2];
                }
                break;
            }
        }

        return newPos;
    }

    CheckForCollision(newPos, secondPobj) { // Since both pobecs are cubes of size 1m^3, this will hold
        if (Math.abs(newPos[0] - this.pobjecs[secondPobj].position[0]) < 2 && //Checks if we intersect on every axis, if so, we intersect in 3d
            Math.abs(newPos[1] - this.pobjecs[secondPobj].position[1]) < 2 &&
            Math.abs(newPos[2] - this.pobjecs[secondPobj].position[2]) < 2) {
                return true;
        }
        return false;

    }
}

export class PhysicsObjec { // How do we do circles?. How do we check for concavity?
    //constructor(pointsArray) {
        //this.points = pointsArray; // All points are 3-dimensional right now
    //} Having physics objects based off an array of points would be cool, but ultimately very hard to do right now

    constructor(objec, physicsScene) {
        this.physicsScene = physicsScene;
        this.objec = objec;
        this.position = objec.rotpos.position;
        this.id = physicsScene.addPobjec(this);
        this.enabled = true;
    }

    //I would also love continuous collision detection, but I don't have the ability or headspace to make it right now.
    Move(direction) {
        if (this.enabled === true) {
            let newPos = this.physicsScene.ProposedMove(this.position, direction, this.id);
            vec3.copy(this.position, newPos);
            //this.position.x = newPos[0];
            //this.position.y = newPos[1];
            //this.position.z = newPos[2];

            vec3.copy(this.objec.rotpos.position, this.position);
            //this.objec.rotpos.position[0] = this.position.x;
            //this.objec.rotpos.position[1] = this.position.y;
            //this.objec.rotpos.position[2] = this.position.z;
        } else {
            vec3.add(this.position, this.position, direction);
        }
    }
}