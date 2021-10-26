import './style.css'
import * as d3 from "d3";
d3.create;

// const width = 400;
// const height = 400;
const anim_ms = 1000;
const anim_wait = 100;

const svg = d3.select('#mySVG') as d3.Selection<HTMLElement, SVGElement, HTMLElement, any>;

const width = svg.node().clientWidth;
const height = svg.node().clientHeight;


svg
  .attr("viewBox", String([0, 0, width, height]))
  .attr("width", width)
  .attr("height", height);

svg.node().addEventListener('click', reset);

const g = svg.append("g");

const zoom = d3.zoom().touchable(()=>{return true})
  .scaleExtent([0.25, 16])
  .on("zoom", zoomed);

function zoomed(event) {
  const {transform} = event;
  g.attr("transform", transform);
  // g.attr("stroke-width", 1 / transform.k);
}

function reset() {
  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity,
    d3.zoomTransform(svg.node()).invert([width / 2, height / 2])
  );
}


const button = d3.select('#percButton').node() as HTMLButtonElement;
const p_slider = d3.select('#pSlider').node() as HTMLInputElement;
const x_slider = d3.select('#xSlider').node() as HTMLInputElement;
const y_slider = d3.select('#ySlider').node() as HTMLInputElement;

let p = Number(p_slider.value);
let nx = Number(x_slider.value);
let ny = Number(y_slider.value);
const r = 2;

p_slider.previousElementSibling.innerHTML = `p=${p.toFixed(2)}`;
x_slider.previousElementSibling.innerHTML = `N_x=${nx.toFixed(0)}`;
y_slider.previousElementSibling.innerHTML = `N_y=${ny.toFixed(0)}`;

p_slider.addEventListener('input', ()=>{
  let p = Number(p_slider.value);
  p_slider.previousElementSibling.innerHTML = `p=${p.toFixed(2)}`;
});

x_slider.addEventListener('input', ()=>{
  let x = Number(x_slider.value);
  x_slider.previousElementSibling.innerHTML = `N_x=${x.toFixed(0)}`;
});

y_slider.addEventListener('input', ()=>{
  let y = Number(y_slider.value);
  y_slider.previousElementSibling.innerHTML = `N_y=${y.toFixed(0)}`;
});

p_slider.addEventListener('change', (e)=>{
  p = Number(p_slider.value);
  calc_occupation(p);
  draw_points();
  draw_lines(anim_ms);
});


let changed = true;
x_slider.addEventListener('change', ()=>{
  changed = true;
});
y_slider.addEventListener('change', ()=>{
  changed = true;
});

button.addEventListener('click', ()=>{
  if(changed){
    init()
    changed = false;
  }else{
    calc_occupation(Number(p_slider.value));
    draw_points();
    draw_lines(anim_ms);
  }
  // label_all_clusters();
});


let grid_points: GridPoint[] = [];
let grid_lines: GridLine[] = [];

class GridPoint {
  public x_int: number;
  public y_int: number;
  public x: number;
  public y: number;
  public occupied: boolean;
  public lines: GridLine[];
  public cluster: number | undefined;

  public html: SVGCircleElement;

  public constructor(x_int: number, y_int: number, x: number, y: number, occupied: boolean){
    this.x_int = x_int;
    this.y_int = y_int;
    this.x = x;
    this.y = y;
    this.occupied = occupied;
    this.cluster = undefined;
    this.lines = [];
  }

  public get index(){
    return this.x_int*ny+this.y_int;
  }
}

let active_cluster = undefined;

async function label_all_clusters(): Promise<{[cluster: number]: Array<GridLine | GridPoint>}>{
  let remaining = new Set(grid_points.map(v=>v.index));
  let label = 0;  

  let ret = {}; 

  while(remaining.size > 0){
    let cluster = label_cluster(grid_points[remaining.values().next().value], remaining, [], label);
    if(cluster.length > 0)
      ret[label] = cluster;
    // remaining.delete(remaining.values().next().value);
    label++;
  }

  
  svg.selectAll('line')
  .data(grid_lines)
  .each(function(a: GridLine){
    a.html = this as SVGLineElement;
  });

  svg.selectAll('circle')
  .data(grid_lines)
  .each(function(a: GridLine){
    a.html = this as SVGLineElement;
  });

  for(let line of grid_lines){
    line.html.addEventListener('mouseover', (e)=>{
      hightlight_cluster(ret[e.target.__data__.cluster])
    });
    line.html.addEventListener('mouseleave', (e)=>{
      dehightlight_cluster(ret[e.target.__data__.cluster])
    })
  }

  return ret;
}


function label_cluster(start: GridPoint, remaining: Set<number>, cluster: Array<GridLine | GridPoint>,  label: number): Array<GridLine | GridPoint> {  
  if(!remaining.has(start.index)){
    return cluster;
  }
  remaining.delete(start.index)

  if(!start.occupied){
    return cluster;
  }

  cluster.push(start)
  start.cluster = label;

  for(let l of start.lines){
    if(l.active){
      cluster.push(l);
      l.cluster = label;
      label_cluster(l.n1, remaining, cluster, label);
      label_cluster(l.n2, remaining, cluster, label);
    }
  }

  return cluster;
};

