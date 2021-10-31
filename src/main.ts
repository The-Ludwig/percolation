import './style.css'
import * as d3 from "d3";

type lattice_types = "triangular" | "square" | "ugly_square" | "honeycomb";

class Field {

  public anim_ms: number;
  public anim_wait: number;
  public svg_id: string;

  private svg: d3.Selection<HTMLElement, SVGElement, HTMLElement, any>;
  private view: d3.Selection<SVGGElement, SVGElement, HTMLElement, any>;
  private zoom: d3.ZoomBehavior<Element, unknown>;

  private width: number;
  private height: number;


  private button = d3.select('#percButton').node() as HTMLButtonElement;
  private p_slider = d3.select('#pSlider').node() as HTMLInputElement;
  private x_slider = d3.select('#xSlider').node() as HTMLInputElement;
  private y_slider = d3.select('#ySlider').node() as HTMLInputElement;
  private lattice_select = d3.select('#lattice-select').node() as HTMLSelectElement;


  private p = Number(this.p_slider.value);
  private nx = Number(this.x_slider.value);
  private ny = Number(this.y_slider.value);
  private r = 0;


  private changed = true;

  private grid_points: GridPoint[] = [];
  private grid_lines: GridLine[] = [];

  private clusters: { points: GridPoint[], lines: GridLine[] }[] = [];

  private lattice: lattice_types;

  constructor(svg_id: string, anim_ms: number, anim_wait: number) {
    this.anim_ms = anim_ms;
    this.anim_wait = anim_wait;
    this.svg_id = svg_id;

    this.svg = d3.select(svg_id) as d3.Selection<HTMLElement, SVGElement, HTMLElement, any>;
    this.width = this.svg.node().clientWidth;
    this.height = this.svg.node().clientHeight;

    this.svg
      .attr("viewBox", String([0, 0, this.width, this.height]))
      .attr("width", this.width)
      .attr("height", this.height);

    // set up zooming behaviour
    this.view = this.svg.append("g");
    this.zoom = d3.zoom().touchable(() => { return true })
      .scaleExtent([0.25, 16])
      .on("zoom", (event) => {
        const { transform } = event;
        this.view.attr("transform", transform);
      });
    this.svg.node().addEventListener('click', () => {
      this.svg.transition().duration(750).call(
        this.zoom.transform,
        d3.zoomIdentity,
        d3.zoomTransform(this.svg.node()).invert([this.width / 2, this.height / 2])
      );
    });


    // set up user controlls
    this.p_slider.previousElementSibling.innerHTML = `p=${this.p.toFixed(2)}`;
    this.x_slider.previousElementSibling.innerHTML = `N_x=${this.nx.toFixed(0)}`;
    this.y_slider.previousElementSibling.innerHTML = `N_y=${this.ny.toFixed(0)}`;

    this.lattice = this.lattice_select.value as lattice_types;

    // first handle input to let the user see what he is doing
    this.p_slider.addEventListener('input', () => {
      this.p = Number(this.p_slider.value);
      this.p_slider.previousElementSibling.innerHTML = `p=${this.p.toFixed(2)}`;
    });
    this.x_slider.addEventListener('input', () => {
      let x = Number(this.x_slider.value);
      this.x_slider.previousElementSibling.innerHTML = `N_x=${x.toFixed(0)}`;
    });
    this.y_slider.addEventListener('input', () => {
      let y = Number(this.y_slider.value);
      this.y_slider.previousElementSibling.innerHTML = `N_y=${y.toFixed(0)}`;
    });

    this.lattice_select.addEventListener('change', (e) => {
      this.lattice = this.lattice_select.value as lattice_types;
      this.changed = true;
    });
    // now actually change it
    this.p_slider.addEventListener('change', (e) => {
    });
    this.x_slider.addEventListener('change', () => {
      this.changed = true;
    });
    this.y_slider.addEventListener('change', () => {
      this.changed = true;
    });

    this.button.addEventListener('click', () => {
      if (this.changed) {
        this.init()
        this.changed = false;
      } else {
        this.calc_occupation();
        this.calc_lines();
        this.draw();
      }
    });

    this.init();

  }

