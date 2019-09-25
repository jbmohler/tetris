// TODO:
// * difficulty: easy, medium, hard
// * congealing shapes on commit

var BOX_DIMN = 20;
var WIDTH = 10;
var HEIGHT = 25;
var SHAPE_COLOR = {
	"red": "#ff1a1a",
	"blue": "#1a1aff",
	"yellow": "#ffa500",
	"green": "#00b33c",
	"purple": "#6600ff",
	"magenta": "#ff00ff"}

var GAME_PULSE = 0;
var GAME_SCORE = 0;
var GAME_STATE = "empty";

var MAP = null;
var dropping = null;
var hsdb = null;

function clear_all(){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "white";
	ctx.fillRect(0, 0, WIDTH*BOX_DIMN, HEIGHT*BOX_DIMN);

	for( var y = 0; y < HEIGHT; y++ ){
		for( var x = 0; x < WIDTH; x++ ){
			ctx.fillStyle = "#ffffff";
			ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
			if( MAP[y][x] == null ){
				ctx.beginPath();
				ctx.strokeStyle = "lightGray";
				ctx.rect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
				ctx.stroke();
			}
		}
	}

}

function clearbox(x, y){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = "#ffffff";
	ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
	ctx.beginPath();
	ctx.strokeStyle = "lightGray";
	ctx.rect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
	ctx.stroke();
}

function drawbox(x, y, color){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	ctx.fillStyle = SHAPE_COLOR[color];
	ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
	ctx.beginPath();
	ctx.strokeStyle = "white";
	ctx.rect(x*BOX_DIMN+2, y*BOX_DIMN+2, BOX_DIMN-4, BOX_DIMN-4);
	ctx.stroke();
}

