/**
 * Dragon Arena — Zero-GC Object Pool
 * Pre-allocates and recycles particles, shockwaves, and floating popups
 * to eliminate garbage-collection frame stutters on mobile devices.
 */

export class ObjectPool {
  constructor(factory, initialCapacity = 128, maxCapacity = 600) {
    this.factory = factory;
    this.maxCapacity = maxCapacity;
    this.free = [];
    this.active = [];
    for (let i = 0; i < initialCapacity; i++) {
      this.free.push(factory());
    }
  }

  acquire() {
    let obj;
    if (this.free.length > 0) {
      obj = this.free.pop();
    } else if (this.active.length < this.maxCapacity) {
      obj = this.factory();
    } else {
      // Recycle oldest active item when at cap
      obj = this.active.shift();
    }
    this.active.push(obj);
    return obj;
  }

  releaseAt(index) {
    const last = this.active.length - 1;
    const obj = this.active[index];
    if (index !== last) {
      this.active[index] = this.active[last];
    }
    this.active.pop();
    this.free.push(obj);
  }

  clear() {
    while (this.active.length > 0) {
      this.free.push(this.active.pop());
    }
  }
}