function hightlight_cluster(cluster: Array<GridLine | GridPoint>) {
  for(let el of cluster){
    if(el.html){
      console.log(el.html.attributes)
      el.html.setAttribute('stroke', 'red');
      el.html.setAttribute('fill', 'red');
    }
  }
}

function dehightlight_cluster(cluster: Array<GridLine | GridPoint>) {
  for(let el of cluster){
    if(el.html){
      console.log(el.html.attributes)
      el.html.setAttribute('stroke', 'black');
      el.html.setAttribute('fill', 'black');
    }
  }
}

class GridLine {
  public x1: number;
  public y1: number;
  public x2: number;
  public y2: number;
  public cluster: number | undefined;

  public html: SVGLineElement;


  public n1: GridPoint;
  public n2: GridPoint;

  public _active: boolean ;

  public constructor(n1: GridPoint, n2: GridPoint){
    this.n1 = n1;
    this.n2 = n2;
    this.x1 = n1.x;
    this.y1 = n1.y;
    this.x2 = n2.x;
    this.y2 = n2.y;
    this.n1.lines.push(this);
    this.n2.lines.push(this);
    // this.calc_active();
  }

  public calc_active(){
    this._active = this.n1.occupied && this.n2.occupied;
  }

  public get active(): boolean {
    return this.n1.occupied && this.n2.occupied;
  }
  
}

function calc_occupation(p: number){
  for(let grid_point of grid_points){
    grid_point.occupied = Math.random() < p;
  }
}

function calc_lines(){
  grid_lines = [];
  for(let y=0; y<ny; y++){
    let l = grid_points[y];
    for(let x=1; x<nx; x++){
      let r = grid_points[(x)*ny+(y)];
      grid_lines.push(new GridLine(l, r))
      l = r;
    }
  }

  let grid_lines_vt = [];
  for(let x=0; x<nx; x++){
    let t = grid_points[x*ny];
    for(let y=1; y<ny; y++){
      let b = grid_points[(x)*ny+(y)];
      grid_lines.push(new GridLine(t, b))
      t = b;
    }
  }

}

function calc_points(){
  let x0 = 5;
  let y0 = 5;
  let dx = (width-10)/(nx-1);
  let dy = (height-10)/(ny-1);
  
  grid_points = [];

  for(let x = 0; x<nx; x ++)
    for(let y = 0; y<ny; y++){
      grid_points.push(new GridPoint(x, y,  x0+dx*x, y0+dy*y, Math.random() < p));
    }
}

function draw_lines(delay: number = 0){
  if(changed)
    g
      .selectAll("line")
      .data(grid_lines)
      .join('line')
      .attr('x1', d=> d.x1)
      .attr('x2', d=> d.x1)
      .attr('y1', d=> d.y1)
      .attr('y2', d=> d.y1)
      .attr('stroke', d=> d.active? 'black':null)
      .transition()
      .duration(anim_ms)
      .delay(delay)
      .attr('y2', d=> d.y2)
      .attr('x2', d=> d.x2)
  else 
    g
    .selectAll("line")
    .data(grid_lines)
    .join('line')
    .transition()
    .duration(anim_ms/2)
    .attr('x1', d=> d.x1)
    .attr('x2', d=> d.x1)
    .attr('y1', d=> d.y1)
    .attr('y2', d=> d.y1)
    .attr('stroke', d=> d.active? 'black':null)
    .transition()
    .duration(anim_ms)
    .delay(delay)
    .attr('y2', d=> d.y2)
    .attr('x2', d=> d.x2)
}

function draw_points(){
  if(changed){
    g
    .selectAll("circle")
    .data(grid_points)
    .join("circle")
    .transition()
    .duration(anim_ms)
      .attr("cx", d => d.x )
      .attr("cy", d => d.y )
      .attr("r", r)
      .attr("fill", d => 'black')
      .transition()
      .delay(anim_wait)
      .duration(anim_ms)
      .attr("fill", d => d.occupied? 'black':'rgba(0,0,0,0)');

  }else{
    g
    .selectAll("circle")
    .data(grid_points)
    .join("circle")
      .attr("cx", d => d.x )
      .attr("cy", d => d.y )
      .attr("r", r)
      .transition()
      .duration(anim_ms/2)
      .attr("fill", d => 'black')
      .transition()
      .delay(anim_wait)
      .duration(anim_ms)
      .attr("fill", d => d.occupied? 'black':'rgba(0,0,0,0)');
  }
}

function init(){
  nx = Number(x_slider.value);
  ny = Number(y_slider.value);

  calc_points();
  calc_lines();

  draw_points();
  draw_lines(anim_ms);

  // label_all_clusters();
}

svg.call(zoom);
init();