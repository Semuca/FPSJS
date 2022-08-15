//This might be an unnecessary class in the end. Oh well, was good practice with exporting and importing. Delete later if it's still not useful

export class Queue {
    #elements;

    constructor() {
        this.#elements = [];
    }

    //Appends an element to elements
    enqueue(element) {
        this.#elements.push(element);
    }

    //Returns the first element of the queue and removes it from the elements
    dequeue(element) {
        return this.#elements.shift();
    }

    get length() {
        return this.#elements.length;
    }
}