function full_redraw(){
	var canvas = document.getElementById("board");
	var ctx = canvas.getContext("2d");

	for( var y = 0; y < HEIGHT; y++ ){
		for( var x = 0; x < WIDTH; x++ ){
			var color = MAP[y][x];
			if( color == null ){
				color = "#ffffff";
			} else {
				color = SHAPE_COLOR[color];
			}
			ctx.fillStyle = color;
			ctx.fillRect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
			if( MAP[y][x] == null ){
				ctx.beginPath();
				ctx.strokeStyle = "lightGray";
				ctx.rect(x*BOX_DIMN, y*BOX_DIMN, BOX_DIMN, BOX_DIMN);
				ctx.stroke();
			} else {
				ctx.beginPath();
				ctx.strokeStyle = "white";
				ctx.rect(x*BOX_DIMN+2, y*BOX_DIMN+2, BOX_DIMN-4, BOX_DIMN-4);
				ctx.stroke();
			}
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
			(item[1] < 0 || cell_empty(item));
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
	var rp = new RotateSE(
			shape.rotpnt.x + delta[0], 
			shape.rotpnt.y + delta[1]);
	return new ShapeObject(newcells, rp, shape.color);
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

function rotated_shape(shape, delta){
	function translate(cell, rotpnt) {
		// assumes rotpnt is a SE rotate point
		var x = cell[0];
		var y = cell[1];
		var nx = x - rotpnt.x - ((x <= rotpnt.x) ? 1 : 0);
		var ny = y - rotpnt.y - ((y <= rotpnt.y) ? 1 : 0);
		return [nx, ny];
	}
	function rotate(cell){
		var x = cell[0];
		var y = cell[1];
		return [y * delta[0], x * delta[1]];
	}
	function untranslate(cell, rotpnt){
		// assumes rotpnt is a SE rotate point
		var x = cell[0];
		var y = cell[1];
		var nx = x + rotpnt.x + ((x < 0) ? 1 : 0);
		var ny = y + rotpnt.y + ((y < 0) ? 1 : 0);
		return [nx, ny];
	}

	var newcells = [];
	rp = shape.rotpnt;
	shape.cells.forEach(function (item) {
		var nc = untranslate(rotate(translate(item, rp)), rp);
		newcells.push(nc)
	});
	return new ShapeObject(newcells, shape.rotpnt, shape.color);
}

function rotate_left(shape) {
	return rotated_shape(shape, [-1, 1]);
}
function rotate_right(shape) {
	return rotated_shape(shape, [1, -1]);
}

function control_steer(ekey){
	if( GAME_STATE != "active" || dropping == null ){
		return;
	}

	var func = {
			"j": move_left,
			"l": move_right,
			"i": rotate_left,
			"k": rotate_right}[ekey];

	var target = func(dropping);
	if( is_legal(target) ) {
		paint_update_cell(dropping, target);
		dropping = target;
	}
}

function control_drop(){
	if( GAME_STATE != "active" || dropping == null ){
		return;
	}

	drop(dropping);
}

function control_pause(){
	if( GAME_STATE != "active" && GAME_STATE != "pause" ){
		return;
	}
	$('#pause').toggleClass('red');	
	if( GAME_STATE == "active" ){
		GAME_STATE = "pause";
	} else if( GAME_STATE == "pause" ){
		GAME_STATE = "active";
	}
}

function keyevent(event){
	if( ['j', 'l', 'i', 'k'].includes(event.key) ) {
		control_steer(event.key);
	}
	if( event.key == ' ' ){
		control_drop();
	}
	if( event.keyCode == 32 && event.target == document.body ) {
		event.preventDefault();
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
			newmap.push(empty_row());
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

		read_top_10(hsdb, function (hslist) {
			console.log("checking out "+hslist.length);
			if( hslist.length >= 10 && hslist[hslist.length-1].score >= GAME_SCORE ) {
				return;
			}

			// record the high score
			var name = "";
			while( name == null || name == "" ){
				name = prompt("High score name", "");
			}
			if( name != null && name != "" ){
				var data = {
					"name": name,
					"score": GAME_SCORE,
					"created": new Date().getTime()
				}

				var trans = hsdb.transaction(["scores"], "readwrite");
				var store = trans.objectStore("scores");

				console.log("writing the name");
				var request = store.put(data);
				if( hslist.length >= 10 ){
					hslist.slice(9).forEach(function (v) {
						console.log(JSON.stringify(v, null, 4));
						store.delete(v.rowid);
					});
				}

				request.onsuccess = function(e) {
					load_hs_table(hsdb);
				};
			}
		});
	}
}

function empty_row() {
	var rr = [];
	for( var x; x<WIDTH; x++ ){
		rr.push(null);
	}
	return rr;
}

function new_tetris_game() {
	MAP = new Array(HEIGHT);
	for( var row = 0; row < HEIGHT; row++ ){
		MAP[row] = empty_row();
	}
	clear_all();
	GAME_PULSE = 0;
	GAME_STATE = "active";
	new_drop();
}

function format(date) {
	date = new Date(date);

	var day = ('0' + date.getDate()).slice(-2);
	var month = ('0' + (date.getMonth() + 1)).slice(-2);
	var year = date.getFullYear();

	return year + '-' + month + '-' + day;
}

function read_top_10(hsdb, oncomplete){
	var objectStore = hsdb.transaction("scores").objectStore("scores");

	var hslist = [];
	objectStore.openCursor().onsuccess = function(event) {
		var cursor = event.target.result;
		if (cursor) {
			hslist.push(cursor.value);
			cursor.continue();
		} else {
			hslist.sort(function (a, b) {return b.score - a.score});

			oncomplete(hslist);

			console.log("No more entries!");
		}
	};
}

function load_hs_table(hsdb){
	$("#highscores tbody").empty();
	read_top_10(hsdb, function (hslist) {
		hslist.forEach(function (v) {
			// read and fill the high score table
			var n = v.name;
			if( n.length > 15 ){
				n = n.slice(0, 15);
			}
			$("#highscores tbody").append("<tr><td>"+n+"</td><td>"+v.score+"</td><td>"+format(v.created)+"</td></tr>");
		});
	});
}

function prepare_high_score(){
	'use strict';

	//check for support
	if (!('indexedDB' in window)) {
		console.log('This browser doesn\'t support IndexedDB');
		return;
	}

	var idb = window.indexedDB;
	var idbopen = idb.open('tetris-high-score', 2);
	console.log('opening');

	idbopen.onupgradeneeded = function(event) {
		var db = event.target.result;

		if (!db.objectStoreNames.contains('scores')) {
			console.log('upgrading');
			db.createObjectStore('scores', {keyPath: 'rowid', autoIncrement: true});
		}
	};

	idbopen.onsuccess = function(event) {
		console.log('going to read');
		hsdb = event.target.result;
		load_hs_table(hsdb);
	};
}

function eatevent(event) {
	event.preventDefault();
}

$(document).ready(function() {
	// Prevent capturing focus by the button.
	$('#newgame').on('mousedown', eatevent);
	$('#leftrotate').on('mousedown', eatevent);
	$('#leftmove').on('mousedown', eatevent);
	$('#rightrotate').on('mousedown', eatevent);
	$('#rightmove').on('mousedown', eatevent);
	$('#drop').on('mousedown', eatevent);
	$('#pause').on('mousedown', eatevent);

	$('body').on('keydown', keyevent);
	setInterval(tickevent, 400);

	prepare_high_score();
});
