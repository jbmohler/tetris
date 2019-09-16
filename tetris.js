// TODO:
// * support rotate
// * make pause feature
// * beautiful styling
// * unfocus the new game button so it does not continue respond to space

var BOX_DIMN = 10;
var WIDTH = 10;
var HEIGHT = 30;
var SHAPE_COLOR = {
	"red": "#ff1a1a",
	"blue": "#1a1aff",
	"yellow": "#e6e600",
	"green": "#00b33c",
	"purple": "#6600ff",
	"magenta": "#ff00ff"}

var GAME_PULSE = 0;
var GAME_SCORE = 0;
var GAME_STATE = "empty";

var MAP = null;
var dropping = null;

function clear_all(){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, WIDTH*BOX_DIMN, HEIGHT*BOX_DIMN);
}

function clearbox(x, y){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
}

function drawbox(x, y, color){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = SHAPE_COLOR[color];
	ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
}

function full_redraw(){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	for( var y = 0; y < HEIGHT; y++ ){
		for( var x = 0; x < WIDTH; x++ ){
			var color = MAP[y][x];
			if( color == null ){
				color = "#ffffff";
			}
			ctx.fillStyle = color;
			ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
		}
	}
}

function cell_empty(item) {
	x = item[0];
	y = item[1];
	return MAP[y][x] == null;
}

function row_full(row) {
	var rowcells = MAP[row];
	for( var x = 0; x < WIDTH; x++ ){
		if( rowcells[x] == null ){
			return false;
		}
	}
	return true;
}

function is_legal(shape) {
	var legal = true;
	shape.cells.forEach(function (item) {
		//console.log(GAME_PULSE+":  "+item[0]+"--"+item[1]+"->"+HEIGHT+"<-"+legal)
		legal = legal && 
			item[0] >= 0 && item[0] < WIDTH &&
			item[1] < HEIGHT && 
			cell_empty(item);
	});
	return legal;
}

function ShapeObject(cells, rotpnt, color) {
	this.cells = cells;
	this.rotpnt = rotpnt;
	this.color = color;

	this.north = {};
	this.east = {};
	this.south = {};
	this.west = {};
	var outer = this;
	this.cells.forEach(function (item) {
		x = item[0];
		y = item[1];
		if( outer.north[x] === undefined || outer.north[x] > y ){
			outer.north[x] = y;
		}
		if( outer.east[y] === undefined || outer.east[y] > x ){
			outer.east[y] = x;
		}
		if( outer.south[x] === undefined || outer.south[x] < y ){
			outer.south[x] = y;
		}
		if( outer.east[y] === undefined || outer.east[y] < x ){
			outer.east[y] = x;
		}
	});

	return this;
}

function moved_shape(shape, delta) {
	var newcells = [];
	shape.cells.forEach(function (item) {
		x = item[0];
		y = item[1];

		newcells.push([x+delta[0], y+delta[1]]);
	});
	return new ShapeObject(newcells, shape.rotpnt, shape.color);
}

function drop(shape) {
	var candidate = null;
	for( var y = 1; y < HEIGHT; y++ ){
		var cc = moved_shape(shape, [0, y]);
		if( is_legal(cc) ){
			candidate = cc;
		} else {
			break;
		}
	}
	if( candidate != null ){
		paint_update_cell(dropping, candidate);
		commit_shape(candidate);
		dropping = null;
	}
}

function move_left(shape) {
	return moved_shape(shape, [-1, 0]);
}
function move_right(shape) {
	return moved_shape(shape, [1, 0]);
}
function move_down(shape) {
	return moved_shape(shape, [0, 1]);
}
function rotate_left(shape) {
	return shape;
	return rotated_shape(shape, [-1, 1]);
}
function rotate_right(shape) {
	return rotated_shape(shape, [1, -1]);
}

function keyevent(event){
	if( GAME_STATE != "active" || dropping == null ){
		return;
	}

	var func = {
			"j": move_left,
			"l": move_right,
			"i": rotate_left,
			"k": rotate_right}[event.key];
	if( func !== undefined ){
		var target = func(dropping);
		if( is_legal(target) ) {
			paint_update_cell(dropping, target);
			dropping = target;
		}
	}
	if( event.key == ' ' ){
		drop(dropping);
	}
}