  private recalc_r(wx = 1, wy = 1) {
    this.r = Math.min(this.width * wx / this.nx, this.height * wy / this.ny) / 3;
  }

  private calc_occupation() {
    for (let grid_point of this.grid_points) {
      grid_point.occupied = Math.random() < this.p;
    }
  }

  private calc_points() {
    switch (this.lattice) {
      case "triangular":
        this.triangular_lattice();
        break;
      case "square":
        this.square_lattice();
        break;
      case "ugly_square":
        this.non_square_lattice();
        break;
      case "honeycomb":
        this.honeycomb_lattice();
        break;
      default:
        this.triangular_lattice();
    }
  }

  private non_square_lattice() {
    this.recalc_r();
    let x0 = this.r + 5;
    let y0 = this.r + 5;
    let dx = (this.width - 2 * x0) / (this.nx - 1);
    let dy = (this.height - 2 * y0) / (this.ny - 1);

    delete this.grid_points;
    this.grid_points = [];

    for (let x = 0; x < this.nx; x++)
      for (let y = 0; y < this.ny; y++) {
        let gp = new GridPoint(x0 + dx * x, y0 + dy * y, Math.random() < this.p);

        if (x != 0) {
          let n = this.grid_points[(x - 1) * this.ny + (y)];
          n.neighbours.push(gp);
          gp.neighbours.push(n);
        }
        if (y != 0) {
          let n = this.grid_points[(x) * this.ny + (y - 1)];
          n.neighbours.push(gp)
          gp.neighbours.push(n);
        }

        this.grid_points.push(gp);
      }
  }

  private triangular_lattice() {
    this.recalc_r();

    let x0, y0, dx, dy;

    // this is the ratio of x to y (for the triangle sites to be equilateral)
    let xbyy = Math.sqrt(3) / 2

    if (this.nx * xbyy >= this.ny) {
      x0 = this.r + 5;
      dx = (this.width - 2 * x0) / (this.nx - 1);
      dy = dx / (xbyy);
      y0 = x0 + (this.height - dy * this.ny) / 2;
    } else {
      y0 = this.r + 5;
      dy = (this.height - 2 * y0) / (this.ny - 1);
      dx = dy * xbyy;
      x0 = y0 + (this.width - dx * this.nx) / 2;
    }

    delete this.grid_points;
    this.grid_points = [];

    let get_index = (x: number, y: number) => {
      return x * this.ny + y - Math.floor(x / 2);
    }

    for (let x = 0; x < this.nx; x++) {
      let fac = x % 2;

      for (let y = 0; y < this.ny - fac; y++) {
        let gp = new GridPoint(x0 + dx * x, y0 + dy * y + fac * dy / 2, Math.random() < this.p);

        if (x != 0 && y != this.ny - 1) {
          let n = this.grid_points[get_index(x - 1, y)];
          n.neighbours.push(gp);
          gp.neighbours.push(n);
        }

        if (x != 0 && y + 2 * fac != 0) {
          let n = this.grid_points[get_index(x - 1, y + 2 * fac - 1)];
          n.neighbours.push(gp);
          gp.neighbours.push(n);
        }

        if (y != 0) {
          let n = this.grid_points[get_index(x, y - 1)];
          n.neighbours.push(gp)
          gp.neighbours.push(n);
        }

        this.grid_points.push(gp);
      }
    }
  }

  private square_lattice() {
    this.recalc_r();

    let x0, y0, dx, dy;

    if (this.nx >= this.ny) {
      x0 = this.r + 5;
      dx = (this.width - 2 * x0) / (this.nx - 1);
      dy = dx;
      y0 = x0 + (this.height - this.width / this.nx * this.ny) / 2;
    } else {
      y0 = this.r + 5;
      dy = (this.height - 2 * y0) / (this.ny - 1);
      dx = dy;
      x0 = (this.width - this.height / this.ny * this.nx) / 2;
    }

    delete this.grid_points;
    this.grid_points = [];

    for (let x = 0; x < this.nx; x++)
      for (let y = 0; y < this.ny; y++) {
        let gp = new GridPoint(x0 + dx * x, y0 + dy * y, Math.random() < this.p);

        if (x != 0) {
          let n = this.grid_points[(x - 1) * this.ny + (y)];
          n.neighbours.push(gp);
          gp.neighbours.push(n);
        }
        if (y != 0) {
          let n = this.grid_points[(x) * this.ny + (y - 1)];
          n.neighbours.push(gp)
          gp.neighbours.push(n);
        }

        this.grid_points.push(gp);
      }
  }

