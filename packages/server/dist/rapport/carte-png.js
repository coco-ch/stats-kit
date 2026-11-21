/*
 * Carte du monde en PNG pour le rapport par e-mail. Les messageries (Outlook surtout) n'affichent ni SVG ni JavaScript : la carte
 * est dessinée ici, sans dépendance (zlib de Node), avec la même projection que la carte de la page.
 */
import { readFileSync } from 'node:fs';
import { deflateSync, crc32 } from 'node:zlib';
import { CENTROIDES, LAT_MAX, LAT_MIN, intensity, polygonsOf } from 'stats-kit/contrat';
const SUPERSAMPLE = 2;
/** Fond de carte livré avec la librairie (Natural Earth 1:110m, domaine public). */
export const worldFile = () => new URL('../../assets/world-110m.json', import.meta.url);
let world = null;
/** Lit un fond de carte ; celui de la librairie n'est lu qu'une fois. */
export function loadWorld(file) {
    if (file !== undefined)
        return JSON.parse(readFileSync(file, 'utf8'));
    return (world ??= JSON.parse(readFileSync(worldFile(), 'utf8')));
}
const mix = (a, b, t) => [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t));
/** Remplit un polygone (anneau extérieur et trous) par balayage, règle pair-impair. */
function fill(rings, paint, height) {
    const edges = [];
    for (const pts of rings) {
        for (let i = 0; i < pts.length; i++) {
            const [x1, y1] = pts[i];
            const [x2, y2] = pts[(i + 1) % pts.length];
            if (y1 !== y2)
                edges.push(y1 < y2 ? [x1, y1, x2, y2] : [x2, y2, x1, y1]);
        }
    }
    if (!edges.length)
        return;
    const top = Math.max(0, Math.floor(Math.min(...edges.map((e) => e[1]))));
    const bottom = Math.min(height - 1, Math.ceil(Math.max(...edges.map((e) => e[3]))));
    for (let y = top; y <= bottom; y++) {
        const cy = y + 0.5;
        const xs = edges.filter((e) => e[1] <= cy && cy < e[3]).map((e) => e[0] + ((cy - e[1]) / (e[3] - e[1])) * (e[2] - e[0])).sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2)
            for (let x = Math.round(xs[i]); x < Math.round(xs[i + 1]); x++)
                paint(x, y);
    }
}
/** Segment (Bresenham). */
function line(x1, y1, x2, y2, paint) {
    let x = Math.round(x1), y = Math.round(y1);
    const ex = Math.round(x2), ey = Math.round(y2);
    const dx = Math.abs(ex - x), dy = -Math.abs(ey - y);
    const sx = x < ex ? 1 : -1, sy = y < ey ? 1 : -1;
    let err = dx + dy;
    for (;;) {
        paint(x, y);
        if (x === ex && y === ey)
            return;
        const e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y += sy;
        }
    }
}
/** Pixels RVB (8 bits) → PNG. */
export function encodePng(rgb, width, height) {
    const raw = Buffer.alloc((width * 3 + 1) * height);
    for (let y = 0; y < height; y++)
        Buffer.from(rgb.buffer, rgb.byteOffset + y * width * 3, width * 3).copy(raw, y * (width * 3 + 1) + 1);
    const chunk = (type, data) => {
        const head = Buffer.alloc(8);
        head.writeUInt32BE(data.length, 0);
        head.write(type, 4, 'ascii');
        const crc = Buffer.alloc(4);
        crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
        return Buffer.concat([head, data, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // 8 bits par canal
    ihdr[9] = 2; // RVB
    return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
/** Dessine la carte : pays visités colorés selon leurs visites, pastilles sur les petits pays. */
export function renderWorldMap(countries, w, colors, width = 1424) {
    const height = Math.round((width * (LAT_MAX - LAT_MIN)) / 360);
    const W = width * SUPERSAMPLE, H = height * SUPERSAMPLE;
    const buf = new Uint8Array(W * H * 3);
    for (let i = 0; i < W * H; i++)
        buf.set(colors.background, i * 3);
    const paintWith = (c) => (x, y) => { if (x >= 0 && x < W && y >= 0 && y < H)
        buf.set(c, (y * W + x) * 3); };
    const px = (lon, lat) => [((lon + 180) / 360) * W, ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * H];
    const counts = new Map();
    for (const c of countries)
        counts.set(c.key.toUpperCase(), (counts.get(c.key.toUpperCase()) ?? 0) + c.value);
    const max = Math.max(1, ...counts.values());
    const outlines = [];
    for (const f of w.features) {
        const n = counts.get(f.properties.iso2) ?? 0;
        const color = n ? mix(colors.low, colors.high, intensity(n, max)) : colors.land;
        for (const rings of polygonsOf(f)) {
            const projected = rings.map((ring) => ring.map(([lon, lat]) => px(lon, lat)));
            fill(projected, paintWith(color), H);
            outlines.push(...projected);
        }
    }
    const trace = paintWith(colors.border);
    for (const ring of outlines)
        for (let i = 0; i + 1 < ring.length; i++)
            line(ring[i][0], ring[i][1], ring[i + 1][0], ring[i + 1][1], trace);
    // pastilles : un petit pays disparaîtrait sinon sur une carte du monde
    for (const [code, n] of counts) {
        const c = CENTROIDES[code];
        if (!c || !n)
            continue;
        const [cx, cy] = px(c[1], c[0]);
        const r = (4 + 8 * (n / max)) * SUPERSAMPLE;
        for (let y = Math.floor(cy - r - 2); y <= Math.ceil(cy + r + 2); y++)
            for (let x = Math.floor(cx - r - 2); x <= Math.ceil(cx + r + 2); x++) {
                const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
                if (d <= r + SUPERSAMPLE)
                    paintWith(d <= r ? colors.high : [255, 255, 255])(x, y);
            }
    }
    // réduction par moyenne de blocs (bords lissés)
    const out = new Uint8Array(width * height * 3);
    for (let y = 0; y < height; y++)
        for (let x = 0; x < width; x++)
            for (let ch = 0; ch < 3; ch++) {
                let sum = 0;
                for (let dy = 0; dy < SUPERSAMPLE; dy++)
                    for (let dx = 0; dx < SUPERSAMPLE; dx++)
                        sum += buf[((y * SUPERSAMPLE + dy) * W + x * SUPERSAMPLE + dx) * 3 + ch];
                out[(y * width + x) * 3 + ch] = Math.round(sum / (SUPERSAMPLE * SUPERSAMPLE));
            }
    return { png: encodePng(out, width, height), width, height };
}
