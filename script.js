const EXTRA_COST_POO = 5;
console.clear();
const $ = document.querySelector.bind(document);
const wallPath = new Path2D($`#wall path`.getAttribute`d`);
const pooPath = new Path2D($`#poo path`.getAttribute`d`);
const canvas = $`canvas`;
const ctx = canvas.getContext`2d`;
// manhattan distance function
const manhattan = (x, y) => Math.abs(x) + Math.abs(y);

let laby, dimX, dimY, ready;

function paint(open, closed) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < laby.length; y++) {
    for (let x = 0; x < laby[0].length; x++) {
      if (closed) {
        const fieldIsClosed = closed.find((n) => n.x === x && n.y === y);
        ctx.fillStyle = "#400";
        if (fieldIsClosed) {
          ctx.fillRect(x * 32, y * 32, 32, 32);
        }
      }
      if (open) {
        const fieldIsOpen = open.find((n) => n.x === x && n.y === y);
        ctx.fillStyle = "#040";
        if (fieldIsOpen) {
          ctx.fillRect(x * 32, y * 32, 32, 32);
        }
      }
      const symbol = laby[y][x];
      if (symbol === -1) {
        ctx.save();
        ctx.translate(x * 32, y * 32);
        ctx.fillStyle = "#c24";
        ctx.fill(wallPath);
        ctx.restore();
      }
      if (symbol > 0) {
        ctx.save();
        ctx.translate(x * 32, y * 32);
        ctx.fillStyle = "#654";
        ctx.fill(pooPath);
        ctx.restore();
      }
    }
  }
}

function paintPath(path) {
  if (path && path.length > 0) {
    ctx.beginPath();
    ctx.moveTo(16 + path[0].x * 32, 16 + path[0].y * 32);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(16 + path[i].x * 32, 16 + path[i].y * 32);
    }
    ctx.strokeStyle = "#fff7";
    ctx.lineWidth = 12;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }
}

function generateWorld(dimX, dimY) {
  const laby = Array.from(
    {
      length: dimY
    },
    (_, y) => {
      return Array.from({ length: dimX }, (_, x) => {
        return x === 0 || y === 0 || x === dimX - 1 || y === dimY - 1
          ? -1
          : Math.random() < 0.2
          ? -1
          : Math.random() < 0.2
          ? EXTRA_COST_POO
          : 0;
      });
    }
  );
  laby[1][1] = laby[dimY - 2][dimX - 2] = 0;
  return laby;
}

class Node {
  constructor(parent, x, y, g, h) {
    this.parent = parent;
    this.x = x;
    this.y = y;
    this.g = g;
    this.h = h;
  }

  get cost() {
    return this.g + this.h;
  }

  static fromPoint({ x, y }) {
    return new Node(null, x, y, 0, 0);
  }

  isAtPosition({ x, y }) {
    return x === this.x && y === this.y;
  }

  compareTo(other) {
    if (this.cost < other.cost) return -1;
    if (this.cost === other.cost) return 0;
    if (this.cost > other.cost) return 1;
  }
}

function addNeighbors(maze, current, from, to, open, closed) {
  const xMax = maze[0].length - 1;
  const yMax = maze.length - 1;
  for (let x = -1; x <= 1; x++) {
    for (let y = -1; y <= 1; y++) {
      const stepCost = manhattan(x, y);
      if (stepCost !== 1) {
        continue;
      }
      const x1 = current.x + x;
      const y1 = current.y + y;
      if (x1 < 0 || x1 > xMax || y1 < 0 || y1 > yMax) {
        // if field out of bounds, skip
        continue;
      }

      if (maze[y1][x1] < 0) {
        // if field not passable, skip
        continue;
      }
      const fieldCost = maze[y1][x1];
      const cost = current.g + stepCost + fieldCost;
      const distance = manhattan(to.x - x1, to.y - y1);
      const node = new Node(current, x1, y1, cost, distance);
      const isInClosed = !!closed.find((n) => n.isAtPosition(node));
      const isInOpen = !!open.find((n) => n.isAtPosition(node));

      const isInList = isInOpen || isInClosed;
      if (!isInList) {
        open.push(node);
      }
    }
  }
  open.sort((a, b) => a.compareTo(b));
}

function traceBackPath(node) {
  const path = [];
  while (node) {
    path.unshift(node);
    node = node.parent;
  }
  return path;
}

function findPath(maze, from, to) {
  return new Promise((resolve, reject) => {
    const open = [];
    const closed = [];
    let current = Node.fromPoint(from);
    closed.push(current);
    addNeighbors(maze, current, from, to, open, closed);

    const iteration = () => {
      if (current.isAtPosition(to)) {
        return true;
      }
      if (open.length === 0) {
        // no path found
        throw new Error("No path found");
      }
      current = open.shift();
      closed.push(current);
      addNeighbors(maze, current, from, to, open, closed);
      return current.isAtPosition(to);
    };
    const loop = () => {
      try {
        paint(open, closed);
        paintPath(traceBackPath(current));
        const complete = iteration();
        if (!complete) {
          requestAnimationFrame(loop);
        } else {
          const path = traceBackPath(current);
          resolve(path);
          return;
        }
      } catch (err) {
        reject(err);
      }
    };
    loop();
  });
}

function init() {
  $("#out").textContent = "";
  const dim = 20; // 5 + Math.floor(Math.random() * 40);
  laby = generateWorld(dim, dim);
  dimX = laby[0].length;
  dimY = laby.length;
  canvas.width = dimX * 32;
  canvas.height = dimY * 32;
  ready = false;
}

async function main() {
  paint();
  try {
    const path = await findPath(
      laby,
      { x: 1, y: 1 },
      { x: dimX - 2, y: dimY - 2 }
    );

    paint();
    paintPath(path);
    $("#out").textContent = "Total Cost: " + path[path.length - 1].g;
  } catch (err) {
    $("#out").textContent = err.message;
  } finally {
    ready = true;
  }
}

init();
main();

canvas.addEventListener("click", () => {
  if (ready) {
    init();
    main();
  }
});