  private honeycomb_lattice() {
    this.recalc_r(1, 0.5);

    let x0, y0, dx, dy;

    // this is the ratio of x to y (for the triangle sites to be equilateral)
    let xbyy = Math.sqrt(3)
    function get_extra(n) {
      let extra;
      switch ((n - 1) % 4) {
        case 0:
          extra = 0;
          break;
        case 1:
          extra = 0.5;
          break;
        case 2:
          extra = 1.5;
          break;
        case 3:
          extra = 2;
          break;
      }
      return extra;
    }

    if (this.nx * 3 / 4 >= this.ny) {
      let extra = get_extra(this.nx);
      x0 = this.r + 5;
      dx = (this.width - 2 * x0) / (3 * Math.floor((this.nx - 1) / 4) + extra);
      dy = dx * (xbyy);
      y0 = x0 + dy + (this.height - dy * this.ny) / 2;
    } else {
      y0 = this.r + 5;
      dy = (this.height - 2 * y0) / (this.ny - 1);
      y0 = y0 + dy / 2
      dx = dy / xbyy;
      x0 = y0 + (this.width - dx * 3 / 4 * this.nx) / 2;
    }

    delete this.grid_points;
    this.grid_points = [];

    let get_index = (x: number, y: number) => {
      return x * this.ny + y - (Math.ceil(x / 4) + Math.floor(x / 4));
    }

    for (let x = 0; x < this.nx; x++) {
      let period = x % 4;
      let fac = period == 1 || period == 2 ? 1 : 0;

      for (let y = 0; y < this.ny - 1 + fac; y++) {
        let gp = new GridPoint(x0 + dx * (x - Math.floor((x + 1) / 2) / 2), y0 + dy * y - fac * dy / 2, Math.random() < this.p);
        switch (period) {
          case 0:
            if (x != 0) {
              let n = this.grid_points[get_index(x - 1, y)];
              n.neighbours.push(gp);
              gp.neighbours.push(n);
            }
            break;
          case 1:
            if (y != 0) {
              let n = this.grid_points[get_index(x - 1, y - 1)];
              n.neighbours.push(gp);
              gp.neighbours.push(n);
            }
            if (y != this.ny - 2 + fac) {
              let n = this.grid_points[get_index(x - 1, y)];
              n.neighbours.push(gp);
              gp.neighbours.push(n);
            }
            break;
          case 2:
            if (x != 0) {
              let n = this.grid_points[get_index(x - 1, y)];
              n.neighbours.push(gp);
              gp.neighbours.push(n);
            }
            break;
          case 3:
            let n = this.grid_points[get_index(x - 1, y + 1)];
            n.neighbours.push(gp);
            gp.neighbours.push(n);

            n = this.grid_points[get_index(x - 1, y)];
            n.neighbours.push(gp);
            gp.neighbours.push(n);
            break;
        }

        this.grid_points.push(gp);
      }
    }
  }

  private calc_lines() {
    delete this.grid_lines, this.clusters;
    this.grid_lines = [];
    this.clusters = [];

    let unchecked_points = new Set(this.grid_points);
    let current = unchecked_points.keys().next();
    let cur_index = 0;
    while (!current.done) {
      let { cluster, index } = this.calc_lines_step(current.value, unchecked_points, cur_index);
      cur_index = index;

      this.grid_lines.push(...cluster.lines);
      if (cluster.points.length > 0)
        this.clusters.push(cluster)

      current = unchecked_points.keys().next();
    }

  }

