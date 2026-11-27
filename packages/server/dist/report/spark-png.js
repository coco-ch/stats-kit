/*
 * Small charts of the key figures, as PNG images (RGBA, transparent background) for the e-mail report: mail clients show
 * neither SVG nor JavaScript. Drawn without dependency, with plain arithmetic only, so that a server written in another
 * language (the .NET server) draws exactly the same pixels.
 */
import { encodePng } from "./map-png.js";
/** Size of the images, in pixels (shown at half size: sharp on high-density screens). */
export const SPARK_WIDTH = 264;
export const SPARK_HEIGHT = 56;
/** Samples per pixel along each axis (smoothed edges). */
const S = 3;
function pixels(width, height, sample, colors, weights) {
    const out = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            // 1: full colour, 2: light colour (area under the line), 3: second colour; the pixel takes the colour of its samples
            let full = 0, light = 0, second = 0;
            for (let dy = 0; dy < S; dy++) {
                for (let dx = 0; dx < S; dx++) {
                    const s = sample(x * S + dx + 0.5, y * S + dy + 0.5);
                    if (s === 1)
                        full++;
                    else if (s === 2)
                        light++;
                    else if (s === 3)
                        second++;
                }
            }
            const i = (y * width + x) * 4;
            const c = second > full + light ? colors[1] : colors[0];
            out[i] = c[0];
            out[i + 1] = c[1];
            out[i + 2] = c[2];
            out[i + 3] = Math.round(((full * weights[0] + light * weights[1] + second * weights[2]) / (S * S)) * 255);
        }
    }
    return encodePng(out, width, height, 4);
}
/**
 * Trend of a series: line, light area below it, dot on the last value. `null` with fewer than two values or nothing above
 * zero (no line to draw).
 */
export function renderSparkline(values, color, width = SPARK_WIDTH, height = SPARK_HEIGHT) {
    const n = values.length;
    if (n < 2 || !values.some((v) => v > 0))
        return null;
    const W = width * S, H = height * S;
    const r = 3.5 * S, ht = 1.6 * S, pad = r + S;
    let lo = values[0], hi = values[0];
    for (const v of values) {
        if (v < lo)
            lo = v;
        if (v > hi)
            hi = v;
    }
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
        xs.push(pad + (i * (W - 2 * pad)) / (n - 1));
        ys.push(hi === lo ? H / 2 : pad + ((hi - values[i]) * (H - 2 * pad)) / (hi - lo));
    }
    const lx = xs[n - 1], ly = ys[n - 1];
    const r2 = r * r, ht2 = ht * ht;
    return pixels(width, height, (px, py) => {
        if ((px - lx) * (px - lx) + (py - ly) * (py - ly) <= r2)
            return 1;
        let curve = -1;
        for (let k = 0; k < n - 1; k++) {
            const x1 = xs[k], y1 = ys[k], x2 = xs[k + 1], y2 = ys[k + 1];
            if (px < x1 - ht || px > x2 + ht)
                continue;
            if (curve < 0 && px >= x1 && px <= x2)
                curve = y1 + ((px - x1) * (y2 - y1)) / (x2 - x1);
            const dx = x2 - x1, dy = y2 - y1;
            let t = ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy);
            if (t < 0)
                t = 0;
            if (t > 1)
                t = 1;
            const ex = x1 + t * dx - px, ey = y1 + t * dy - py;
            if (ex * ex + ey * ey <= ht2)
                return 1;
        }
        return curve >= 0 && py >= curve ? 2 : 0;
    }, [color, color], [1, 0.16, 1]);
}
/**
 * This period against the previous one, for a figure without a series (visits, bounce rate, goals): two rounded bars, the
 * previous period above in `before`, this period below in `now`. `null` if both are zero.
 */
export function renderCompare(previous, current, now, before, width = SPARK_WIDTH, height = SPARK_HEIGHT) {
    if (!(previous > 0) && !(current > 0))
        return null;
    const W = width * S;
    const max = previous > current ? previous : current;
    const R = 7 * S, top = 10 * S, gap = 8 * S;
    const x0 = S;
    const end = (v) => {
        const x = x0 + ((v > 0 ? v : 0) * (W - 2 * S)) / max;
        return x < x0 + 2 * R ? x0 + 2 * R : x;
    };
    const bars = [[top, end(previous), 3], [top + 2 * R + gap, end(current), 1]];
    return pixels(width, height, (px, py) => {
        for (const [y, x1, colour] of bars) {
            const cy = y + R;
            if (py < y || py > y + 2 * R)
                continue;
            if (px >= x0 + R && px <= x1 - R)
                return colour;
            const cx = px < x0 + R ? x0 + R : x1 - R;
            if ((px - cx) * (px - cx) + (py - cy) * (py - cy) <= R * R)
                return colour;
        }
        return 0;
    }, [now, before], [1, 0, 1]);
}
