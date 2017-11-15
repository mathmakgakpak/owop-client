"use strict";
import { colorUtils as color } from './util/color.js';
import { EVENTS as e, protocol } from './conf.js';
import { getTime } from './util/misc.js';
import { eventSys, PublicAPI } from './global.js';
import { camera, renderer } from './canvas_renderer.js';

export const PLAYERFX = {
	NONE: null,
	RECT_SELECT_ALIGNED: (pixelSize) => (fx, ctx, time) => {
		var x = fx.extra.player.x;
		var y = fx.extra.player.y;
		var fxx = (Math.floor(x / (16 * pixelSize)) * pixelSize - camera.x) * camera.zoom;
		var fxy = (Math.floor(y / (16 * pixelSize)) * pixelSize - camera.y) * camera.zoom;
		ctx.globalAlpha = 0.8;
		ctx.strokeStyle = fx.extra.player.htmlRgb;
		ctx.strokeRect(fxx, fxy, camera.zoom * pixelSize, camera.zoom * pixelSize);
		return 1; /* Rendering finished (won't change on next frame) */
	}
};

export const WORLDFX = {
	NONE: null,
	RECT_FADE_ALIGNED: (size, x, y, startTime = getTime()) => (fx, ctx, time) => {
		var alpha = 1 - (time - startTime) / 1000;
		if (alpha <= 0) {
			fx.delete();
			return 2; /* 2 = An FX object was deleted */
		}
		var fxx = (x * size - camera.x) * camera.zoom;
		var fxy = (y * size - camera.y) * camera.zoom;
		ctx.globalAlpha = alpha;
		ctx.strokeStyle = fx.extra.htmlRgb || "#000000";
		ctx.strokeRect(fxx, fxy, camera.zoom * size, camera.zoom * size);
		return 0; /* 0 = Animation not finished */
	}
};

export const activeFx = [];

/*PublicAPI.activeFx = activeFx;*/

export class Fx {
    constructor(renderFunc, extra) {
		this.visible = true;
		this.renderFunc = renderFunc;
		this.extra = extra || {};
		activeFx.push(this);
	}

	render(ctx, time) {
		if (this.renderFunc && this.visible) {
			return this.renderFunc(this, ctx, time);
		}
		return 1;
	}
	
	setVisibleFunc(func) {
		Object.defineProperty(this, 'visible', {
			get: func
		});
	}

	setVisible(bool) {
		this.visible = bool;
	}

	setRenderer(func) {
		this.renderFunc = func;
	}
	
	update(extra) {
		this.extra = extra;
	}

	delete() {
		var i = activeFx.indexOf(this);
		if(i !== -1) {
			activeFx.splice(i, 1);
		}
	}
}

PublicAPI.fx = {
	world: WORLDFX,
	player: PLAYERFX,
	class: Fx
};

eventSys.on(e.net.world.tilesUpdated, tiles => {
	let time = getTime(true);
	let made = false;
	for (var i = 0; i < tiles.length; i++) {
		var t = tiles[i];
		if (camera.isVisible(t.x, t.y, 1, 1)) {
			new Fx(WORLDFX.RECT_FADE_ALIGNED(1, t.x, t.y), { htmlRgb: color.toHTML(t.rgb ^ 0xFFFFFF) });
			made = true;
		}
	}
	if (made) {
		renderer.render(renderer.rendertype.FX);
	}
});

eventSys.on(e.net.chunk.set, (chunkX, chunkY, data) => {
	var wX = chunkX * protocol.chunkSize;
	var wY = chunkY * protocol.chunkSize;
	if (camera.isVisible(wX, wY, protocol.chunkSize, protocol.chunkSize)) {
		new Fx(WORLDFX.RECT_FADE_ALIGNED(16, chunkX, chunkY));
		renderer.render(renderer.rendertype.FX);
	}
});