  private calc_lines_step(start: GridPoint, unchecked_points: Set<GridPoint>, index: number): { cluster: { points: GridPoint[], lines: GridLine[] }, index: number } {
    let points = [start];
    let lines = [];
    let points_to_visit = [];
    let current: GridPoint | null = start;

    unchecked_points.delete(current);

    if (!current.occupied)
      return { cluster: { points: points, lines: lines }, index: index }

    while (current !== null) {
      unchecked_points.delete(current);

      if (current.occupied)
        points.push(current)

      for (let n of current.neighbours) {
        if (!n.occupied)
          continue;

        if (unchecked_points.has(n)) {
          lines.push(new GridLine(current, n, index));
          index++;
          points_to_visit.push(n);
        }
      }

      current = points_to_visit.pop() ?? null;
    }

    return { cluster: { points: points, lines: lines }, index: index }
  }

  private calc_lines_rec(current: GridPoint, unchecked_points: Set<GridPoint>): [GridPoint[], GridLine[]] {
    if (!unchecked_points.has(current))
      return [[], []]

    unchecked_points.delete(current)

    let points = [current];
    let lines = [];

    if (!current.occupied)
      return [points, lines]

    for (let n of current.neighbours)
      if (n.occupied && unchecked_points.has(n))
        lines.push(new GridLine(current, n, 0));

    for (let n of current.neighbours) {
      if (!n.occupied)
        continue;

      let [np, nl] = this.calc_lines_rec(n, unchecked_points);
      points.push(...np);
      lines.push(...nl);
    }

    return [points, lines];
  }

  private draw() {
    let gs =
      this.view
        .selectAll('g')
        .data(this.clusters)
        .join('g')
        .attr('class', 'highlight');

    let board_size = this.nx * this.ny;
    // this ensures approximataly constant time per animation
    let line_dur = 10 * (this.anim_ms / board_size / this.p);
    // to get the feeling 'bigger board takes longer', 
    // we multiply with a strict monotonic function of the board_size
    line_dur = line_dur * 0.01 * Math.pow(board_size, 0.5)

    gs
      .selectAll('line')
      .data(d => d.lines)
      .join('line')
      .attr('x1', d => d.n1.x)
      .attr('x2', d => d.n1.x)
      .attr('y1', d => d.n1.y)
      .attr('y2', d => d.n1.y)
      .attr('stroke-width', this.r / 2)
      .attr('class', 'build')
      .transition()
      .duration(line_dur)
      .delay(d => this.anim_ms * 2 + this.anim_wait + line_dur * d.index)
      .attr('y2', d => d.n2.y)
      .attr('x2', d => d.n2.x)
      .transition()
      .duration(line_dur)
      .delay(line_dur * this.nx * this.ny / 10)
      .attr('class', '')


    gs
      .selectAll('circle')
      .data((d, i) => d.points.map((p) => { return { point: p, color: `hsl(${i * 360 / d.points.length}, 90%, 31%)` } }))
      .join('circle')
      .transition()
      .duration(this.anim_ms)
      .attr("cx", d => d.point.x)
      .attr("cy", d => d.point.y)
      .attr("r", String(this.r))
      .attr('fill', 'black')
      .attr('class', d => d.point.occupied ? 'active' : '')
      .transition()
      .delay(this.anim_wait)
      .duration(this.anim_ms)
      .attr('fill', d => d.point.occupied ? d.color : 'transparent')
  }

  private init() {
    this.nx = Number(this.x_slider.value);
    this.ny = Number(this.y_slider.value);

    this.calc_points();
    this.calc_lines();

    this.draw()
    this.svg.call(this.zoom);
  }


}

class GridPoint {
  public x: number;
  public y: number;
  public occupied: boolean;

  public neighbours: GridPoint[] = [];

  public constructor(x: number, y: number, occupied: boolean) {
    this.x = x;
    this.y = y;
    this.occupied = occupied;
  }

}

class GridLine {
  public n1: GridPoint;
  public n2: GridPoint;

  public index: number;

  public constructor(n1: GridPoint, n2: GridPoint, index: number) {
    this.n1 = n1;
    this.n2 = n2;
    this.index = index;
  }

}


let field = new Field('#mySVG', 1000, 100);