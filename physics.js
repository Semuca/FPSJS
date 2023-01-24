// I've considered data redundancy with storing object points, however usually models have many more points then objects, and the collider doesn't match up anyway

// I'm not sure, but I don't think I should consider shapes that collider along 2 edges to be intersection i.e two squares right next to each other. It means when calculating positions, things are easier (no epsilon addition)

//Where all the colliders are stored and simulated
export class PhysicsScene {

    constructor() {
        this.pobjecs = [];
    }

    addPobjec(pobjec) {
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

            let sizesX = this.pobjecs[pobjecID].sizeX + this.pobjecs[i].sizeX;
            let sizesY = this.pobjecs[pobjecID].sizeY + this.pobjecs[i].sizeY;
            let sizesZ = this.pobjecs[pobjecID].sizeZ + this.pobjecs[i].sizeZ;

            if (this.CheckForCollision(newPos, i, sizesX, sizesY, sizesZ) == true) {
                //The old position will have the point where the two cubes intersect, the new one won't. How do I get the point where they intersect?
                //The point of intersection will have a position on that line (LERP)
                //The point of intersection will be where the two sides in 1d space line up first. i.e where abs(pos.x/y/z - pobjPos.x/y/z) = 2 as first t: 0->1

                //For x... abs( pos.x + k * move.x - pobjPos.x ) = 2. This exists because we've checked this exists
                //          If the math inside abs is positive, pos.x + k * move.x - pobjPos.x = 2      =>      k = (2 + pobjPos.x - pos.x) / move.x
                //          If the math inside abs is negative, -pos.x - k * move.x + pobjPos.x = 2     =>      -k * move.x = 2 - pobjPos.x + pos.x   =>      k = (pobjPos.x - pos.x - 2) / move.x
                
                //When we collide with something static, we want to provide an inverse force to stop an object (Newton's 3rd law)

                let x_t = 0;
                let y_t = 0;
                let z_t = 0;
                let xCollisionPoint = 0;
                let yCollisionPoint = 0;
                let zCollisionPoint = 0;

                if (Math.abs(position[0] - this.pobjecs[i].position[0]) > sizesX) { //If an axis already intersects, ignore checking for intersections.
                    xCollisionPoint = this.pobjecs[i].position[0] - sizesX * Math.sign(movement[0]); //Gets the point where x should collide on the x-axis
                    x_t = Math.abs(position[0] - xCollisionPoint) / Math.abs(position[0] - newPos[0]);
                }

                if (Math.abs(position[1] - this.pobjecs[i].position[1]) > sizesY) {
                    yCollisionPoint = this.pobjecs[i].position[1] - sizesY * Math.sign(movement[1]);
                    y_t = Math.abs(position[1] - yCollisionPoint) / Math.abs(position[1] - newPos[1]);
                }

                if (Math.abs(position[2] - this.pobjecs[i].position[2]) > sizesZ) {
                    zCollisionPoint = this.pobjecs[i].position[2] - sizesZ * Math.sign(movement[2]);
                    z_t = Math.abs(position[2] - zCollisionPoint) / Math.abs(position[2] - newPos[2]);
                }

                if (x_t > y_t && x_t > z_t) {
                    if (Math.abs(newPos[0] - position[0]) > Math.abs(x_t * movement[0])) { //If the distance moved so far is greater than the distance you want to move
                        newPos[0] = position[0] + x_t * movement[0];
                    }
                } else if (y_t > x_t && y_t > z_t) {
                    if (Math.abs(newPos[1] - position[1]) > Math.abs(y_t * movement[1])) {
                        newPos[1] = position[1] + y_t * movement[1];
                    }
                } else if (z_t > x_t && z_t > y_t){
                    if (Math.abs(newPos[2] - position[2]) > Math.abs(z_t * movement[2])) {
                        newPos[2] = position[2] + z_t * movement[2];
                    }
                } else { //When the values are all equal?? Right now I'm only dealing with the case (0, 0, 0), as it is by far the most common
                    if (Math.abs(position[0] - this.pobjecs[i].position[0]) >= sizesX) {
                        if (Math.abs(newPos[0] - position[0]) > Math.abs(x_t * movement[0])) { //If the distance moved so far is greater than the distance you want to move
                            newPos[0] = position[0] + x_t * movement[0];
                        }
                    } else if (Math.abs(position[1] - this.pobjecs[i].position[1]) >= sizesY) {
                        if (Math.abs(newPos[1] - position[1]) > Math.abs(y_t * movement[1])) {
                            newPos[1] = position[1] + y_t * movement[1];
                        }
                    } else {
                        if (Math.abs(newPos[2] - position[2]) > Math.abs(z_t * movement[2])) {
                            newPos[2] = position[2] + z_t * movement[2];
                        }
                    }
                }
                //break;
            }
        }

        return newPos;
    }

    CheckForCollision(newPos, secondPobj, _sX, _sY, _sZ) { // Since both pobecs are cubes of size 1m^3, this will hold
        if (Math.abs(newPos[0] - this.pobjecs[secondPobj].position[0]) < _sX && //Checks if we intersect on every axis, if so, we intersect in 3d
            Math.abs(newPos[1] - this.pobjecs[secondPobj].position[1]) < _sY &&
            Math.abs(newPos[2] - this.pobjecs[secondPobj].position[2]) < _sZ) {
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
        this.position = objec.rotpos.position;
        this.sizeX = objec.rotpos.scale[0];
        this.sizeY = objec.rotpos.scale[1];
        this.sizeZ = (this.position.length == 2) ? undefined : objec.rotpos.scale[2];

        this.physicsScene = physicsScene;
        this.objec = objec;
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