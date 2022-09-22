mod utils;

use std::rc::Rc;
use wasm_bindgen::prelude::*;

// When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
// allocator.
#[cfg(feature = "wee_alloc")]
#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
    alert("Hello, percolation-rust!");
}

#[wasm_bindgen]
pub struct Universe {
    points: Vec<GridPoint>,
}

#[wasm_bindgen]
impl Universe {
    pub fn all_points(&self) -> *const GridPoint {
        self.points.as_ptr()
    }
}

#[wasm_bindgen]
pub struct GridPoint {
    pub x: isize,
    pub y: isize,
    pub occupied: bool,
}

impl GridPoint {
    fn new(x: isize, y: isize) -> GridPoint {
        GridPoint {
            x: x,
            y: y,
            occupied: false,
        }
    }
}

#[wasm_bindgen]
pub struct GridLine {
    n1: Rc<GridPoint>,
    n2: Rc<GridPoint>,
    pub index: u32,
}

#[wasm_bindgen]
impl GridLine {
    fn new(n1: Rc<GridPoint>, n2: Rc<GridPoint>, index: u32) -> GridLine {
        GridLine {
            n1: n1,
            n2: n2,
            index: index,
        }
    }

    pub fn x1(&self) -> isize {
        return self.n1.x;
    }

    pub fn x2(&self) -> isize {
        return self.n1.y;
    }

    pub fn y1(&self) -> isize {
        return self.n2.y;
    }

    pub fn y2(&self) -> isize {
        return self.n2.y;
    }
}