function commit_shape(shape) {
	var rows = [];
	shape.cells.forEach(function (item) {
		x = item[0];
		y = item[1];
		if( !rows.includes(y) ) {
			rows.push(y);
		}
		MAP[y][x] = shape.color;
	});
	var collapse = [];
	rows.forEach(function (row) {
		if( row_full(row) ){
			collapse.push(row);
		}
	});
	if( collapse.length > 0 ){
		GAME_SCORE = GAME_SCORE + collapse.length ** 2;
		var newmap = new Array();
		for( var row = 0; row < collapse.length; row++ ){
			newmap.push(new Array(WIDTH));
		}
		for( var row = 0; row < HEIGHT; row++ ){
			if( !collapse.includes(row) ){
				newmap.push(MAP[row]);
			}
		}
		MAP = newmap;
		full_redraw();
	}
}

function tickevent(){
	if( GAME_STATE != "active" ){
		return;
	}

	if( dropping != null ){
		var target = move_down(dropping);
		if( is_legal(target) ) {
			paint_update_cell(dropping, target);
			dropping = target;
		} else {
			commit_shape(dropping);
			dropping = null;
		}
	} else {
		new_drop();
	}

	GAME_PULSE = GAME_PULSE + 1;
	$('#pulse').text('ticker '+(GAME_PULSE+0));
	$('#score').text('score '+(GAME_SCORE+0));
}

function paint_object(shape){
	shape.cells.forEach(function (item) {
		x = item[0];
		y = item[1];

		drawbox(x, y, shape.color);
	});
}

function paint_update_cell(oldshape, newshape) {
	// TODO:  compare & paint
	oldshape.cells.forEach(function (item) {
		var x = item[0];
		var y = item[1];

		clearbox(x, y);
	});
	newshape.cells.forEach(function (item) {
		var x = item[0];
		var y = item[1];

		drawbox(x, y, newshape.color);
	});
}

function RotateSE(x, y) {
	this.mode = 'se-corner';
	this.x = x;
	this.y = y;
	return this;
}

function shape_long() {
	cells = [[1, 1], [2, 1], [3, 1], [4, 1]];
	var x = new ShapeObject(cells, new RotateSE(2, 1), "green");
	return x;
}

function shape_offset_r() {
	cells = [[1, 1], [1, 2], [2, 2], [2, 3]];
	var x = new ShapeObject(cells, new RotateSE(1, 1), "red");
	return x;
}

function shape_offset_l() {
	cells = [[4, 7], [4, 8], [5, 6], [5, 7]];
	var x = new ShapeObject(cells, new RotateSE(4, 6), "magenta");
	return x;
}

function shape_ell_r() {
	cells = [[1, 4], [2, 4], [3, 4], [3, 5]];
	var x = new ShapeObject(cells, new RotateSE(2, 4), "purple");
	return x;
}

function shape_ell_l() {
	cells = [[1, 4], [2, 4], [3, 4], [1, 5]];
	var x = new ShapeObject(cells, new RotateSE(1, 4), "yellow");
	return x;
}

function shape_square() {
	cells = [[6, 1], [6, 2], [7, 1], [7, 2]];
	var x = new ShapeObject(cells, new RotateSE(6, 1), "blue");
	return x;
}

function random_shape() {
	var index = Math.floor(Math.random() * 6);
	var func = {
		0: shape_long,
		1: shape_offset_r,
		3: shape_offset_l,
		5: shape_ell_r,
		4: shape_ell_l,
		2: shape_square}[index];
	var sh = func();
	var rotation = Math.floor(Math.random()*4);
	for( var i = 0; i < rotation; i++ ){
		sh = rotate_left(sh);
	}
	return sh;
}

function new_drop() {
	var shape = random_shape();
	var xdiff = WIDTH/2 - 1 - shape.rotpnt.x;
	var ydiff = 0 - shape.rotpnt.y;
	shape = moved_shape(shape, [xdiff, ydiff]);
	if( is_legal(shape) ){
		dropping = shape;
		paint_object(dropping);
	}else{
		$('#winloss').text("game over");
		GAME_STATE = "game-over";
	}
}

function new_tetris_game() {
	MAP = new Array(HEIGHT);
	for( var row = 0; row < HEIGHT; row++ ){
		MAP[row] = new Array(WIDTH);
	}
	clear_all();
	GAME_PULSE = 0;
	GAME_STATE = "active";
	new_drop();
}

$(document).ready(function() {
	$('body').on('keydown', keyevent);
	setInterval(tickevent, 1000);
});
