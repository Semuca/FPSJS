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

    ProposedMove(newPosition, pobjecID) {
        for (let i = 0; i < this.pobjecs.length; i++) {
            if (pobjecID == i) {
                continue;
            }

            if (this.CheckForCollision(newPosition, i) == true) {
                return i;
            }
        }

        return null;
    }

    CheckForCollision(newPos, secondPobj) { // Since both pobecs are cubes of size 1m^3, this will hold
        console.log(" ");
        console.log(newPos);
        console.log(this.pobjecs[secondPobj].position);
        //console.log(Math.abs(newPos[0] - this.pobjecs[secondPobj].position[0]));
        //console.log(Math.abs(newPos[1] - this.pobjecs[secondPobj].position[1]));
        //console.log(Math.abs(newPos[2] - this.pobjecs[secondPobj].position[2]));
        if (Math.abs(newPos.x - this.pobjecs[secondPobj].position[0]) <= 2 &&
            Math.abs(newPos.y - this.pobjecs[secondPobj].position[1]) <= 2 &&
            Math.abs(newPos.z - this.pobjecs[secondPobj].position[2]) <= 2) {
                return true;
        }
        return false;

        /*
        if (((newPos[0] + 2 <= this.pobjecs[secondPobj].position[0] + 2 && newPos[0] + 2 >= this.pobjecs[secondPobj].position[0] - 2) ||
            (newPos[0] - 2 <= this.pobjecs[secondPobj].position[0] + 2 && newPos[0] - 2 >= this.pobjecs[secondPobj].position[0] - 2)) &&
            ((newPos[1] + 2 <= this.pobjecs[secondPobj].position[1] + 2 && newPos[1] + 2 >= this.pobjecs[secondPobj].position[1] - 2) ||
            (newPos[1] - 2 <= this.pobjecs[secondPobj].position[1] + 2 && newPos[1] - 2 >= this.pobjecs[secondPobj].position[1] - 2)) &&
            ((newPos[2] + 2 <= this.pobjecs[secondPobj].position[2] + 2 && newPos[2] + 2 >= this.pobjecs[secondPobj].position[2] - 2) ||
            (newPos[2] - 2 <= this.pobjecs[secondPobj].position[2] + 2 && newPos[2] - 2 >= this.pobjecs[secondPobj].position[2] - 2)) ) {
                console.log(" ");
                console.log(newPos);
                console.log(this.pobjecs[secondPobj].position);
                return true;
        }
        return false;*/
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
    }

    //I would also love continuous collision detection, but I don't have the ability or headspace to make it right now.
    Move(direction) {
        let newPos = [0.0, 0.0, 0.0];
        newPos.x = this.position[0] + direction[0];
        newPos.y = this.position[1] + direction[1];
        newPos.z = this.position[2] + direction[2];

        let colliderPobjec = this.physicsScene.ProposedMove(newPos, this.id);
        if (colliderPobjec != null) {
            console.log("WEEWOO WEEWOO COLLISION");
        }
        this.position.x = newPos.x;
        this.position.y = newPos.y;
        this.position.z = newPos.z;
        this.objec.rotpos.position[0] = this.position.x;
        this.objec.rotpos.position[1] = this.position.y;
        this.objec.rotpos.position[2] = this.position.z;
    }
}