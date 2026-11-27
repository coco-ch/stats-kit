import { isPlatformBrowser } from "@angular/common";
import * as i0 from "@angular/core";
import { ChangeDetectionStrategy, Component, DOCUMENT, DestroyRef, Injectable, InjectionToken, LOCALE_ID, PLATFORM_ID, afterNextRender, computed, effect, inject, input, signal, untracked, viewChild } from "@angular/core";
import { CENTROIDS, MAP_RATIO, bestSlot, browserName, byKey, cannibalization, capitalize, channelName, countryName, createTexts, csvSeparator, delta, deviceName, featurePath, fileName, fill, formatDuration, formatNumber, formatPercent, gap, hourName, intensity, isBrand, labelValue, languageName, lastDays, longDay, lostPages, lowCtrPages, mixHex, movers, newQueries, niceStep, pathOf, plural, potential, project, rangeText, regionName, shortDate, shortDateTime, slotLabel, sparkPath, toCsv, weekdayName } from "stats-kit/contract";
import { HttpClient } from "@angular/common/http";
import { firstValueFrom } from "rxjs";
const STATS_KIT_OPTIONS = new InjectionToken("STATS_KIT_OPTIONS");
const provideStatsKit = (options) => [{
	provide: STATS_KIT_OPTIONS,
	useValue: options
}];
function injectOptions() {
	const options = inject(STATS_KIT_OPTIONS, { optional: true }) ?? { apiUrl: "/api/admin/audience" };
	return options.locale ? options : {
		...options,
		locale: inject(LOCALE_ID, { optional: true }) ?? void 0
	};
}
function resolveTexts(o, locale, overrides) {
	const lang = locale ?? o.locale ?? "en";
	const base = createTexts(lang, o.texts, o.baseTexts);
	return overrides ? createTexts(lang, overrides, base) : base;
}
function worldAddress(o, apiUrl, worldUrl) {
	return worldUrl || o.worldUrl || `${(apiUrl || o.apiUrl).replace(/\/+$/, "")}/world.json`;
}
function loadOnSource(base, load) {
	const browser = isPlatformBrowser(inject(PLATFORM_ID));
	let last = null;
	effect(() => {
		const b = base();
		if (!browser || b === last) return;
		const first = last === null;
		last = b;
		untracked(() => load(first));
	});
}
var StatsKitApi = class StatsKitApi {
	http = inject(HttpClient);
	worlds = /* @__PURE__ */ new Map();
	get(base, path, params = {}) {
		return firstValueFrom(this.http.get(`${base.replace(/\/+$/, "")}${path}`, { params }));
	}
	post(base, path, params = {}) {
		return firstValueFrom(this.http.post(`${base.replace(/\/+$/, "")}${path}`, {}, { params }));
	}
	world(url) {
		let p = this.worlds.get(url);
		if (!p) {
			p = firstValueFrom(this.http.get(url)).catch((e) => {
				this.worlds.delete(url);
				throw e;
			});
			this.worlds.set(url, p);
		}
		return p;
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: StatsKitApi,
		deps: [],
		target: i0.ɵɵFactoryTarget.Injectable
	});
	static ɵprov = i0.ɵɵngDeclareInjectable({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: StatsKitApi,
		providedIn: "root"
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: StatsKitApi,
	decorators: [{
		type: Injectable,
		args: [{ providedIn: "root" }]
	}]
});
function download(doc, name, content, type = "text/csv;charset=utf-8") {
	const url = URL.createObjectURL(new Blob([content], { type }));
	const a = doc.createElement("a");
	a.href = url;
	a.download = name;
	doc.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}
const TOKENS = `
  :host { 
  --_card:#ffffff; --_bg:transparent; --_ink:#141a2a; --_ink2:#343c50; --_muted:#566073; --_line:#e1e5ee; --_line2:#c3c9d6;
  --_brand:#2f5bd3; --_brand-ink:#ffffff; --_c1:#2f5bd3; --_c1h:#1f43a8; --_c2:#c2410c; --_c3:#7c8598;
  --_up:#0a6e53; --_up-soft:#e2f3ec; --_down:#b3261e; --_down-soft:#fbe8e6; --_warn:#7c5100; --_warn-soft:#fff2d4;
  --_hover:#f3f5fa; --_track:#e8ebf2; --_input:#ffffff; --_badge:#eef1f6;
  --_map-sea:#f3f5fa; --_map-land:#dde2ec; --_map-border:#ffffff; --_map-lo:#bccaf2; --_map-hi:#1d3c9c;
  --_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);
  color-scheme: light; 
  --k-card: var(--sk-card, var(--_card));
  --k-bg: var(--sk-bg, var(--_bg));
  --k-ink: var(--sk-ink, var(--_ink));
  --k-ink2: var(--sk-ink-2, var(--_ink2));
  --k-muted: var(--sk-muted, var(--_muted));
  --k-line: var(--sk-line, var(--_line));
  --k-line2: var(--sk-line-strong, var(--_line2));
  --k-brand: var(--sk-brand, var(--_brand));
  --k-brand-ink: var(--sk-on-brand, var(--_brand-ink));
  --k-c1: var(--sk-chart-1, var(--_c1));
  --k-c1h: var(--sk-chart-1-hover, var(--_c1h));
  --k-c2: var(--sk-chart-2, var(--_c2));
  --k-c3: var(--sk-chart-3, var(--_c3));
  --k-up: var(--sk-up, var(--_up));
  --k-up-soft: var(--sk-up-soft, var(--_up-soft));
  --k-down: var(--sk-down, var(--_down));
  --k-down-soft: var(--sk-down-soft, var(--_down-soft));
  --k-warn: var(--sk-warn, var(--_warn));
  --k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));
  --k-hover: var(--sk-hover, var(--_hover));
  --k-track: var(--sk-bar-track, var(--_track));
  --k-input: var(--sk-input, var(--_input));
  --k-badge: var(--sk-badge, var(--_badge));
  --k-map-sea: var(--sk-map-sea, var(--_map-sea));
  --k-map-land: var(--sk-map-land, var(--_map-land));
  --k-map-border: var(--sk-map-border, var(--_map-border));
  --k-map-lo: var(--sk-map-lo, var(--_map-lo));
  --k-map-hi: var(--sk-map-hi, var(--_map-hi));
  --k-shadow: var(--sk-shadow, var(--_shadow));
 --k-radius: var(--sk-radius, 12px); --k-gap: var(--sk-gap, 12px); --k-font: var(--sk-font, inherit); --k-w-strong: var(--sk-weight-strong, 700); --k-w-label: var(--sk-weight-label, 600); --k-w-control: var(--sk-weight-control, 600); --k-w-row: var(--sk-weight-row, 500); }
  :host-context([data-sk-mode=dark]) { 
  --_card:#171c27; --_ink:#e9ecf4; --_ink2:#c8cedb; --_muted:#a5adbf; --_line:#2b3242; --_line2:#414a5e;
  --_brand:#8fb0ff; --_brand-ink:#0e1424; --_c1:#7d9ef7; --_c1h:#a9c0ff; --_c2:#ff9b62; --_c3:#8d96aa;
  --_up:#6fdcb1; --_up-soft:#143a2e; --_down:#ff9f95; --_down-soft:#43201d; --_warn:#ffd27a; --_warn-soft:#3d3014;
  --_hover:#1f2634; --_track:#283042; --_input:#11151e; --_badge:#252c3b;
  --_map-sea:#121722; --_map-land:#2a3140; --_map-border:#171c27; --_map-lo:#2c437f; --_map-hi:#9ab6ff;
  --_shadow:0 1px 2px rgb(0 0 0 / 30%);
  color-scheme: dark; }
`;
const LAYOUT = `
  :host { display: block; width: 100%; min-width: 0; font-family: var(--k-font); color: var(--k-ink); background: var(--k-bg); line-height: 1.45; }
  * { box-sizing: border-box; }
  h1, h2, h3, p { margin: 0; }
  h1, h2, h3 { overflow-wrap: anywhere; font-weight: var(--k-w-strong); }
  b, strong { font-weight: var(--k-w-strong); }
  .sk-page { display: grid; gap: calc(var(--k-gap) * 1.33); min-width: 0; }
  .sk-head { display: grid; gap: .5rem; }
  .sk-head .sk-title { font-size: 1.6rem; line-height: 1.2; letter-spacing: -.01em; }
  .sk-lead { color: var(--k-muted); font-size: .95rem; max-width: 70ch; overflow-wrap: anywhere; }
  .sk-toolbar { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .5rem .75rem; }
  .sk-group { display: flex; flex-wrap: wrap; align-items: center; gap: .5rem; }
  .sk-card { min-width: 0; background: var(--k-card); border: 1px solid var(--k-line); border-radius: var(--k-radius); box-shadow: var(--k-shadow); padding: min(1rem, 16px); }
  .sk-card h2 { font-size: 1rem; }
  .sk-sub { margin-top: .2rem; font-size: .8rem; color: var(--k-muted); overflow-wrap: anywhere; }
  .sk-btn { display: inline-flex; align-items: center; justify-content: center; gap: .4rem; max-width: 100%; min-height: 36px; padding: .35rem min(.8rem, 13px); text-align: center; overflow-wrap: anywhere; font: inherit; font-size: .875rem; font-weight: var(--k-w-control); color: var(--k-ink); background: var(--k-card); border: 1px solid var(--k-line2); border-radius: var(--sk-radius-control, 8px); cursor: pointer; text-decoration: none; }
  .sk-btn:hover { border-color: var(--k-brand); color: var(--k-brand); }
  .sk-btn:disabled { opacity: .6; cursor: default; }
  .sk-btn--primary { background: var(--k-brand); border-color: var(--k-brand); color: var(--k-brand-ink); }
  .sk-btn--primary:hover { color: var(--k-brand-ink); filter: brightness(1.08); }
  .sk-btn:focus-visible, .sk-seg button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--k-brand); outline-offset: 2px; }
  .sk-seg { display: inline-flex; flex-wrap: wrap; max-width: 100%; padding: 3px; gap: 2px; background: var(--k-badge); border-radius: calc(var(--sk-radius-control, 8px) + 2px); }
  .sk-seg button { max-width: 100%; min-height: 32px; padding: .25rem min(.75rem, 12px); overflow-wrap: anywhere; font: inherit; font-size: .85rem; font-weight: var(--k-w-control); color: var(--k-ink2); background: transparent; border: 0; border-radius: var(--sk-radius-control, 8px); cursor: pointer; }
  .sk-seg button[aria-pressed=true] { background: var(--k-card); color: var(--k-ink); box-shadow: 0 1px 2px rgb(0 0 0 / 15%); }
  .sk-field { display: inline-flex; align-items: center; gap: .35rem; font-size: .85rem; color: var(--k-ink2); }
  .sk-field input, .sk-field select { min-height: 34px; padding: .2rem .45rem; font: inherit; color: var(--k-ink); background: var(--k-input); border: 1px solid var(--k-line2); border-radius: var(--sk-radius-control, 8px); }
  .sk-status { display: flex; flex-wrap: wrap; gap: .6rem; align-items: flex-start; padding: min(.75rem, 12px) min(1rem, 16px); overflow-wrap: anywhere; border-radius: var(--k-radius); font-size: .9rem; border: 1px solid var(--k-line); background: var(--k-card); }
  .sk-status--warn { background: var(--k-warn-soft); color: var(--k-warn); border-color: transparent; }
  .sk-status--err { background: var(--k-down-soft); color: var(--k-down); border-color: transparent; }
  .sk-status--ok { background: var(--k-up-soft); color: var(--k-up); border-color: transparent; }
  .sk-status > div { flex: 1 1 12rem; min-width: 0; }
  .sk-status b { display: block; }
  .sk-empty { padding: min(1.5rem, 24px) min(1rem, 16px); overflow-wrap: anywhere; text-align: center; color: var(--k-muted); }
  .sk-empty b { display: block; color: var(--k-ink); margin-bottom: .25rem; }
  .sk-section { display: grid; gap: var(--k-gap); scroll-margin-top: 1rem; }
  .sk-section > h2 { font-size: 1.15rem; display: flex; flex-wrap: wrap; align-items: baseline; gap: .25rem .6rem; }
  .sk-section > h2 small { font-size: .8rem; font-weight: 400; color: var(--k-muted); }
  .sk-grid { container-type: inline-size; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(26rem, 100%), 1fr)); gap: var(--k-gap); align-items: start; grid-auto-flow: dense; }
  @container (min-width: 53rem) { .sk-grid > .sk-wide { grid-column: span 2; } }
  .sk-twin { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); gap: var(--k-gap); align-items: stretch; }
  @media (max-width: 1100px) { .sk-twin { grid-template-columns: minmax(0, 1fr); } }
  .sk-jump { display: flex; flex-wrap: wrap; gap: .25rem .9rem; font-size: .85rem; }
  .sk-jump a { color: var(--k-brand); font-weight: var(--k-w-control); text-decoration: none; padding: .35rem 0; }
  .sk-jump a:hover { text-decoration: underline; }
  .sk-small { font-size: .8rem; color: var(--k-muted); overflow-wrap: anywhere; }
  .sk-sr { position: absolute !important; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
  .sk-field { flex-wrap: wrap; max-width: 100%; }
  .sk-field input, .sk-field select { max-width: 100%; }
  @media (max-width: 700px) { .sk-head .sk-title { font-size: 1.35rem; } }
  @media (max-width: 760px) {
    .sk-btn, .sk-seg button, .sk-field input, .sk-field select, .sk-pause { min-width: 48px; min-height: 48px; }
    .sk-jump a { display: inline-flex; align-items: center; min-height: 48px; min-width: 48px; padding-block: 0; }
  }
  @media print { .sk-toolbar, .sk-jump, .sk-noprint { display: none !important; } .sk-card { box-shadow: none; break-inside: avoid; } }
`;
function resolvedMode(choice) {
	const mq = inject(DOCUMENT).defaultView?.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
	const system = signal(mq?.matches ? "dark" : "light", ...ngDevMode ? [{ debugName: "system" }] : /* istanbul ignore next */ []);
	if (mq) {
		const on = (e) => system.set(e.matches ? "dark" : "light");
		mq.addEventListener("change", on);
		inject(DestroyRef).onDestroy(() => mq.removeEventListener("change", on));
	}
	return computed(() => choice() === "auto" ? system() : choice());
}
const ZERO = /^(?:0(?:[,.]0+)?(?:\s?%)?|—)$/;
var SkTile = class SkTile {
	label = input.required(...ngDevMode ? [{ debugName: "label" }] : /* istanbul ignore next */ []);
	value = input.required(...ngDevMode ? [{ debugName: "value" }] : /* istanbul ignore next */ []);
	change = input(null, ...ngDevMode ? [{ debugName: "change" }] : /* istanbul ignore next */ []);
	sub = input("", ...ngDevMode ? [{ debugName: "sub" }] : /* istanbul ignore next */ []);
	spark = input("", ...ngDevMode ? [{ debugName: "spark" }] : /* istanbul ignore next */ []);
	highlight = input(false, ...ngDevMode ? [{ debugName: "highlight" }] : /* istanbul ignore next */ []);
	link = input(null, ...ngDevMode ? [{ debugName: "link" }] : /* istanbul ignore next */ []);
	zero = computed(() => ZERO.test(this.value()), ...ngDevMode ? [{ debugName: "zero" }] : /* istanbul ignore next */ []);
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkTile,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkTile,
		isStandalone: true,
		selector: "sk-tile",
		inputs: {
			label: {
				classPropertyName: "label",
				publicName: "label",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			value: {
				classPropertyName: "value",
				publicName: "value",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			change: {
				classPropertyName: "change",
				publicName: "change",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			sub: {
				classPropertyName: "sub",
				publicName: "sub",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			spark: {
				classPropertyName: "spark",
				publicName: "spark",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			highlight: {
				classPropertyName: "highlight",
				publicName: "highlight",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			link: {
				classPropertyName: "link",
				publicName: "link",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: { properties: {
			"class.sk-zero": "zero()",
			"class.sk-hl": "highlight()"
		} },
		ngImport: i0,
		template: `
    <span class="sk-tile__label">{{ label() }}</span>
    <span class="sk-tile__row"><b class="sk-tile__value">{{ value() }}</b>@if (change()?.text) { <i [class]="'sk-d sk-d--' + change()!.tone">{{ change()!.text }}</i> }</span>
    <span class="sk-tile__sub">@if (sub()) { {{ sub() }} }@if (link(); as l) { @if (sub()) { <br /> }<a class="sk-tile__link" [href]="l.url">{{ l.label }}</a> }</span>
    <span class="sk-tile__trend">@if (spark()) { <svg class="sk-spark" [class.sk-spark--down]="change()?.tone === 'down'" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path [attr.d]="spark()" /></svg> }</span>
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);row-gap:.25rem;align-content:start;min-width:0;padding:min(.8rem,13px) min(1rem,16px);background:var(--k-card);overflow-wrap:anywhere}:host(.sk-hl){background:var(--k-warn-soft)}.sk-tile__label{align-self:end;font-size:.82rem;font-weight:var(--k-w-label);line-height:1.3;color:var(--k-muted)}.sk-tile__row{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem}.sk-tile__value{font-size:1.6rem;font-weight:var(--k-w-strong);line-height:1.1;letter-spacing:-.02em;color:var(--k-ink);font-variant-numeric:tabular-nums}@media(max-width:760px){:host .sk-d{white-space:normal}}:host(.sk-zero) .sk-tile__value{color:var(--k-muted);font-weight:var(--k-w-label)}.sk-tile__sub{font-size:.76rem;line-height:1.35;color:var(--k-muted)}.sk-tile__sub:empty,.sk-tile__trend:empty{display:none}.sk-tile__link{display:inline-flex;align-items:center;min-height:24px;font-weight:var(--k-w-label);color:var(--k-brand)}.sk-tile__link:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}@media(max-width:760px){.sk-tile__link{min-height:48px}}.sk-d{display:inline-block;max-width:100%;padding:.125rem .5rem;border-radius:999px;font-style:normal;font-size:.74rem;font-weight:var(--k-w-strong);line-height:1.45;white-space:nowrap;font-variant-numeric:tabular-nums;background:var(--k-badge);color:var(--k-muted)}.sk-d--up{background:var(--k-up-soft);color:var(--k-up)}.sk-d--down{background:var(--k-down-soft);color:var(--k-down)}svg.sk-spark{display:block!important;width:100%!important;height:22px!important;max-width:none!important;overflow:visible}.sk-spark path{fill:none;stroke:var(--k-c1);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}.sk-spark--down path{stroke:var(--k-c3)}\n"],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkTile,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-tile",
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: {
				"[class.sk-zero]": "zero()",
				"[class.sk-hl]": "highlight()"
			},
			template: `
    <span class="sk-tile__label">{{ label() }}</span>
    <span class="sk-tile__row"><b class="sk-tile__value">{{ value() }}</b>@if (change()?.text) { <i [class]="'sk-d sk-d--' + change()!.tone">{{ change()!.text }}</i> }</span>
    <span class="sk-tile__sub">@if (sub()) { {{ sub() }} }@if (link(); as l) { @if (sub()) { <br /> }<a class="sk-tile__link" [href]="l.url">{{ l.label }}</a> }</span>
    <span class="sk-tile__trend">@if (spark()) { <svg class="sk-spark" [class.sk-spark--down]="change()?.tone === 'down'" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true" focusable="false"><path [attr.d]="spark()" /></svg> }</span>
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:grid;grid-row:span 4;grid-template-rows:subgrid;grid-template-columns:minmax(0,1fr);row-gap:.25rem;align-content:start;min-width:0;padding:min(.8rem,13px) min(1rem,16px);background:var(--k-card);overflow-wrap:anywhere}:host(.sk-hl){background:var(--k-warn-soft)}.sk-tile__label{align-self:end;font-size:.82rem;font-weight:var(--k-w-label);line-height:1.3;color:var(--k-muted)}.sk-tile__row{display:flex;flex-wrap:wrap;align-items:baseline;gap:.2rem .55rem}.sk-tile__value{font-size:1.6rem;font-weight:var(--k-w-strong);line-height:1.1;letter-spacing:-.02em;color:var(--k-ink);font-variant-numeric:tabular-nums}@media(max-width:760px){:host .sk-d{white-space:normal}}:host(.sk-zero) .sk-tile__value{color:var(--k-muted);font-weight:var(--k-w-label)}.sk-tile__sub{font-size:.76rem;line-height:1.35;color:var(--k-muted)}.sk-tile__sub:empty,.sk-tile__trend:empty{display:none}.sk-tile__link{display:inline-flex;align-items:center;min-height:24px;font-weight:var(--k-w-label);color:var(--k-brand)}.sk-tile__link:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}@media(max-width:760px){.sk-tile__link{min-height:48px}}.sk-d{display:inline-block;max-width:100%;padding:.125rem .5rem;border-radius:999px;font-style:normal;font-size:.74rem;font-weight:var(--k-w-strong);line-height:1.45;white-space:nowrap;font-variant-numeric:tabular-nums;background:var(--k-badge);color:var(--k-muted)}.sk-d--up{background:var(--k-up-soft);color:var(--k-up)}.sk-d--down{background:var(--k-down-soft);color:var(--k-down)}svg.sk-spark{display:block!important;width:100%!important;height:22px!important;max-width:none!important;overflow:visible}.sk-spark path{fill:none;stroke:var(--k-c1);stroke-width:2;vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}.sk-spark--down path{stroke:var(--k-c3)}\n"]
		}]
	}],
	propDecorators: {
		label: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "label",
				required: true
			}]
		}],
		value: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "value",
				required: true
			}]
		}],
		change: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "change",
				required: false
			}]
		}],
		sub: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "sub",
				required: false
			}]
		}],
		spark: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "spark",
				required: false
			}]
		}],
		highlight: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "highlight",
				required: false
			}]
		}],
		link: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "link",
				required: false
			}]
		}]
	}
});
var SkTileGroups = class SkTileGroups {
	tiles = input.required(...ngDevMode ? [{ debugName: "tiles" }] : /* istanbul ignore next */ []);
	groups = computed(() => {
		const by = /* @__PURE__ */ new Map();
		for (const t of this.tiles()) by.set(t.group ?? "", [...by.get(t.group ?? "") ?? [], t]);
		return [...by].map(([title, tiles]) => ({
			title,
			tiles
		}));
	}, ...ngDevMode ? [{ debugName: "groups" }] : /* istanbul ignore next */ []);
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkTileGroups,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkTileGroups,
		isStandalone: true,
		selector: "sk-tile-groups",
		inputs: { tiles: {
			classPropertyName: "tiles",
			publicName: "tiles",
			isSignal: true,
			isRequired: true,
			transformFunction: null
		} },
		ngImport: i0,
		template: `
    @for (g of groups(); track g.title) {
      <section class="sk-tg" [style.--n]="g.tiles.length" [attr.aria-label]="g.title || null">
        @if (g.title) { <h2 class="sk-tg__title">{{ g.title }}</h2> }
        <div class="sk-tg__tiles">@for (k of g.tiles; track k.id ?? k.label) { <sk-tile [label]="k.label" [value]="k.value" [change]="k.change" [sub]="k.sub" [spark]="k.spark" [highlight]="!!k.highlight" [link]="k.link ?? null" /> }</div>
      </section>
    }
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:flex;flex-wrap:wrap;gap:var(--k-gap);min-width:0}.sk-tg{flex:var(--n) 1 calc(var(--n) * 11rem);min-width:0;max-width:100%;display:grid;align-content:start;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);overflow:hidden}.sk-tg__title{margin:0;padding:min(.75rem,12px) min(1rem,16px) 0;overflow-wrap:anywhere;font-size:.74rem;font-weight:var(--k-w-strong);letter-spacing:.08em;text-transform:uppercase;color:var(--k-muted)}.sk-tg__tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(11rem,100%),1fr));margin:.5rem -1px -1px 0;border-top:1px solid var(--k-line)}.sk-tg__tiles>sk-tile{box-shadow:inset -1px 0 0 var(--k-line),inset 0 -1px 0 var(--k-line)}@media(max-width:700px){.sk-tg{flex-basis:100%}.sk-tg__tiles{grid-template-columns:repeat(auto-fit,minmax(min(9rem,100%),1fr))}}\n"],
		dependencies: [{
			kind: "component",
			type: SkTile,
			selector: "sk-tile",
			inputs: [
				"label",
				"value",
				"change",
				"sub",
				"spark",
				"highlight",
				"link"
			]
		}],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkTileGroups,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-tile-groups",
			imports: [SkTile],
			changeDetection: ChangeDetectionStrategy.OnPush,
			template: `
    @for (g of groups(); track g.title) {
      <section class="sk-tg" [style.--n]="g.tiles.length" [attr.aria-label]="g.title || null">
        @if (g.title) { <h2 class="sk-tg__title">{{ g.title }}</h2> }
        <div class="sk-tg__tiles">@for (k of g.tiles; track k.id ?? k.label) { <sk-tile [label]="k.label" [value]="k.value" [change]="k.change" [sub]="k.sub" [spark]="k.spark" [highlight]="!!k.highlight" [link]="k.link ?? null" /> }</div>
      </section>
    }
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:flex;flex-wrap:wrap;gap:var(--k-gap);min-width:0}.sk-tg{flex:var(--n) 1 calc(var(--n) * 11rem);min-width:0;max-width:100%;display:grid;align-content:start;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);overflow:hidden}.sk-tg__title{margin:0;padding:min(.75rem,12px) min(1rem,16px) 0;overflow-wrap:anywhere;font-size:.74rem;font-weight:var(--k-w-strong);letter-spacing:.08em;text-transform:uppercase;color:var(--k-muted)}.sk-tg__tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(11rem,100%),1fr));margin:.5rem -1px -1px 0;border-top:1px solid var(--k-line)}.sk-tg__tiles>sk-tile{box-shadow:inset -1px 0 0 var(--k-line),inset 0 -1px 0 var(--k-line)}@media(max-width:700px){.sk-tg{flex-basis:100%}.sk-tg__tiles{grid-template-columns:repeat(auto-fit,minmax(min(9rem,100%),1fr))}}\n"]
		}]
	}],
	propDecorators: { tiles: [{
		type: i0.Input,
		args: [{
			isSignal: true,
			alias: "tiles",
			required: true
		}]
	}] }
});
function formatCell(texts, v, kind) {
	if (v === null || v === void 0 || v === "") return "—";
	if (typeof v === "string") return v;
	switch (kind) {
		case "pct": return formatPercent(texts, v);
		case "dur": return formatDuration(texts, v);
		case "pos": return formatNumber(texts, v, 1);
		case "dec": return formatNumber(texts, v, 2);
		default: return formatNumber(texts, v);
	}
}
var SkMetricTable = class SkMetricTable {
	doc = inject(DOCUMENT);
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	fallback = resolveTexts(injectOptions());
	T = computed(() => this.texts() ?? this.fallback, ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	fill = fill;
	title = input.required(...ngDevMode ? [{ debugName: "title" }] : /* istanbul ignore next */ []);
	sub = input("", ...ngDevMode ? [{ debugName: "sub" }] : /* istanbul ignore next */ []);
	head = input("", ...ngDevMode ? [{ debugName: "head" }] : /* istanbul ignore next */ []);
	rows = input.required(...ngDevMode ? [{ debugName: "rows" }] : /* istanbul ignore next */ []);
	cols = input.required(...ngDevMode ? [{ debugName: "cols" }] : /* istanbul ignore next */ []);
	limit = input(10, ...ngDevMode ? [{ debugName: "limit" }] : /* istanbul ignore next */ []);
	empty = input("", ...ngDevMode ? [{ debugName: "empty" }] : /* istanbul ignore next */ []);
	exportName = input("", ...ngDevMode ? [{ debugName: "exportName" }] : /* istanbul ignore next */ []);
	all = signal(false, ...ngDevMode ? [{ debugName: "all" }] : /* istanbul ignore next */ []);
	query = signal("", ...ngDevMode ? [{ debugName: "query" }] : /* istanbul ignore next */ []);
	sortKey = signal("", ...ngDevMode ? [{ debugName: "sortKey" }] : /* istanbul ignore next */ []);
	desc = signal(true, ...ngDevMode ? [{ debugName: "desc" }] : /* istanbul ignore next */ []);
	key = computed(() => this.sortKey() || this.cols()[0]?.key || "", ...ngDevMode ? [{ debugName: "key" }] : /* istanbul ignore next */ []);
	filtered = computed(() => {
		const q = this.query().trim().toLowerCase();
		const k = this.key();
		const rows = q ? this.rows().filter((r) => r.label.toLowerCase().includes(q) || (r.sub ?? "").toLowerCase().includes(q)) : this.rows();
		const dir = this.desc() ? -1 : 1;
		return [...rows].sort((a, b) => {
			const x = a.values[k], y = b.values[k];
			if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
			if (x === null || x === void 0) return 1;
			if (y === null || y === void 0) return -1;
			return String(x).localeCompare(String(y), this.T().locale) * dir;
		});
	}, ...ngDevMode ? [{ debugName: "filtered" }] : /* istanbul ignore next */ []);
	shown = computed(() => this.all() ? this.filtered() : this.filtered().slice(0, this.limit()), ...ngDevMode ? [{ debugName: "shown" }] : /* istanbul ignore next */ []);
	max = computed(() => Math.max(1, ...this.rows().map((r) => Number(r.values[this.cols()[0]?.key] ?? 0) || 0)), ...ngDevMode ? [{ debugName: "max" }] : /* istanbul ignore next */ []);
	sortBy(k) {
		if (this.key() === k) this.desc.update((d) => !d);
		else this.sortKey.set(k), this.desc.set(true);
	}
	bar(r) {
		const v = Number(r.values[this.cols()[0]?.key] ?? 0) || 0;
		return `${Math.round(v / this.max() * 100)}%`;
	}
	cell(r, c) {
		return formatCell(this.T(), r.values[c.key], c.kind ?? "int");
	}
	change(r, c) {
		if (!c.delta || !r.prev) return null;
		const now = r.values[c.key], before = r.prev[c.key];
		if (typeof now !== "number" || before === void 0 || before === null) return null;
		const T = this.T();
		const d = c.kind === "pos" ? gap(T, now, before, true) : c.kind === "pct" ? gap(T, now * 100, before * 100, !!c.lowerBetter, 1, "points") : delta(T, now, before, !!c.lowerBetter);
		return d.text ? d : null;
	}
	csvRows() {
		const cols = this.cols();
		return [[this.head() || this.title(), ...cols.map((c) => c.label)], ...this.filtered().map((r) => [r.label, ...cols.map((c) => r.values[c.key] ?? null)])];
	}
	csv() {
		download(this.doc, `${this.exportName() || fileName(this.title())}.csv`, toCsv(this.csvRows(), csvSeparator(this.T())));
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkMetricTable,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkMetricTable,
		isStandalone: true,
		selector: "sk-metric-table",
		inputs: {
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			title: {
				classPropertyName: "title",
				publicName: "title",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			sub: {
				classPropertyName: "sub",
				publicName: "sub",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			head: {
				classPropertyName: "head",
				publicName: "head",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			rows: {
				classPropertyName: "rows",
				publicName: "rows",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			cols: {
				classPropertyName: "cols",
				publicName: "cols",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			limit: {
				classPropertyName: "limit",
				publicName: "limit",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			empty: {
				classPropertyName: "empty",
				publicName: "empty",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			exportName: {
				classPropertyName: "exportName",
				publicName: "exportName",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: { properties: { "class.sk-wide": "cols().length >= 4" } },
		ngImport: i0,
		template: `
    <div class="sk-mt__head">
      <div class="sk-mt__titles"><h2>{{ title() }}</h2>@if (sub()) { <p class="sk-mt__sub">{{ sub() }}</p> }</div>
      <div class="sk-mt__tools sk-noprint">
        @if (rows().length > 12) { <input class="sk-mt__search" type="search" [placeholder]="fill(T().common.filter, { n: rows().length })" [attr.aria-label]="fill(T().common.filterOf, { title: title() })" (input)="query.set($any($event.target).value)" /> }
        @if (rows().length) { <button type="button" class="sk-mt__btn" (click)="csv()" [attr.aria-label]="fill(T().common.exportCsvOf, { title: title() })" [title]="fill(T().common.exportCsvOf, { title: title() })">{{ T().common.csv }}</button> }
      </div>
    </div>
    @if (rows().length) {
      <div class="sk-mt__wrap">
        <table class="sk-mt__table">
          <thead>
            <tr>
              <th scope="col">{{ head() }}</th>
              @for (c of cols(); track c.key) {
                <th scope="col" class="sk-num" [attr.aria-sort]="key() === c.key ? (desc() ? 'descending' : 'ascending') : null">
                  <button type="button" (click)="sortBy(c.key)" [title]="c.tip ?? T().common.sort">{{ c.label }}@if (key() === c.key) { <span aria-hidden="true">{{ desc() ? ' ▾' : ' ▴' }}</span> }</button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of shown(); track r.label + $index) {
              <tr>
                <th scope="row" class="sk-lab" [style.--w]="bar(r)">
                  <span class="sk-lab__txt" [title]="r.sub ? r.label + ' — ' + r.sub : r.label">@if (r.href) { <a [href]="r.href" target="_blank" rel="noopener">{{ r.label }}</a> } @else { {{ r.label }} }@if (r.sub) { <small>{{ r.sub }}</small> }</span>
                </th>
                @for (c of cols(); track c.key) {
                  <td class="sk-num">{{ cell(r, c) }}@if (change(r, c); as d) { <small [class]="'sk-d sk-d--' + d.tone">{{ d.text }}</small> }</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (filtered().length > limit()) {
        <button type="button" class="sk-mt__more sk-noprint" (click)="all.set(!all())" [attr.aria-expanded]="all()">{{ all() ? T().common.collapse : fill(T().common.showAll, { n: filtered().length }) }}</button>
      }
    } @else {
      <p class="sk-mt__empty">{{ empty() || T().common.noData }}</p>
    }
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0;padding:min(1rem,16px) min(1rem,16px) min(.75rem,12px);background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow)}.sk-mt__head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.5rem .75rem;margin-bottom:.75rem}.sk-mt__titles{flex:1 1 10rem;min-width:0}h2{margin:0;font-size:1rem;overflow-wrap:anywhere}.sk-mt__sub{margin:.2rem 0 0;font-size:.78rem;line-height:1.4;color:var(--k-muted);overflow-wrap:anywhere}.sk-mt__tools{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.5rem;align-items:center;flex:0 1 auto;min-width:0;max-width:100%}.sk-mt__search{width:9.5rem;max-width:100%;min-width:0;font:inherit;font-size:.8rem;min-height:32px;padding:.2rem .55rem;border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);background:var(--k-input);color:var(--k-ink)}.sk-mt__btn{font:inherit;font-size:.78rem;font-weight:var(--k-w-strong);letter-spacing:.03em;min-height:32px;padding:.2rem .6rem;border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);background:var(--k-card);color:var(--k-ink2);cursor:pointer}.sk-mt__btn:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-mt__wrap{overflow-x:auto}.sk-mt__table{width:100%;border-collapse:collapse;font-size:.875rem;font-variant-numeric:tabular-nums}.sk-mt__table th,.sk-mt__table td{padding:.42rem .55rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--k-line)}.sk-mt__table tr>:first-child{padding-left:0}.sk-mt__table tr>:last-child{padding-right:0}.sk-mt__table thead th{padding-block:.3rem;font-size:.76rem;font-weight:var(--k-w-strong);color:var(--k-muted);background:var(--k-card)}.sk-mt__table thead th:first-child{width:100%}.sk-mt__table thead button{all:unset;cursor:pointer}.sk-mt__table thead button:hover,.sk-mt__table thead button:focus-visible{color:var(--k-brand)}.sk-mt__table thead button:focus-visible,.sk-mt__more:focus-visible,.sk-mt__btn:focus-visible,.sk-mt__search:focus-visible,.sk-lab a:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px;border-radius:4px}.sk-num{text-align:right!important}.sk-mt__table tbody tr:last-child>*{border-bottom:0}.sk-mt__table tbody tr:hover>*{background:var(--k-hover)}.sk-lab{position:relative;max-width:0;min-width:min(8.5rem,40vw);white-space:normal!important;font-weight:var(--k-w-row);color:var(--k-ink);padding-bottom:.62rem!important}.sk-lab:before,.sk-lab:after{content:\"\";position:absolute;left:0;bottom:.32rem;height:4px;border-radius:2px}.sk-lab:before{right:0;background:var(--k-track)}.sk-lab:after{width:var(--w, 0%);background:var(--k-c1)}.sk-lab__txt{display:block;overflow-wrap:anywhere}.sk-lab small{margin-left:.4rem;color:var(--k-muted);font-weight:400;font-size:.76rem}.sk-lab a{color:inherit}.sk-d{font-style:normal;font-weight:var(--k-w-strong);margin-left:.4rem;font-size:.74rem}.sk-d--up{color:var(--k-up)}.sk-d--down{color:var(--k-down)}.sk-d--flat{color:var(--k-muted)}.sk-mt__more{all:unset;cursor:pointer;margin-top:.5rem;max-width:100%;overflow-wrap:anywhere;font-size:.875rem;color:var(--k-brand);font-weight:var(--k-w-control)}.sk-mt__more:hover{text-decoration:underline}.sk-mt__empty{margin:.3rem 0;font-size:.875rem;color:var(--k-muted)}@media(max-width:760px){.sk-mt__table thead button{display:inline-flex;align-items:center;justify-content:flex-end;min-width:48px;min-height:48px}.sk-mt__btn,.sk-mt__search{min-width:48px;min-height:48px}.sk-mt__more{display:inline-flex;align-items:center;min-height:48px}.sk-lab a{display:inline-flex;align-items:center;min-width:48px;min-height:48px}}@media print{:host{box-shadow:none;break-inside:avoid}.sk-lab:before,.sk-lab:after{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkMetricTable,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-metric-table",
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: { "[class.sk-wide]": "cols().length >= 4" },
			template: `
    <div class="sk-mt__head">
      <div class="sk-mt__titles"><h2>{{ title() }}</h2>@if (sub()) { <p class="sk-mt__sub">{{ sub() }}</p> }</div>
      <div class="sk-mt__tools sk-noprint">
        @if (rows().length > 12) { <input class="sk-mt__search" type="search" [placeholder]="fill(T().common.filter, { n: rows().length })" [attr.aria-label]="fill(T().common.filterOf, { title: title() })" (input)="query.set($any($event.target).value)" /> }
        @if (rows().length) { <button type="button" class="sk-mt__btn" (click)="csv()" [attr.aria-label]="fill(T().common.exportCsvOf, { title: title() })" [title]="fill(T().common.exportCsvOf, { title: title() })">{{ T().common.csv }}</button> }
      </div>
    </div>
    @if (rows().length) {
      <div class="sk-mt__wrap">
        <table class="sk-mt__table">
          <thead>
            <tr>
              <th scope="col">{{ head() }}</th>
              @for (c of cols(); track c.key) {
                <th scope="col" class="sk-num" [attr.aria-sort]="key() === c.key ? (desc() ? 'descending' : 'ascending') : null">
                  <button type="button" (click)="sortBy(c.key)" [title]="c.tip ?? T().common.sort">{{ c.label }}@if (key() === c.key) { <span aria-hidden="true">{{ desc() ? ' ▾' : ' ▴' }}</span> }</button>
                </th>
              }
            </tr>
          </thead>
          <tbody>
            @for (r of shown(); track r.label + $index) {
              <tr>
                <th scope="row" class="sk-lab" [style.--w]="bar(r)">
                  <span class="sk-lab__txt" [title]="r.sub ? r.label + ' — ' + r.sub : r.label">@if (r.href) { <a [href]="r.href" target="_blank" rel="noopener">{{ r.label }}</a> } @else { {{ r.label }} }@if (r.sub) { <small>{{ r.sub }}</small> }</span>
                </th>
                @for (c of cols(); track c.key) {
                  <td class="sk-num">{{ cell(r, c) }}@if (change(r, c); as d) { <small [class]="'sk-d sk-d--' + d.tone">{{ d.text }}</small> }</td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (filtered().length > limit()) {
        <button type="button" class="sk-mt__more sk-noprint" (click)="all.set(!all())" [attr.aria-expanded]="all()">{{ all() ? T().common.collapse : fill(T().common.showAll, { n: filtered().length }) }}</button>
      }
    } @else {
      <p class="sk-mt__empty">{{ empty() || T().common.noData }}</p>
    }
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0;padding:min(1rem,16px) min(1rem,16px) min(.75rem,12px);background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow)}.sk-mt__head{display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:space-between;gap:.5rem .75rem;margin-bottom:.75rem}.sk-mt__titles{flex:1 1 10rem;min-width:0}h2{margin:0;font-size:1rem;overflow-wrap:anywhere}.sk-mt__sub{margin:.2rem 0 0;font-size:.78rem;line-height:1.4;color:var(--k-muted);overflow-wrap:anywhere}.sk-mt__tools{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.5rem;align-items:center;flex:0 1 auto;min-width:0;max-width:100%}.sk-mt__search{width:9.5rem;max-width:100%;min-width:0;font:inherit;font-size:.8rem;min-height:32px;padding:.2rem .55rem;border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);background:var(--k-input);color:var(--k-ink)}.sk-mt__btn{font:inherit;font-size:.78rem;font-weight:var(--k-w-strong);letter-spacing:.03em;min-height:32px;padding:.2rem .6rem;border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);background:var(--k-card);color:var(--k-ink2);cursor:pointer}.sk-mt__btn:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-mt__wrap{overflow-x:auto}.sk-mt__table{width:100%;border-collapse:collapse;font-size:.875rem;font-variant-numeric:tabular-nums}.sk-mt__table th,.sk-mt__table td{padding:.42rem .55rem;text-align:left;white-space:nowrap;border-bottom:1px solid var(--k-line)}.sk-mt__table tr>:first-child{padding-left:0}.sk-mt__table tr>:last-child{padding-right:0}.sk-mt__table thead th{padding-block:.3rem;font-size:.76rem;font-weight:var(--k-w-strong);color:var(--k-muted);background:var(--k-card)}.sk-mt__table thead th:first-child{width:100%}.sk-mt__table thead button{all:unset;cursor:pointer}.sk-mt__table thead button:hover,.sk-mt__table thead button:focus-visible{color:var(--k-brand)}.sk-mt__table thead button:focus-visible,.sk-mt__more:focus-visible,.sk-mt__btn:focus-visible,.sk-mt__search:focus-visible,.sk-lab a:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px;border-radius:4px}.sk-num{text-align:right!important}.sk-mt__table tbody tr:last-child>*{border-bottom:0}.sk-mt__table tbody tr:hover>*{background:var(--k-hover)}.sk-lab{position:relative;max-width:0;min-width:min(8.5rem,40vw);white-space:normal!important;font-weight:var(--k-w-row);color:var(--k-ink);padding-bottom:.62rem!important}.sk-lab:before,.sk-lab:after{content:\"\";position:absolute;left:0;bottom:.32rem;height:4px;border-radius:2px}.sk-lab:before{right:0;background:var(--k-track)}.sk-lab:after{width:var(--w, 0%);background:var(--k-c1)}.sk-lab__txt{display:block;overflow-wrap:anywhere}.sk-lab small{margin-left:.4rem;color:var(--k-muted);font-weight:400;font-size:.76rem}.sk-lab a{color:inherit}.sk-d{font-style:normal;font-weight:var(--k-w-strong);margin-left:.4rem;font-size:.74rem}.sk-d--up{color:var(--k-up)}.sk-d--down{color:var(--k-down)}.sk-d--flat{color:var(--k-muted)}.sk-mt__more{all:unset;cursor:pointer;margin-top:.5rem;max-width:100%;overflow-wrap:anywhere;font-size:.875rem;color:var(--k-brand);font-weight:var(--k-w-control)}.sk-mt__more:hover{text-decoration:underline}.sk-mt__empty{margin:.3rem 0;font-size:.875rem;color:var(--k-muted)}@media(max-width:760px){.sk-mt__table thead button{display:inline-flex;align-items:center;justify-content:flex-end;min-width:48px;min-height:48px}.sk-mt__btn,.sk-mt__search{min-width:48px;min-height:48px}.sk-mt__more{display:inline-flex;align-items:center;min-height:48px}.sk-lab a{display:inline-flex;align-items:center;min-width:48px;min-height:48px}}@media print{:host{box-shadow:none;break-inside:avoid}.sk-lab:before,.sk-lab:after{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"]
		}]
	}],
	propDecorators: {
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		title: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "title",
				required: true
			}]
		}],
		sub: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "sub",
				required: false
			}]
		}],
		head: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "head",
				required: false
			}]
		}],
		rows: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "rows",
				required: true
			}]
		}],
		cols: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "cols",
				required: true
			}]
		}],
		limit: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "limit",
				required: false
			}]
		}],
		empty: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "empty",
				required: false
			}]
		}],
		exportName: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "exportName",
				required: false
			}]
		}]
	}
});
var SkTrendChart = class SkTrendChart {
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	fallback = resolveTexts(injectOptions());
	T = computed(() => this.texts() ?? this.fallback, ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	W = signal(640, ...ngDevMode ? [{ debugName: "W" }] : /* istanbul ignore next */ []);
	H = 220;
	L = 44;
	R = 6;
	TOP = 10;
	B = 22;
	plot = viewChild.required("plot", ...ngDevMode ? [{ debugName: "plot" }] : /* istanbul ignore next */ []);
	title = input.required(...ngDevMode ? [{ debugName: "title" }] : /* istanbul ignore next */ []);
	barLabel = input("", ...ngDevMode ? [{ debugName: "barLabel" }] : /* istanbul ignore next */ []);
	lineLabel = input("", ...ngDevMode ? [{ debugName: "lineLabel" }] : /* istanbul ignore next */ []);
	foot = input("", ...ngDevMode ? [{ debugName: "foot" }] : /* istanbul ignore next */ []);
	slots = input.required(...ngDevMode ? [{ debugName: "slots" }] : /* istanbul ignore next */ []);
	unit = input("day", ...ngDevMode ? [{ debugName: "unit" }] : /* istanbul ignore next */ []);
	bar = input.required(...ngDevMode ? [{ debugName: "bar" }] : /* istanbul ignore next */ []);
	line = input([], ...ngDevMode ? [{ debugName: "line" }] : /* istanbul ignore next */ []);
	prev = input([], ...ngDevMode ? [{ debugName: "prev" }] : /* istanbul ignore next */ []);
	constructor() {
		const destroy = inject(DestroyRef);
		afterNextRender(() => {
			if (typeof ResizeObserver === "undefined") return;
			const ro = new ResizeObserver(([e]) => this.W.set(Math.max(240, Math.round(e.contentRect.width))));
			ro.observe(this.plot().nativeElement);
			destroy.onDestroy(() => ro.disconnect());
		});
	}
	max = computed(() => Math.max(1, ...this.bar(), ...this.line(), ...this.prev()), ...ngDevMode ? [{ debugName: "max" }] : /* istanbul ignore next */ []);
	step = computed(() => niceStep(this.max()), ...ngDevMode ? [{ debugName: "step" }] : /* istanbul ignore next */ []);
	top = computed(() => this.step() * Math.ceil(this.max() / this.step()), ...ngDevMode ? [{ debugName: "top" }] : /* istanbul ignore next */ []);
	base = computed(() => this.H - this.B, ...ngDevMode ? [{ debugName: "base" }] : /* istanbul ignore next */ []);
	band = computed(() => (this.W() - this.L - this.R) / Math.max(1, this.slots().length), ...ngDevMode ? [{ debugName: "band" }] : /* istanbul ignore next */ []);
	x(i) {
		return this.L + this.band() * (i + .5);
	}
	y(v) {
		return this.base() - v / this.top() * (this.base() - this.TOP);
	}
	label(slot) {
		return slotLabel(this.T(), slot, this.unit(), true);
	}
	grid = computed(() => {
		const s = this.step();
		return Array.from({ length: Math.round(this.top() / s) + 1 }, (_, i) => ({
			v: i * s,
			y: Math.round(this.y(i * s)) + .5,
			label: formatNumber(this.T(), i * s)
		}));
	}, ...ngDevMode ? [{ debugName: "grid" }] : /* istanbul ignore next */ []);
	bars = computed(() => {
		const w = Math.max(2, Math.min(24, this.band() * .68));
		const r = Math.min(4, w / 2);
		const slots = this.slots();
		return this.bar().slice(0, slots.length).map((v, i) => {
			const h = Math.max(v ? 2 : 0, this.base() - this.y(v));
			return {
				i,
				x: this.x(i) - w / 2,
				w,
				h,
				r: h ? r : 0,
				top: this.base() - h,
				title: labelValue(this.T(), this.label(slots[i]), formatNumber(this.T(), v))
			};
		});
	}, ...ngDevMode ? [{ debugName: "bars" }] : /* istanbul ignore next */ []);
	path(values) {
		return values.slice(0, this.slots().length).map((v, i) => `${i ? "L" : "M"}${this.x(i).toFixed(1)} ${this.y(v).toFixed(1)}`).join(" ");
	}
	linePath = computed(() => this.line().length > 1 ? this.path(this.line()) : "", ...ngDevMode ? [{ debugName: "linePath" }] : /* istanbul ignore next */ []);
	prevPath = computed(() => this.prev().length > 1 ? this.path(this.prev()) : "", ...ngDevMode ? [{ debugName: "prevPath" }] : /* istanbul ignore next */ []);
	ticks = computed(() => {
		const slots = this.slots();
		if (!slots.length) return [];
		const n = Math.min(slots.length, Math.min(7, Math.max(2, Math.floor((this.W() - this.L) / 110))));
		return Array.from({ length: n }, (_, k) => {
			const i = n === 1 ? 0 : Math.round(k * (slots.length - 1) / (n - 1));
			return {
				i,
				x: this.x(i),
				label: slotLabel(this.T(), slots[i], this.unit()),
				anchor: k === 0 ? "start" : k === n - 1 ? "end" : "middle"
			};
		});
	}, ...ngDevMode ? [{ debugName: "ticks" }] : /* istanbul ignore next */ []);
	aria = computed(() => fill(this.T().stats.chartTotal, {
		title: this.title(),
		n: formatNumber(this.T(), this.bar().reduce((s, v) => s + v, 0))
	}), ...ngDevMode ? [{ debugName: "aria" }] : /* istanbul ignore next */ []);
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkTrendChart,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkTrendChart,
		isStandalone: true,
		selector: "sk-trend-chart",
		inputs: {
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			title: {
				classPropertyName: "title",
				publicName: "title",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			barLabel: {
				classPropertyName: "barLabel",
				publicName: "barLabel",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			lineLabel: {
				classPropertyName: "lineLabel",
				publicName: "lineLabel",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			foot: {
				classPropertyName: "foot",
				publicName: "foot",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			slots: {
				classPropertyName: "slots",
				publicName: "slots",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			unit: {
				classPropertyName: "unit",
				publicName: "unit",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			bar: {
				classPropertyName: "bar",
				publicName: "bar",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			line: {
				classPropertyName: "line",
				publicName: "line",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			prev: {
				classPropertyName: "prev",
				publicName: "prev",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		viewQueries: [{
			propertyName: "plot",
			first: true,
			predicate: ["plot"],
			descendants: true,
			isSignal: true
		}],
		ngImport: i0,
		template: `
    <div class="sk-tc__head">
      <h2>{{ title() }}</h2>
      <ul class="sk-tc__legend" [attr.aria-label]="T().common.legend">
        <li><b class="sk-k-bar"></b>{{ barLabel() }}</li>
        @if (line().length) { <li><b class="sk-k-line"></b>{{ lineLabel() }}</li> }
        @if (prev().length) { <li><b class="sk-k-dash"></b>{{ T().common.previousPeriod }}</li> }
      </ul>
    </div>
    <div class="sk-tc__plot" #plot>
      <svg class="sk-tc__svg" [attr.viewBox]="'0 0 ' + W() + ' ' + H" [attr.height]="H" role="img" [attr.aria-label]="aria()" focusable="false">
        @for (g of grid(); track g.v) { <line class="sk-grid" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="g.y" [attr.y2]="g.y" /><text class="sk-tick" [attr.x]="L - 8" [attr.y]="g.y + 4" text-anchor="end">{{ g.label }}</text> }
        @for (b of bars(); track b.i) { <rect class="sk-bar" [attr.x]="b.x" [attr.y]="b.top" [attr.width]="b.w" [attr.height]="b.h + b.r" [attr.rx]="b.r"><title>{{ b.title }}</title></rect> }
        <rect class="sk-cut" [attr.x]="L" [attr.y]="base() + 0.5" [attr.width]="W() - L - R" height="5" />
        <line class="sk-grid sk-grid--base" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="base()" [attr.y2]="base()" />
        @if (prevPath()) { <path class="sk-prev" [attr.d]="prevPath()" /> }
        @if (linePath()) { <path class="sk-line" [attr.d]="linePath()" /> }
        @for (t of ticks(); track t.i) { <text class="sk-tick" [attr.x]="t.x" [attr.y]="H - 4" [attr.text-anchor]="t.anchor">{{ t.label }}</text> }
      </svg>
    </div>
    <div class="sk-sr"><table>
      <caption>{{ title() }}</caption>
      <thead><tr><th scope="col">{{ T().periods.label }}</th><th scope="col">{{ barLabel() }}</th>@if (line().length) { <th scope="col">{{ lineLabel() }}</th> }@if (prev().length) { <th scope="col">{{ T().common.previousPeriod }}</th> }</tr></thead>
      <tbody>@for (s of slots(); track s; let i = $index) { <tr><th scope="row">{{ label(s) }}</th><td>{{ bar()[i] ?? 0 }}</td>@if (line().length) { <td>{{ line()[i] ?? 0 }}</td> }@if (prev().length) { <td>{{ prev()[i] ?? 0 }}</td> }</tr> }</tbody>
    </table></div>
    @if (foot()) { <p class="sk-tc__foot">{{ foot() }}</p> }
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{position:relative;display:flex;flex-direction:column;min-width:0;padding:min(1rem,16px) min(1rem,16px) min(.75rem,12px);background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow)}.sk-tc__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem 1rem}h2{margin:0;font-size:1rem;overflow-wrap:anywhere}.sk-tc__legend{display:flex;flex-wrap:wrap;gap:.25rem 1rem;margin:0;padding:0;list-style:none;font-size:.76rem;font-weight:var(--k-w-label);color:var(--k-ink2)}.sk-tc__legend li{display:inline-flex;align-items:center;min-width:0;overflow-wrap:anywhere}.sk-tc__legend b{flex:none}.sk-tc__legend b{display:inline-block;width:12px;height:10px;margin-right:6px;border-radius:3px 3px 0 0}.sk-k-bar{background:var(--k-c1)}.sk-k-line{width:16px!important;height:0!important;border-top:2px solid var(--k-c2);border-radius:0!important}.sk-k-dash{width:16px!important;height:0!important;border-top:2px dashed var(--k-c3);border-radius:0!important}.sk-tc__plot{flex:1;min-width:0;margin-top:.75rem}svg.sk-tc__svg{display:block!important;width:100%!important;height:auto!important;max-width:none!important;overflow:visible}.sk-grid{stroke:var(--k-line);stroke-width:1;shape-rendering:crispEdges}.sk-grid--base{stroke:var(--k-line2)}.sk-cut{fill:var(--k-card)}.sk-tick{font-size:11px;fill:var(--k-muted);font-variant-numeric:tabular-nums}rect.sk-bar{fill:var(--k-c1)}rect.sk-bar:hover{fill:var(--k-c1h)}path.sk-line{fill:none;stroke:var(--k-c2);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}path.sk-prev{fill:none;stroke:var(--k-c3);stroke-width:2;stroke-dasharray:5 4;stroke-linecap:round}.sk-tc__foot{margin:.5rem 0 0;font-size:.78rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}@media print{:host{box-shadow:none;break-inside:avoid}rect,path{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkTrendChart,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-trend-chart",
			changeDetection: ChangeDetectionStrategy.OnPush,
			template: `
    <div class="sk-tc__head">
      <h2>{{ title() }}</h2>
      <ul class="sk-tc__legend" [attr.aria-label]="T().common.legend">
        <li><b class="sk-k-bar"></b>{{ barLabel() }}</li>
        @if (line().length) { <li><b class="sk-k-line"></b>{{ lineLabel() }}</li> }
        @if (prev().length) { <li><b class="sk-k-dash"></b>{{ T().common.previousPeriod }}</li> }
      </ul>
    </div>
    <div class="sk-tc__plot" #plot>
      <svg class="sk-tc__svg" [attr.viewBox]="'0 0 ' + W() + ' ' + H" [attr.height]="H" role="img" [attr.aria-label]="aria()" focusable="false">
        @for (g of grid(); track g.v) { <line class="sk-grid" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="g.y" [attr.y2]="g.y" /><text class="sk-tick" [attr.x]="L - 8" [attr.y]="g.y + 4" text-anchor="end">{{ g.label }}</text> }
        @for (b of bars(); track b.i) { <rect class="sk-bar" [attr.x]="b.x" [attr.y]="b.top" [attr.width]="b.w" [attr.height]="b.h + b.r" [attr.rx]="b.r"><title>{{ b.title }}</title></rect> }
        <rect class="sk-cut" [attr.x]="L" [attr.y]="base() + 0.5" [attr.width]="W() - L - R" height="5" />
        <line class="sk-grid sk-grid--base" [attr.x1]="L" [attr.x2]="W() - R" [attr.y1]="base()" [attr.y2]="base()" />
        @if (prevPath()) { <path class="sk-prev" [attr.d]="prevPath()" /> }
        @if (linePath()) { <path class="sk-line" [attr.d]="linePath()" /> }
        @for (t of ticks(); track t.i) { <text class="sk-tick" [attr.x]="t.x" [attr.y]="H - 4" [attr.text-anchor]="t.anchor">{{ t.label }}</text> }
      </svg>
    </div>
    <div class="sk-sr"><table>
      <caption>{{ title() }}</caption>
      <thead><tr><th scope="col">{{ T().periods.label }}</th><th scope="col">{{ barLabel() }}</th>@if (line().length) { <th scope="col">{{ lineLabel() }}</th> }@if (prev().length) { <th scope="col">{{ T().common.previousPeriod }}</th> }</tr></thead>
      <tbody>@for (s of slots(); track s; let i = $index) { <tr><th scope="row">{{ label(s) }}</th><td>{{ bar()[i] ?? 0 }}</td>@if (line().length) { <td>{{ line()[i] ?? 0 }}</td> }@if (prev().length) { <td>{{ prev()[i] ?? 0 }}</td> }</tr> }</tbody>
    </table></div>
    @if (foot()) { <p class="sk-tc__foot">{{ foot() }}</p> }
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{position:relative;display:flex;flex-direction:column;min-width:0;padding:min(1rem,16px) min(1rem,16px) min(.75rem,12px);background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow)}.sk-tc__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.25rem 1rem}h2{margin:0;font-size:1rem;overflow-wrap:anywhere}.sk-tc__legend{display:flex;flex-wrap:wrap;gap:.25rem 1rem;margin:0;padding:0;list-style:none;font-size:.76rem;font-weight:var(--k-w-label);color:var(--k-ink2)}.sk-tc__legend li{display:inline-flex;align-items:center;min-width:0;overflow-wrap:anywhere}.sk-tc__legend b{flex:none}.sk-tc__legend b{display:inline-block;width:12px;height:10px;margin-right:6px;border-radius:3px 3px 0 0}.sk-k-bar{background:var(--k-c1)}.sk-k-line{width:16px!important;height:0!important;border-top:2px solid var(--k-c2);border-radius:0!important}.sk-k-dash{width:16px!important;height:0!important;border-top:2px dashed var(--k-c3);border-radius:0!important}.sk-tc__plot{flex:1;min-width:0;margin-top:.75rem}svg.sk-tc__svg{display:block!important;width:100%!important;height:auto!important;max-width:none!important;overflow:visible}.sk-grid{stroke:var(--k-line);stroke-width:1;shape-rendering:crispEdges}.sk-grid--base{stroke:var(--k-line2)}.sk-cut{fill:var(--k-card)}.sk-tick{font-size:11px;fill:var(--k-muted);font-variant-numeric:tabular-nums}rect.sk-bar{fill:var(--k-c1)}rect.sk-bar:hover{fill:var(--k-c1h)}path.sk-line{fill:none;stroke:var(--k-c2);stroke-width:2;stroke-linejoin:round;stroke-linecap:round}path.sk-prev{fill:none;stroke:var(--k-c3);stroke-width:2;stroke-dasharray:5 4;stroke-linecap:round}.sk-tc__foot{margin:.5rem 0 0;font-size:.78rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}@media print{:host{box-shadow:none;break-inside:avoid}rect,path{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"]
		}]
	}],
	ctorParameters: () => [],
	propDecorators: {
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		plot: [{
			type: i0.ViewChild,
			args: ["plot", { isSignal: true }]
		}],
		title: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "title",
				required: true
			}]
		}],
		barLabel: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "barLabel",
				required: false
			}]
		}],
		lineLabel: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "lineLabel",
				required: false
			}]
		}],
		foot: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "foot",
				required: false
			}]
		}],
		slots: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "slots",
				required: true
			}]
		}],
		unit: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "unit",
				required: false
			}]
		}],
		bar: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "bar",
				required: true
			}]
		}],
		line: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "line",
				required: false
			}]
		}],
		prev: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "prev",
				required: false
			}]
		}]
	}
});
var SkHeatmap = class SkHeatmap {
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	fallback = resolveTexts(injectOptions());
	T = computed(() => this.texts() ?? this.fallback, ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	grid = input.required(...ngDevMode ? [{ debugName: "grid" }] : /* istanbul ignore next */ []);
	summary = input("", ...ngDevMode ? [{ debugName: "summary" }] : /* istanbul ignore next */ []);
	hours = computed(() => Array.from({ length: 24 }, (_, hour) => ({
		hour,
		label: hour % 3 === 0 ? formatNumber(this.T(), hour) : ""
	})), ...ngDevMode ? [{ debugName: "hours" }] : /* istanbul ignore next */ []);
	rows = computed(() => {
		const grid = this.grid();
		const max = Math.max(1, ...grid.flat());
		const T = this.T();
		return grid.map((row, d) => ({
			day: weekdayName(T, d, "short"),
			cells: row.map((y, hour) => ({
				hour,
				opacity: y ? .15 + y / max * .85 : .06,
				title: fill(T.stats.heatCell, {
					day: weekdayName(T, d),
					hour: hourName(T, hour),
					n: formatNumber(T, y)
				})
			}))
		}));
	}, ...ngDevMode ? [{ debugName: "rows" }] : /* istanbul ignore next */ []);
	aria = computed(() => `${this.T().stats.heatTitle} ${this.summary()}`.trim(), ...ngDevMode ? [{ debugName: "aria" }] : /* istanbul ignore next */ []);
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkHeatmap,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkHeatmap,
		isStandalone: true,
		selector: "sk-heatmap",
		inputs: {
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			grid: {
				classPropertyName: "grid",
				publicName: "grid",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			summary: {
				classPropertyName: "summary",
				publicName: "summary",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		ngImport: i0,
		template: `
    <div class="sk-heat" role="img" [attr.aria-label]="aria()">
      <span></span>
      @for (h of hours(); track h.hour) { <span class="sk-heat__hr" [class.sk-heat__hr--minor]="h.hour % 6 !== 0" aria-hidden="true">{{ h.label }}</span> }
      @for (row of rows(); track row.day) {
        <span class="sk-heat__day" aria-hidden="true">{{ row.day }}</span>
        @for (c of row.cells; track c.hour) { <span class="sk-heat__cell" [style.opacity]="c.opacity" [title]="c.title"></span> }
      }
    </div>
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0;container-type:inline-size}.sk-heat{display:grid;grid-template-columns:auto repeat(24,minmax(0,1fr));gap:2px;font-size:.72rem;color:var(--k-muted)}.sk-heat__cell{aspect-ratio:1.3;border-radius:3px;background:var(--k-c1);min-height:8px}.sk-heat__day{align-self:center;padding-right:6px}.sk-heat__hr{text-align:center;white-space:nowrap}@container (max-width: 15rem){.sk-heat__hr--minor{visibility:hidden}}@media print{.sk-heat__cell{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkHeatmap,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-heatmap",
			changeDetection: ChangeDetectionStrategy.OnPush,
			template: `
    <div class="sk-heat" role="img" [attr.aria-label]="aria()">
      <span></span>
      @for (h of hours(); track h.hour) { <span class="sk-heat__hr" [class.sk-heat__hr--minor]="h.hour % 6 !== 0" aria-hidden="true">{{ h.label }}</span> }
      @for (row of rows(); track row.day) {
        <span class="sk-heat__day" aria-hidden="true">{{ row.day }}</span>
        @for (c of row.cells; track c.hour) { <span class="sk-heat__cell" [style.opacity]="c.opacity" [title]="c.title"></span> }
      }
    </div>
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0;container-type:inline-size}.sk-heat{display:grid;grid-template-columns:auto repeat(24,minmax(0,1fr));gap:2px;font-size:.72rem;color:var(--k-muted)}.sk-heat__cell{aspect-ratio:1.3;border-radius:3px;background:var(--k-c1);min-height:8px}.sk-heat__day{align-self:center;padding-right:6px}.sk-heat__hr{text-align:center;white-space:nowrap}@container (max-width: 15rem){.sk-heat__hr--minor{visibility:hidden}}@media print{.sk-heat__cell{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"]
		}]
	}],
	propDecorators: {
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		grid: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "grid",
				required: true
			}]
		}],
		summary: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "summary",
				required: false
			}]
		}]
	}
});
const list = (locale, items) => typeof Intl.ListFormat === "function" ? new Intl.ListFormat(locale, { type: "unit" }).format(items) : items.join(", ");
const WIDTH = 1e3;
const HEIGHT = Math.round(WIDTH * MAP_RATIO);
var SkWorldMap = class SkWorldMap {
	api = inject(StatsKitApi);
	options = injectOptions();
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	fallback = resolveTexts(this.options);
	T = computed(() => this.texts() ?? this.fallback, ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	countries = input.required(...ngDevMode ? [{ debugName: "countries" }] : /* istanbul ignore next */ []);
	worldUrl = input(null, ...ngDevMode ? [{ debugName: "worldUrl" }] : /* istanbul ignore next */ []);
	apiUrl = input(null, ...ngDevMode ? [{ debugName: "apiUrl" }] : /* istanbul ignore next */ []);
	label = input((code) => countryName(this.T(), code), ...ngDevMode ? [{ debugName: "label" }] : /* istanbul ignore next */ []);
	low = input(null, ...ngDevMode ? [{ debugName: "low" }] : /* istanbul ignore next */ []);
	high = input(null, ...ngDevMode ? [{ debugName: "high" }] : /* istanbul ignore next */ []);
	world = signal(null, ...ngDevMode ? [{ debugName: "world" }] : /* istanbul ignore next */ []);
	hover = signal(null, ...ngDevMode ? [{ debugName: "hover" }] : /* istanbul ignore next */ []);
	zoom = signal(1, ...ngDevMode ? [{ debugName: "zoom" }] : /* istanbul ignore next */ []);
	center = signal([WIDTH / 2, HEIGHT / 2], ...ngDevMode ? [{ debugName: "center" }] : /* istanbul ignore next */ []);
	drag = null;
	constructor() {
		effect(() => {
			const url = worldAddress(this.options, this.apiUrl(), this.worldUrl());
			this.api.world(url).then((w) => this.world.set(w), () => this.world.set({ features: [] }));
		});
	}
	counts = computed(() => {
		const m = /* @__PURE__ */ new Map();
		for (const c of this.countries()) m.set(c.key.toUpperCase(), (m.get(c.key.toUpperCase()) ?? 0) + c.value);
		return m;
	}, ...ngDevMode ? [{ debugName: "counts" }] : /* istanbul ignore next */ []);
	max = computed(() => Math.max(1, ...this.counts().values()), ...ngDevMode ? [{ debugName: "max" }] : /* istanbul ignore next */ []);
	paths = computed(() => (this.world()?.features ?? []).map((f) => ({
		iso: f.properties.iso2,
		d: featurePath(f, WIDTH)
	})), ...ngDevMode ? [{ debugName: "paths" }] : /* istanbul ignore next */ []);
	shapes = computed(() => this.paths().map((p) => ({
		...p,
		n: this.counts().get(p.iso) ?? 0
	})), ...ngDevMode ? [{ debugName: "shapes" }] : /* istanbul ignore next */ []);
	bubbles = computed(() => [...this.counts()].flatMap(([iso, n]) => {
		const c = CENTROIDS[iso];
		if (!c || !n) return [];
		const [x, y] = project(c[1], c[0], WIDTH);
		return [{
			iso,
			n,
			x,
			y,
			r: 2.5 + 5 * (n / this.max())
		}];
	}), ...ngDevMode ? [{ debugName: "bubbles" }] : /* istanbul ignore next */ []);
	viewBox = computed(() => {
		const z = this.zoom(), [cx, cy] = this.center();
		const w = WIDTH / z, h = HEIGHT / z;
		return `${(cx - w / 2).toFixed(1)} ${(cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`;
	}, ...ngDevMode ? [{ debugName: "viewBox" }] : /* istanbul ignore next */ []);
	summary = computed(() => {
		const top = [...this.counts()].sort((a, b) => b[1] - a[1]).slice(0, 5);
		return fill(this.T().stats.mapSummary, {
			title: this.T().stats.mapTitle,
			list: list(this.T().locale, top.map(([iso, n]) => this.country(iso, n)))
		});
	}, ...ngDevMode ? [{ debugName: "summary" }] : /* istanbul ignore next */ []);
	format(n) {
		return fill(this.T().stats.mapLegend, { n: formatNumber(this.T(), n) });
	}
	country(iso, n) {
		return fill(this.T().stats.mapCountry, {
			country: this.label()(iso),
			n: this.format(n)
		});
	}
	color(n) {
		const t = intensity(n, this.max());
		const lo = this.low(), hi = this.high();
		if (lo && hi) return mixHex(lo, hi, t);
		return `color-mix(in srgb, var(--k-map-hi) ${Math.round(t * 100)}%, var(--k-map-lo))`;
	}
	clamp([x, y], z) {
		const w = WIDTH / z / 2, h = HEIGHT / z / 2;
		return [Math.min(WIDTH - w, Math.max(w, x)), Math.min(HEIGHT - h, Math.max(h, y))];
	}
	zoomBy(f) {
		const z = Math.min(8, Math.max(1, this.zoom() * f));
		this.zoom.set(z);
		this.center.set(this.clamp(this.center(), z));
	}
	reset() {
		this.zoom.set(1);
		this.center.set([WIDTH / 2, HEIGHT / 2]);
	}
	down(e) {
		if (this.zoom() === 1) return;
		const el = e.currentTarget;
		this.drag = {
			x: e.clientX,
			y: e.clientY,
			c: this.center(),
			w: el.getBoundingClientRect().width || WIDTH
		};
		el.setPointerCapture?.(e.pointerId);
	}
	move(e) {
		if (!this.drag) return;
		const k = WIDTH / this.zoom() / this.drag.w;
		this.center.set(this.clamp([this.drag.c[0] - (e.clientX - this.drag.x) * k, this.drag.c[1] - (e.clientY - this.drag.y) * k], this.zoom()));
	}
	up(e) {
		this.drag = null;
		e.currentTarget.releasePointerCapture?.(e.pointerId);
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkWorldMap,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkWorldMap,
		isStandalone: true,
		selector: "sk-world-map",
		inputs: {
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			countries: {
				classPropertyName: "countries",
				publicName: "countries",
				isSignal: true,
				isRequired: true,
				transformFunction: null
			},
			worldUrl: {
				classPropertyName: "worldUrl",
				publicName: "worldUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			apiUrl: {
				classPropertyName: "apiUrl",
				publicName: "apiUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			label: {
				classPropertyName: "label",
				publicName: "label",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			low: {
				classPropertyName: "low",
				publicName: "low",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			high: {
				classPropertyName: "high",
				publicName: "high",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: {
			attributes: { "role": "group" },
			properties: { "attr.aria-label": "T().stats.mapAria" }
		},
		ngImport: i0,
		template: `
    <div class="sk-map__frame" (pointerleave)="hover.set(null)">
      <svg class="sk-map__svg" [attr.viewBox]="viewBox()" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="summary()" focusable="false"
        (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up($event)" (pointercancel)="up($event)">
        <rect class="sk-map__sea" x="-2000" y="-2000" width="5000" height="5000" />
        @for (s of shapes(); track s.iso + $index) {
          <path class="sk-map__land" [attr.d]="s.d" [style.fill]="s.n ? color(s.n) : null" [class.sk-map__on]="s.n > 0" (pointerenter)="s.n && hover.set({ iso: s.iso, n: s.n })" />
        }
        @for (b of bubbles(); track b.iso) {
          <circle class="sk-map__dot" [attr.cx]="b.x" [attr.cy]="b.y" [attr.r]="b.r / zoom()" [style.stroke-width]="1.5 / zoom()" (pointerenter)="hover.set({ iso: b.iso, n: b.n })" />
        }
      </svg>
      @if (hover(); as h) { <div class="sk-map__tip" role="status">{{ country(h.iso, h.n) }}</div> }
      <div class="sk-map__zoom sk-noprint">
        <button type="button" (click)="zoomBy(1.6)" [attr.aria-label]="T().common.zoomIn" [title]="T().common.zoomIn">+</button>
        <button type="button" (click)="zoomBy(1 / 1.6)" [attr.aria-label]="T().common.zoomOut" [title]="T().common.zoomOut">−</button>
        <button type="button" (click)="reset()" [attr.aria-label]="T().common.zoomReset" [title]="T().common.zoomReset">⟲</button>
      </div>
    </div>
  `,
		isInline: true,
		styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0}.sk-map__frame{position:relative;overflow:hidden;border-radius:calc(var(--k-radius) - 4px);background:var(--k-map-sea);aspect-ratio:1000 / 394;touch-action:none}svg.sk-map__svg{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;cursor:grab;-webkit-user-select:none;user-select:none}svg.sk-map__svg:active{cursor:grabbing}.sk-map__sea{fill:var(--k-map-sea)}.sk-map__land{fill:var(--k-map-land);stroke:var(--k-map-border);stroke-width:.5;vector-effect:non-scaling-stroke}.sk-map__on:hover{stroke:var(--k-ink);stroke-width:1.2}.sk-map__dot{fill:var(--k-map-hi);stroke:var(--k-card)}.sk-map__tip{position:absolute;left:.5rem;top:.5rem;max-width:calc(100% - 1rem);overflow-wrap:anywhere;padding:.25rem .55rem;font-size:.8rem;font-weight:var(--k-w-label);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line);border-radius:6px;box-shadow:var(--k-shadow);pointer-events:none}.sk-map__zoom{position:absolute;right:.5rem;bottom:.5rem;display:grid;gap:.5rem}.sk-map__zoom button{min-width:max(32px,2em);height:max(32px,2em);padding:0 .5rem;font:inherit;font-size:1rem;font-weight:var(--k-w-strong);line-height:1;color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);cursor:pointer}.sk-map__zoom button:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-map__zoom button:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}@media(max-width:760px){.sk-map__zoom{grid-auto-flow:column;grid-auto-columns:1fr}.sk-map__zoom button{min-width:max(48px,2em);height:max(48px,2em)}}@media print{.sk-map__land,.sk-map__dot{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkWorldMap,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-world-map",
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: {
				role: "group",
				"[attr.aria-label]": "T().stats.mapAria"
			},
			template: `
    <div class="sk-map__frame" (pointerleave)="hover.set(null)">
      <svg class="sk-map__svg" [attr.viewBox]="viewBox()" preserveAspectRatio="xMidYMid meet" role="img" [attr.aria-label]="summary()" focusable="false"
        (pointerdown)="down($event)" (pointermove)="move($event)" (pointerup)="up($event)" (pointercancel)="up($event)">
        <rect class="sk-map__sea" x="-2000" y="-2000" width="5000" height="5000" />
        @for (s of shapes(); track s.iso + $index) {
          <path class="sk-map__land" [attr.d]="s.d" [style.fill]="s.n ? color(s.n) : null" [class.sk-map__on]="s.n > 0" (pointerenter)="s.n && hover.set({ iso: s.iso, n: s.n })" />
        }
        @for (b of bubbles(); track b.iso) {
          <circle class="sk-map__dot" [attr.cx]="b.x" [attr.cy]="b.y" [attr.r]="b.r / zoom()" [style.stroke-width]="1.5 / zoom()" (pointerenter)="hover.set({ iso: b.iso, n: b.n })" />
        }
      </svg>
      @if (hover(); as h) { <div class="sk-map__tip" role="status">{{ country(h.iso, h.n) }}</div> }
      <div class="sk-map__zoom sk-noprint">
        <button type="button" (click)="zoomBy(1.6)" [attr.aria-label]="T().common.zoomIn" [title]="T().common.zoomIn">+</button>
        <button type="button" (click)="zoomBy(1 / 1.6)" [attr.aria-label]="T().common.zoomOut" [title]="T().common.zoomOut">−</button>
        <button type="button" (click)="reset()" [attr.aria-label]="T().common.zoomReset" [title]="T().common.zoomReset">⟲</button>
      </div>
    </div>
  `,
			styles: [":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n", ":host{display:block;min-width:0}.sk-map__frame{position:relative;overflow:hidden;border-radius:calc(var(--k-radius) - 4px);background:var(--k-map-sea);aspect-ratio:1000 / 394;touch-action:none}svg.sk-map__svg{display:block!important;width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;cursor:grab;-webkit-user-select:none;user-select:none}svg.sk-map__svg:active{cursor:grabbing}.sk-map__sea{fill:var(--k-map-sea)}.sk-map__land{fill:var(--k-map-land);stroke:var(--k-map-border);stroke-width:.5;vector-effect:non-scaling-stroke}.sk-map__on:hover{stroke:var(--k-ink);stroke-width:1.2}.sk-map__dot{fill:var(--k-map-hi);stroke:var(--k-card)}.sk-map__tip{position:absolute;left:.5rem;top:.5rem;max-width:calc(100% - 1rem);overflow-wrap:anywhere;padding:.25rem .55rem;font-size:.8rem;font-weight:var(--k-w-label);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line);border-radius:6px;box-shadow:var(--k-shadow);pointer-events:none}.sk-map__zoom{position:absolute;right:.5rem;bottom:.5rem;display:grid;gap:.5rem}.sk-map__zoom button{min-width:max(32px,2em);height:max(32px,2em);padding:0 .5rem;font:inherit;font-size:1rem;font-weight:var(--k-w-strong);line-height:1;color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 6px);cursor:pointer}.sk-map__zoom button:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-map__zoom button:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}@media(max-width:760px){.sk-map__zoom{grid-auto-flow:column;grid-auto-columns:1fr}.sk-map__zoom button{min-width:max(48px,2em);height:max(48px,2em)}}@media print{.sk-map__land,.sk-map__dot{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"]
		}]
	}],
	ctorParameters: () => [],
	propDecorators: {
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		countries: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "countries",
				required: true
			}]
		}],
		worldUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "worldUrl",
				required: false
			}]
		}],
		apiUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "apiUrl",
				required: false
			}]
		}],
		label: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "label",
				required: false
			}]
		}],
		low: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "low",
				required: false
			}]
		}],
		high: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "high",
				required: false
			}]
		}]
	}
});
const today = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
var SkStatistics = class SkStatistics {
	api = inject(StatsKitApi);
	doc = inject(DOCUMENT);
	options = injectOptions();
	apiUrl = input(null, ...ngDevMode ? [{ debugName: "apiUrl" }] : /* istanbul ignore next */ []);
	locale = input(null, ...ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []);
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	presets = input([
		1,
		7,
		30,
		90
	], ...ngDevMode ? [{ debugName: "presets" }] : /* istanbul ignore next */ []);
	initialDays = input(30, ...ngDevMode ? [{ debugName: "initialDays" }] : /* istanbul ignore next */ []);
	report = input(true, ...ngDevMode ? [{ debugName: "report" }] : /* istanbul ignore next */ []);
	theme = input("auto", ...ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []);
	liveMs = input(3e4, ...ngDevMode ? [{ debugName: "liveMs" }] : /* istanbul ignore next */ []);
	refreshMs = input(12e4, ...ngDevMode ? [{ debugName: "refreshMs" }] : /* istanbul ignore next */ []);
	worldUrl = input(null, ...ngDevMode ? [{ debugName: "worldUrl" }] : /* istanbul ignore next */ []);
	heading = input(null, ...ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []);
	mode = resolvedMode(this.theme);
	T = computed(() => resolveTexts(this.options, this.locale(), this.texts()), ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	fill = fill;
	plural = plural;
	today = today();
	base = computed(() => this.apiUrl() || this.options.apiUrl, ...ngDevMode ? [{ debugName: "base" }] : /* istanbul ignore next */ []);
	level = computed(() => this.heading() ?? this.options.heading ?? "h1", ...ngDevMode ? [{ debugName: "level" }] : /* istanbul ignore next */ []);
	days = signal(30, ...ngDevMode ? [{ debugName: "days" }] : /* istanbul ignore next */ []);
	custom = signal(false, ...ngDevMode ? [{ debugName: "custom" }] : /* istanbul ignore next */ []);
	from = signal("", ...ngDevMode ? [{ debugName: "from" }] : /* istanbul ignore next */ []);
	to = signal(today(), ...ngDevMode ? [{ debugName: "to" }] : /* istanbul ignore next */ []);
	loading = signal(true, ...ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []);
	failed = signal(false, ...ngDevMode ? [{ debugName: "failed" }] : /* istanbul ignore next */ []);
	data = signal(null, ...ngDevMode ? [{ debugName: "data" }] : /* istanbul ignore next */ []);
	active = signal(null, ...ngDevMode ? [{ debugName: "active" }] : /* istanbul ignore next */ []);
	stale = signal(false, ...ngDevMode ? [{ debugName: "stale" }] : /* istanbul ignore next */ []);
	auto = signal(true, ...ngDevMode ? [{ debugName: "auto" }] : /* istanbul ignore next */ []);
	now = signal(Date.now(), ...ngDevMode ? [{ debugName: "now" }] : /* istanbul ignore next */ []);
	reporting = signal(false, ...ngDevMode ? [{ debugName: "reporting" }] : /* istanbul ignore next */ []);
	message = signal(null, ...ngDevMode ? [{ debugName: "message" }] : /* istanbul ignore next */ []);
	destroy = inject(DestroyRef);
	browser = isPlatformBrowser(inject(PLATFORM_ID));
	constructor() {
		loadOnSource(this.base, (first) => {
			if (first) this.days.set(this.initialDays());
			else this.data.set(null), this.active.set(null), this.message.set(null);
			this.run();
		});
	}
	ngOnInit() {
		if (!this.browser) return;
		const timers = [];
		if (this.liveMs() > 0) timers.push(setInterval(() => {
			this.now.set(Date.now());
			if (this.canRefresh()) this.refreshLive();
		}, this.liveMs()));
		if (this.refreshMs() > 0) timers.push(setInterval(() => {
			if (this.canRefresh()) this.fetch(true);
		}, this.refreshMs()));
		const visible = () => {
			if (this.canRefresh()) this.refreshLive();
		};
		this.doc.addEventListener("visibilitychange", visible);
		this.destroy.onDestroy(() => (timers.forEach(clearInterval), this.doc.removeEventListener("visibilitychange", visible)));
	}
	canRefresh() {
		return this.auto() && !this.doc.hidden && !!this.data() && this.data().status === "ok";
	}
	ok = computed(() => this.data()?.status === "ok", ...ngDevMode ? [{ debugName: "ok" }] : /* istanbul ignore next */ []);
	fmt(v, d = 0) {
		return formatNumber(this.T(), v, d);
	}
	colon(label) {
		return labelValue(this.T(), label, "").trim();
	}
	sum(v) {
		return v.reduce((a, b) => a + b, 0);
	}
	updated = computed(() => {
		const at = Date.parse(this.data()?.generatedAt ?? "") || this.now();
		const min = Math.floor(Math.max(0, this.now() - at) / 6e4);
		return min < 1 ? this.T().stats.updatedNow : fill(this.T().stats.updatedAgo, { n: min });
	}, ...ngDevMode ? [{ debugName: "updated" }] : /* istanbul ignore next */ []);
	range = computed(() => this.data() ? rangeText(this.T(), this.data().range) : "", ...ngDevMode ? [{ debugName: "range" }] : /* istanbul ignore next */ []);
	bestDay = computed(() => {
		const s = this.data()?.series;
		if (!s?.pageviews.length) return "";
		const i = s.pageviews.reduce((b, v, k) => v > s.pageviews[b] ? k : b, 0);
		if (!s.pageviews[i]) return "";
		const label = s.unit === "day" ? longDay(this.T(), s.slots[i]) : slotLabel(this.T(), s.slots[i], "hour");
		return fill(this.T().stats.bestDay, {
			d: label,
			n: this.fmt(s.pageviews[i])
		});
	}, ...ngDevMode ? [{ debugName: "bestDay" }] : /* istanbul ignore next */ []);
	slotText = computed(() => {
		const b = bestSlot(this.data()?.heatmap);
		return b ? fill(this.T().stats.bestSlot, {
			day: weekdayName(this.T(), b.day),
			hour: hourName(this.T(), b.hour)
		}) : this.T().stats.notEnough;
	}, ...ngDevMode ? [{ debugName: "slotText" }] : /* istanbul ignore next */ []);
	mapMax = computed(() => Math.max(0, ...(this.data()?.breakdowns.countries ?? []).map((c) => c.value)), ...ngDevMode ? [{ debugName: "mapMax" }] : /* istanbul ignore next */ []);
	tiles = computed(() => {
		const d = this.data();
		if (!d) return [];
		const T = this.T(), S = T.stats;
		const out = [];
		if (d.status === "ok") {
			const s = d.totals, p = d.previous;
			const days = Math.max(1, d.range.days);
			const ratio = (t, a, b) => t && t[b] ? t[a] / t[b] : 0;
			const spark = (v) => sparkPath(v);
			const A = S.groupAudience, E = S.groupEngagement;
			out.push({
				id: "visitors",
				group: A,
				label: S.visitors,
				value: this.fmt(s.visitors),
				change: p ? delta(T, s.visitors, p.visitors) : null,
				sub: fill(T.common.perDay, { n: this.fmt(s.visitors / days, 1) }),
				spark: spark(d.series.visitors)
			}, {
				id: "visits",
				group: A,
				label: S.visits,
				value: this.fmt(s.visits),
				change: p ? delta(T, s.visits, p.visits) : null,
				sub: s.visitors ? fill(S.perVisitor, { n: this.fmt(s.visits / s.visitors, 2) }) : "",
				spark: ""
			}, {
				id: "pageviews",
				group: A,
				label: S.pageviews,
				value: this.fmt(s.pageviews),
				change: p ? delta(T, s.pageviews, p.pageviews) : null,
				sub: fill(T.common.perDay, { n: this.fmt(s.pageviews / days, 1) }),
				spark: spark(d.series.pageviews)
			}, {
				id: "countries",
				group: A,
				label: S.countries,
				value: this.fmt(d.counts.countries ?? d.breakdowns.countries.length),
				change: null,
				sub: fill(S.citiesSub, { n: this.fmt(d.breakdowns.cities.length) }),
				spark: ""
			}, {
				id: "per-visit",
				group: E,
				label: S.pagesPerVisit,
				value: this.fmt(ratio(s, "pageviews", "visits"), 2),
				change: p ? delta(T, ratio(s, "pageviews", "visits"), ratio(p, "pageviews", "visits")) : null,
				sub: "",
				spark: ""
			}, {
				id: "bounce",
				group: E,
				label: S.bounceRate,
				value: s.visits ? formatPercent(T, ratio(s, "bounces", "visits"), 0) : "—",
				change: p?.visits ? gap(T, ratio(s, "bounces", "visits") * 100, ratio(p, "bounces", "visits") * 100, true, 0, "points") : null,
				sub: fill(S.bounceSub, { n: this.fmt(s.bounces) }),
				spark: ""
			}, {
				id: "duration",
				group: E,
				label: S.avgDuration,
				value: formatDuration(T, ratio(s, "totaltime", "visits")),
				change: p?.visits ? delta(T, ratio(s, "totaltime", "visits"), ratio(p, "totaltime", "visits")) : null,
				sub: S.perVisit,
				spark: ""
			}, {
				id: "engaged",
				group: E,
				label: S.engagedVisits,
				value: this.fmt(s.visits - s.bounces),
				change: p ? delta(T, s.visits - s.bounces, p.visits - p.bounces) : null,
				sub: s.visits ? fill(S.ofVisits, { p: formatPercent(T, (s.visits - s.bounces) / s.visits, 0) }) : "",
				spark: ""
			});
			if (d.series.unit === "day" && d.series.slots.length >= 14) {
				const week = (v) => [v.slice(-7), v.slice(-14, -7)].map((x) => x.reduce((n, y) => n + y, 0));
				const R = S.groupRecent;
				const [vNow, vBefore] = week(d.series.visitors), [pNow, pBefore] = week(d.series.pageviews);
				out.push({
					id: "last7-visitors",
					group: R,
					label: S.last7Visitors,
					value: this.fmt(vNow),
					change: delta(T, vNow, vBefore),
					sub: S.vsPrevious7,
					spark: ""
				}, {
					id: "last7-pageviews",
					group: R,
					label: S.last7Pageviews,
					value: this.fmt(pNow),
					change: delta(T, pNow, pBefore),
					sub: S.vsPrevious7,
					spark: ""
				});
			}
			for (const g of d.goals) out.push({
				id: `goal-${g.id}`,
				group: S.groupGoals,
				label: g.label,
				value: this.fmt(g.value),
				change: delta(T, g.value, g.previous),
				sub: s.visitors ? fill(S.ofVisitors, { p: formatPercent(T, g.value / s.visitors, 1) }) : "",
				spark: ""
			});
			const events = d.breakdowns.events;
			out.push({
				id: "events",
				group: S.groupGoals,
				label: S.events,
				value: this.fmt(d.counts.events ?? events.reduce((n, e) => n + e.value, 0)),
				change: null,
				sub: plural(T, events.length, S.eventTypesOne, S.eventTypesOther),
				spark: ""
			});
		}
		for (const x of d.extras?.tiles ?? []) out.push({
			id: `x-${x.id}`,
			group: x.group ?? S.groupSite,
			label: x.label,
			value: typeof x.value === "number" ? this.fmt(x.value) : x.value,
			change: typeof x.value === "number" && x.previous !== null ? delta(T, x.value, x.previous) : null,
			sub: x.sub ?? "",
			spark: "",
			highlight: x.highlight,
			link: x.link ?? null
		});
		return out;
	}, ...ngDevMode ? [{ debugName: "tiles" }] : /* istanbul ignore next */ []);
	funnel = computed(() => {
		const d = this.data();
		if (!d) return [];
		const T = this.T(), S = T.stats;
		const v = Math.max(1, d.totals.visitors);
		const engaged = d.totals.visits - d.totals.bounces;
		const goals = d.goals.reduce((n, g) => n + g.value, 0);
		const w = (n, of) => `${Math.min(100, Math.round(n / Math.max(1, of) * 100))}%`;
		const out = [{
			label: S.funnelVisitors,
			value: this.fmt(d.totals.visitors),
			w: "100%",
			note: ""
		}, {
			label: S.funnelEngaged,
			value: this.fmt(engaged),
			w: w(engaged, d.totals.visits),
			note: fill(S.ofVisits, { p: formatPercent(T, engaged / Math.max(1, d.totals.visits), 0) })
		}];
		if (d.goals.length) out.push({
			label: S.funnelGoals,
			value: this.fmt(goals),
			w: w(goals, v),
			note: fill(S.ofVisitors, { p: formatPercent(T, goals / v, 1) })
		});
		const last = d.extras?.funnel;
		if (last) {
			const before = d.goals.length ? goals : engaged;
			out.push({
				label: last.label,
				value: this.fmt(last.value),
				w: w(last.value, v),
				note: before ? fill(S.funnelOfPrevious, { p: formatPercent(T, last.value / before, 0) }) : ""
			});
		}
		return out;
	}, ...ngDevMode ? [{ debugName: "funnel" }] : /* istanbul ignore next */ []);
	visitsDelta = computed(() => [{
		key: "y",
		label: this.T().stats.colVisits,
		delta: true
	}, {
		key: "share",
		label: this.T().common.share,
		kind: "pct",
		tip: this.T().common.shareTip
	}], ...ngDevMode ? [{ debugName: "visitsDelta" }] : /* istanbul ignore next */ []);
	itemRows(items, label) {
		const list = items ?? [];
		const total = Math.max(1, list.reduce((n, p) => n + p.value, 0));
		return list.map((p) => {
			return {
				label: (p.label ?? label(p.key)) || "—",
				sub: p.label && p.label !== p.key && p.key.startsWith("/") ? p.key : void 0,
				values: {
					y: p.value,
					share: p.value / total
				},
				prev: p.previous === null ? void 0 : { y: p.previous }
			};
		});
	}
	countryRows = computed(() => this.itemRows(this.data()?.breakdowns.countries, (k) => countryName(this.T(), k)), ...ngDevMode ? [{ debugName: "countryRows" }] : /* istanbul ignore next */ []);
	blocks = computed(() => {
		const d = this.data();
		if (!d) return [];
		const T = this.T(), S = T.stats;
		const cols = (label, withDelta = false) => [{
			key: "y",
			label,
			delta: withDelta
		}, {
			key: "share",
			label: T.common.share,
			kind: "pct",
			tip: T.common.shareTip
		}], visits = cols(S.colVisits), visitsD = cols(S.colVisits, true);
		cols(S.colPageviews);
		const viewsD = cols(S.colPageviews, true);
		const out = [];
		const add = (b) => {
			if (b.rows.length || [
				"pages",
				"entries",
				"exits",
				"referrers",
				"events"
			].includes(b.id)) out.push(b);
		};
		const b = d.breakdowns;
		const page = (k) => k;
		if (d.status === "ok") {
			if (d.pages.length) {
				const pr = d.pages;
				const lab = (x) => ({
					label: x.label ?? x.key,
					sub: x.label && x.label !== x.key ? x.key : void 0
				});
				add({
					id: "pages",
					section: "pages",
					title: S.pagesTitle,
					sub: S.pagesSub,
					head: S.colPage,
					limit: 12,
					cols: [
						{
							key: "views",
							label: S.colViews,
							delta: true
						},
						{
							key: "visitors",
							label: S.colVisitors
						},
						{
							key: "entries",
							label: S.colEntries
						},
						{
							key: "exits",
							label: S.colExits
						},
						{
							key: "bounce",
							label: S.colBounce,
							kind: "pct",
							lowerBetter: true
						},
						{
							key: "time",
							label: S.colTime,
							kind: "dur"
						}
					],
					rows: pr.map((x) => ({
						...lab(x),
						values: {
							views: x.views,
							visitors: x.visitors,
							entries: x.entries,
							exits: x.exits,
							bounce: x.entries ? x.bounces / x.entries : null,
							time: x.views ? x.totaltime / x.views : null
						},
						prev: x.previousViews === null ? void 0 : { views: x.previousViews }
					}))
				});
				const entries = pr.filter((x) => x.entries > 0), et = Math.max(1, entries.reduce((n, x) => n + x.entries, 0));
				add({
					id: "entries",
					section: "pages",
					title: S.entriesTitle,
					sub: S.entriesSub,
					head: S.colPage,
					cols: [
						{
							key: "entries",
							label: S.colEntries
						},
						{
							key: "bounce",
							label: S.colBounce,
							kind: "pct",
							lowerBetter: true
						},
						{
							key: "share",
							label: T.common.share,
							kind: "pct"
						}
					],
					rows: entries.map((x) => ({
						...lab(x),
						values: {
							entries: x.entries,
							bounce: x.bounces / x.entries,
							share: x.entries / et
						}
					}))
				});
				const exits = pr.filter((x) => x.exits > 0), xt = Math.max(1, exits.reduce((n, x) => n + x.exits, 0));
				add({
					id: "exits",
					section: "pages",
					title: S.exitsTitle,
					sub: S.exitsSub,
					head: S.colPage,
					cols: [
						{
							key: "exits",
							label: S.colExits
						},
						{
							key: "share",
							label: T.common.share,
							kind: "pct"
						},
						{
							key: "rate",
							label: S.colExitRate,
							kind: "pct",
							lowerBetter: true,
							tip: S.colExitRateTip
						}
					],
					rows: exits.map((x) => ({
						...lab(x),
						values: {
							exits: x.exits,
							share: x.exits / xt,
							rate: x.views ? Math.min(1, x.exits / x.views) : null
						}
					}))
				});
			} else {
				add({
					id: "pages",
					section: "pages",
					title: S.pagesTitle,
					head: S.colPage,
					cols: viewsD,
					rows: this.itemRows(b.pages, page),
					limit: 12
				});
				add({
					id: "entries",
					section: "pages",
					title: S.entriesTitle,
					sub: S.entriesSub,
					head: S.colPage,
					cols: visits,
					rows: this.itemRows(b.entries, page)
				});
				add({
					id: "exits",
					section: "pages",
					title: S.exitsTitle,
					sub: S.exitsSub,
					head: S.colPage,
					cols: visits,
					rows: this.itemRows(b.exits, page)
				});
			}
			for (const g of d.groups) add({
				id: `group-${g.id}`,
				section: "pages",
				title: g.title,
				head: S.colItem,
				cols: viewsD,
				rows: this.itemRows(g.items, (k) => k.replace(/-/g, " "))
			});
			add({
				id: "channels",
				section: "sources",
				title: S.channelsTitle,
				sub: S.channelsSub,
				head: S.colChannel,
				cols: visitsD,
				rows: this.itemRows(b.channels, (k) => channelName(T, k))
			});
			add({
				id: "referrers",
				section: "sources",
				title: S.referrersTitle,
				sub: S.referrersSub,
				head: S.colSource,
				cols: visitsD,
				rows: this.itemRows(b.referrers, (k) => k || T.common.direct),
				limit: 12
			});
			add({
				id: "utm-campaigns",
				section: "sources",
				title: S.utmCampaignsTitle,
				head: S.colCampaign,
				cols: visits,
				rows: this.itemRows(b.utmCampaigns, page)
			});
			add({
				id: "utm-sources",
				section: "sources",
				title: S.utmSourcesTitle,
				head: S.colSource,
				cols: visits,
				rows: this.itemRows(b.utmSources, page)
			});
			add({
				id: "utm-mediums",
				section: "sources",
				title: S.utmMediumsTitle,
				head: S.colMedium,
				cols: visits,
				rows: this.itemRows(b.utmMediums, page)
			});
			add({
				id: "hostnames",
				section: "sources",
				title: S.hostnamesTitle,
				head: S.colAddress,
				cols: visits,
				rows: this.itemRows(b.hostnames, page)
			});
			add({
				id: "regions",
				section: "audience",
				title: S.regionsTitle,
				head: S.colRegion,
				cols: visits,
				rows: this.itemRows(b.regions, (k) => regionName(T, k)),
				limit: 8
			});
			add({
				id: "cities",
				section: "audience",
				title: S.citiesTitle,
				head: S.colCity,
				cols: visits,
				rows: this.itemRows(b.cities, page),
				limit: 12
			});
			add({
				id: "site-languages",
				section: "audience",
				title: S.siteLanguagesTitle,
				head: S.colLanguage,
				cols: viewsD,
				rows: this.itemRows(b.siteLanguages, (k) => languageName(T, k))
			});
			add({
				id: "languages",
				section: "audience",
				title: S.languagesTitle,
				head: S.colLanguage,
				cols: visits,
				rows: this.itemRows(b.languages, (k) => languageName(T, k))
			});
			add({
				id: "devices",
				section: "audience",
				title: S.devicesTitle,
				head: S.colDevice,
				cols: visits,
				rows: this.itemRows(b.devices, (k) => deviceName(T, k))
			});
			add({
				id: "browsers",
				section: "audience",
				title: S.browsersTitle,
				head: S.colBrowser,
				cols: visits,
				rows: this.itemRows(b.browsers, browserName)
			});
			add({
				id: "os",
				section: "audience",
				title: S.osTitle,
				head: S.colSystem,
				cols: visits,
				rows: this.itemRows(b.os, capitalize)
			});
			add({
				id: "screens",
				section: "audience",
				title: S.screensTitle,
				head: S.colScreen,
				cols: visits,
				rows: this.itemRows(b.screens, page)
			});
			const es = d.eventSeries;
			const recent = !!es && d.series.unit === "day" && d.series.slots.length > 7;
			const eventCols = [
				{
					key: "y",
					label: S.colTotal,
					delta: true
				},
				...recent ? [{
					key: "last7",
					label: S.colLast7,
					tip: S.colLast7Tip
				}] : [],
				{
					key: "share",
					label: T.common.share,
					kind: "pct"
				}
			];
			const eventRows = this.itemRows(b.events, page).map((r, i) => recent ? {
				...r,
				values: {
					...r.values,
					last7: (es[b.events[i].key] ?? []).slice(-7).reduce((n, v) => n + v, 0)
				}
			} : r);
			add({
				id: "events",
				section: "actions",
				title: S.eventsTitle,
				sub: S.eventsSub,
				head: S.colAction,
				cols: eventCols,
				rows: eventRows,
				limit: 16
			});
		}
		for (const t of d.extras?.tables ?? []) {
			const total = Math.max(1, t.items.reduce((n, i) => n + i.value, 0));
			out.push({
				id: `x-${t.id}`,
				section: t.section,
				title: t.title,
				sub: t.sub ?? void 0,
				head: t.head,
				cols: [{
					key: "y",
					label: t.column,
					delta: t.items.some((i) => i.previous !== null)
				}, {
					key: "share",
					label: T.common.share,
					kind: "pct"
				}],
				rows: t.items.map((i) => ({
					label: i.label ?? i.key,
					values: {
						y: i.value,
						share: i.value / total
					},
					prev: i.previous === null ? void 0 : { y: i.previous }
				}))
			});
		}
		return out;
	}, ...ngDevMode ? [{ debugName: "blocks" }] : /* istanbul ignore next */ []);
	sections = computed(() => {
		const S = this.T().stats;
		return [
			{
				id: "pages",
				title: S.sectionPages,
				sub: S.sectionPagesSub
			},
			{
				id: "sources",
				title: S.sectionSources,
				sub: S.sectionSourcesSub
			},
			{
				id: "audience",
				title: S.sectionAudience,
				sub: S.sectionAudienceSub
			},
			{
				id: "actions",
				title: S.sectionActions,
				sub: S.sectionActionsSub
			}
		].map((s) => ({
			...s,
			blocks: this.blocks().filter((b) => b.section === s.id)
		}));
	}, ...ngDevMode ? [{ debugName: "sections" }] : /* istanbul ignore next */ []);
	sessionRows = computed(() => {
		const T = this.T(), tz = this.data()?.range.timeZone ?? "UTC";
		return (this.data()?.sessions ?? []).map((s) => ({
			place: [s.city, s.country && countryName(T, s.country)].filter(Boolean).join(", ") || "—",
			tech: [
				s.device && deviceName(T, s.device),
				s.browser && browserName(s.browser),
				s.os
			].filter(Boolean).join(" · ") || "—",
			views: this.fmt(s.views),
			when: s.lastAt ? shortDateTime(T, s.lastAt, tz) : "—"
		}));
	}, ...ngDevMode ? [{ debugName: "sessionRows" }] : /* istanbul ignore next */ []);
	query() {
		return this.custom() && this.from() ? {
			from: this.from(),
			to: this.to() || this.today
		} : { days: this.days() };
	}
	choose(days) {
		this.custom.set(false);
		this.days.set(days);
		this.run();
	}
	openCustom() {
		if (!this.from()) this.from.set((/* @__PURE__ */ new Date(Date.now() - 2592e6)).toISOString().slice(0, 10));
		this.custom.set(true);
	}
	async run() {
		const base = this.base();
		this.loading.set(true);
		this.failed.set(false);
		await this.fetch(false);
		if (base === this.base()) this.loading.set(false);
	}
	async fetch(silent) {
		const base = this.base();
		try {
			const d = await this.api.get(base, "/overview", this.query());
			if (base !== this.base()) return;
			this.data.set(d);
			this.active.set(d.active);
			this.stale.set(d.active === null && d.status === "ok");
			this.now.set(Date.now());
		} catch {
			if (base !== this.base()) return;
			if (silent) this.stale.set(true);
			else this.data.set(null), this.failed.set(true);
		}
	}
	async refreshLive() {
		const base = this.base();
		try {
			const r = await this.api.get(base, "/live");
			if (base !== this.base()) return;
			this.active.set(r.active);
			this.stale.set(r.active === null);
		} catch {
			this.stale.set(true);
		}
	}
	jump(e, id) {
		const el = this.doc.getElementById(id);
		if (!el) return;
		e.preventDefault();
		el.scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
		el.setAttribute("tabindex", "-1");
		el.focus({ preventScroll: true });
	}
	print() {
		this.doc.defaultView?.print();
	}
	async previewReport() {
		const win = this.doc.defaultView;
		const tab = win?.open("", "_blank") ?? null;
		this.reporting.set(true);
		this.message.set(null);
		try {
			const r = await this.api.get(this.base(), "/report/preview", this.custom() ? this.query() : { days: Math.min(this.days(), 366) });
			const url = URL.createObjectURL(new Blob([r.html], { type: "text/html;charset=utf-8" }));
			if (tab) tab.location.href = url;
			else win?.open(url, "_blank");
		} catch {
			tab?.close();
			this.message.set({
				ok: false,
				text: this.T().stats.reportPreviewError
			});
		} finally {
			this.reporting.set(false);
		}
	}
	async sendReport() {
		const days = this.data()?.range.days ?? this.days();
		if (!(this.doc.defaultView?.confirm(fill(this.T().stats.sendReportConfirm, { days })) ?? false)) return;
		this.reporting.set(true);
		this.message.set({
			ok: true,
			text: this.T().stats.reportSending
		});
		try {
			const r = await this.api.post(this.base(), "/report/send", this.query());
			this.message.set(r.ok ? {
				ok: true,
				text: plural(this.T(), r.recipients, this.T().stats.reportSentOne, this.T().stats.reportSentOther)
			} : {
				ok: false,
				text: this.T().stats.reportError
			});
		} catch {
			this.message.set({
				ok: false,
				text: this.T().stats.reportError
			});
		} finally {
			this.reporting.set(false);
		}
	}
	csvRows() {
		const d = this.data();
		const S = this.T().stats;
		const rows = [
			[
				S.csvSection,
				S.csvLabel,
				S.csvColumn,
				S.csvValue
			],
			[
				this.T().periods.label,
				this.T().periods.from,
				"",
				d.range.from
			],
			[
				this.T().periods.label,
				this.T().periods.to,
				"",
				d.range.to
			]
		];
		for (const [k, v] of Object.entries(d.totals)) rows.push([
			S.csvTotals,
			k,
			"",
			v
		]);
		if (d.previous) for (const [k, v] of Object.entries(d.previous)) rows.push([
			S.csvPreviousTotals,
			k,
			"",
			v
		]);
		d.series.slots.forEach((s, i) => rows.push([
			S.pageviews,
			s,
			"",
			d.series.pageviews[i]
		], [
			S.visitors,
			s,
			"",
			d.series.visitors[i]
		]));
		for (const t of this.tiles().filter((x) => x.id?.startsWith("x-") || x.id?.startsWith("goal-"))) rows.push([
			t.group ?? "",
			t.label,
			"",
			t.value
		]);
		const all = [...this.blocks(), {
			title: S.countriesTitle,
			cols: this.visitsDelta(),
			rows: this.countryRows()
		}];
		for (const b of all) for (const r of b.rows) for (const c of b.cols) rows.push([
			b.title,
			r.label,
			c.label,
			r.values[c.key] ?? null
		]);
		return rows;
	}
	exportCsv() {
		const d = this.data();
		if (!d) return;
		download(this.doc, `${fill(this.T().stats.csvFile, {
			days: d.range.days,
			date: this.today
		})}.csv`, toCsv(this.csvRows(), csvSeparator(this.T())));
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkStatistics,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkStatistics,
		isStandalone: true,
		selector: "sk-statistics, sk-statistiques",
		inputs: {
			apiUrl: {
				classPropertyName: "apiUrl",
				publicName: "apiUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			locale: {
				classPropertyName: "locale",
				publicName: "locale",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			presets: {
				classPropertyName: "presets",
				publicName: "presets",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			initialDays: {
				classPropertyName: "initialDays",
				publicName: "initialDays",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			report: {
				classPropertyName: "report",
				publicName: "report",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			theme: {
				classPropertyName: "theme",
				publicName: "theme",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			liveMs: {
				classPropertyName: "liveMs",
				publicName: "liveMs",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			refreshMs: {
				classPropertyName: "refreshMs",
				publicName: "refreshMs",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			worldUrl: {
				classPropertyName: "worldUrl",
				publicName: "worldUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			heading: {
				classPropertyName: "heading",
				publicName: "heading",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: { properties: { "attr.data-sk-mode": "mode()" } },
		ngImport: i0,
		template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().stats.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().stats.title }}</h2> }
        }
        @if (level() !== 'none' && T().stats.lead) { <p class="sk-lead">{{ T().stats.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-group">
            <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
              @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="!custom() && days() === p" (click)="choose(p)">{{ p === 1 ? T().periods.h24 : fill(T().periods.days, { n: p }) }}</button> }
              <button type="button" [attr.aria-pressed]="custom()" (click)="openCustom()">{{ T().periods.custom }}</button>
            </div>
            @if (custom()) {
              <span class="sk-group">
                <label class="sk-field">{{ T().periods.from }} <input type="date" [value]="from()" [max]="today" (change)="from.set($any($event.target).value)" /></label>
                <label class="sk-field">{{ T().periods.to }} <input type="date" [value]="to()" [max]="today" (change)="to.set($any($event.target).value)" /></label>
                <button type="button" class="sk-btn sk-btn--primary" (click)="run()" [disabled]="!from()">{{ T().periods.apply }}</button>
              </span>
            }
          </div>
          @if (data(); as d) {
            <div class="sk-group">
              @if (d.dashboardUrl) { <a class="sk-btn" [href]="d.dashboardUrl" target="_blank" rel="noopener">{{ T().stats.openDashboard }}</a> }
              <button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button>
              <button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button>
              @if (report()) {
                <button type="button" class="sk-btn" (click)="previewReport()" [disabled]="reporting()">{{ T().stats.previewReport }}</button>
                <button type="button" class="sk-btn" (click)="sendReport()" [disabled]="reporting()">{{ T().stats.sendReport }}</button>
              }
            </div>
          }
        </div>
      </header>

      @if (message(); as m) { <p class="sk-status" [class.sk-status--ok]="m.ok" [class.sk-status--err]="!m.ok" role="status">{{ m.text }}</p> }

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.notConfiguredTitle }}</b>{{ T().stats.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.errorTitle }}</b>{{ T().stats.errorHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
        }

        @if (ok()) {
          <div class="sk-toolbar">
            <div class="sk-live">
              @if (stale()) {
                <span class="sk-badge sk-badge--stale" [title]="T().stats.liveStaleHelp"><i></i>{{ T().stats.liveStale }}</span>
              } @else {
                <span class="sk-badge" aria-live="polite"><i></i>{{ plural(T(), active() ?? 0, T().stats.liveOne, T().stats.liveOther) }}</span>
              }
              <button type="button" class="sk-pause sk-noprint" (click)="auto.set(!auto())" [attr.aria-label]="auto() ? T().stats.pause : T().stats.resume" [attr.aria-pressed]="!auto()" [title]="auto() ? T().stats.pause : T().stats.resume">{{ auto() ? '❚❚' : '▶' }}</button>
              <span class="sk-small">{{ updated() }} · {{ range() }}</span>
            </div>
            <nav class="sk-jump" [attr.aria-label]="T().common.jumpTo">
              <a href="#sk-pages" (click)="jump($event, 'sk-pages')">{{ T().stats.sectionPages }}</a>
              <a href="#sk-sources" (click)="jump($event, 'sk-sources')">{{ T().stats.sectionSources }}</a>
              <a href="#sk-audience" (click)="jump($event, 'sk-audience')">{{ T().stats.sectionAudience }}</a>
              <a href="#sk-actions" (click)="jump($event, 'sk-actions')">{{ T().stats.sectionActions }}</a>
              <a href="#sk-sessions" (click)="jump($event, 'sk-sessions')">{{ T().stats.sectionSessions }}</a>
            </nav>
          </div>
        }

        @if (tiles().length) { <sk-tile-groups [tiles]="tiles()" /> }

        @if (ok()) {
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="d.series.unit === 'hour' ? T().stats.trafficHourly : T().stats.trafficDaily" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors"
              [slots]="d.series.slots" [unit]="d.series.unit" [bar]="d.series.pageviews" [line]="d.series.visitors" [prev]="d.series.previousPageviews ?? []" [foot]="bestDay()" />
            <section class="sk-card">
              <h2>{{ T().stats.funnelTitle }}</h2>
              <p class="sk-sub">{{ T().stats.funnelSub }}</p>
              <ol class="sk-funnel">
                @for (s of funnel(); track s.label) {
                  <li [style.--w]="s.w"><span class="sk-funnel__label">{{ s.label }}</span><span class="sk-funnel__val"><b>{{ s.value }}</b>@if (s.note) { <small>{{ s.note }}</small> }</span><span class="sk-funnel__bar" aria-hidden="true"></span></li>
                }
              </ol>
              @if (d.totals.visitors < 30) { <p class="sk-hint">{{ T().stats.fewVisitors }}</p> }
            </section>
          </div>

          <div class="sk-geo">
            <section class="sk-card sk-map-card">
              <div class="sk-map-card__head">
                <h2>{{ T().stats.mapTitle }}</h2>
                @if (mapMax()) { <span class="sk-legend" aria-hidden="true"><span>1</span><i></i><span>{{ fill(T().stats.mapLegend, { n: fmt(mapMax()) }) }}</span></span> }
              </div>
              <sk-world-map [texts]="T()" [countries]="d.breakdowns.countries" [apiUrl]="base()" [worldUrl]="worldUrl()" />
            </section>
            <sk-metric-table [texts]="T()" [title]="T().stats.countriesTitle" [head]="T().stats.colCountry" [rows]="countryRows()" [cols]="visitsDelta()" [limit]="12" />
          </div>

          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().stats.last24h" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors" [slots]="d.last24h.slots" unit="hour"
              [bar]="d.last24h.pageviews" [line]="d.last24h.visitors" [foot]="fill(T().stats.last24hFoot, { n: fmt(sum(d.last24h.pageviews)) })" />
            <section class="sk-card">
              <h2>{{ T().stats.heatTitle }}</h2>
              <p class="sk-sub">{{ slotText() }} · {{ fill(T().stats.heatSub, { tz: d.range.timeZone }) }}</p>
              <sk-heatmap [texts]="T()" [grid]="d.heatmap" [summary]="slotText()" style="margin-top:.6rem" />
            </section>
          </div>

          <p class="sk-small">{{ T().stats.tablesHint }}</p>
        }

        @for (s of sections(); track s.id) {
          @if (s.blocks.length) {
            <section class="sk-section" [id]="'sk-' + s.id">
              <h2>{{ s.title }} <small>{{ s.sub }}</small></h2>
              <div class="sk-grid">@for (b of s.blocks; track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub ?? ''" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="b.limit ?? 10" /> }</div>
            </section>
          }
        }

        @if (ok()) {
          <section class="sk-card sk-sessions" id="sk-sessions">
            <h2>{{ T().stats.sessionsTitle }}</h2>
            <p class="sk-sub">{{ T().stats.sessionsSub }}</p>
            @if (sessionRows().length) {
              <table>
                <thead><tr><th scope="col">{{ T().stats.sessionsPlace }}</th><th scope="col">{{ T().stats.sessionsDevice }}</th><th scope="col" class="sk-num">{{ T().stats.sessionsPages }}</th><th scope="col">{{ T().stats.sessionsWhen }}</th></tr></thead>
                <tbody>@for (x of sessionRows(); track $index) { <tr><td>{{ x.place }}</td><td [attr.data-label]="colon(T().stats.sessionsDevice)">{{ x.tech }}</td><td class="sk-num" [attr.data-label]="colon(T().stats.sessionsPages)">{{ x.views }}</td><td [attr.data-label]="colon(T().stats.sessionsWhen)">{{ x.when }}</td></tr> }</tbody>
              </table>
            } @else {
              <div class="sk-empty"><b>{{ T().stats.sessionsEmptyTitle }}</b>{{ T().stats.sessionsEmpty }}</div>
            }
          </section>
        }
      }
    </div>
  `,
		isInline: true,
		styles: [
			":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
			":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
			".sk-live{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}.sk-badge{display:inline-flex;align-items:center;gap:.45rem;max-width:100%;overflow-wrap:anywhere;padding:.25rem .7rem;border-radius:999px;font-size:.82rem;font-weight:var(--k-w-label);background:var(--k-up-soft);color:var(--k-up)}.sk-badge i{flex:none;width:8px;height:8px;border-radius:50%;background:currentColor;animation:sk-pulse 2s ease-in-out infinite}.sk-badge--stale{background:var(--k-warn-soft);color:var(--k-warn)}.sk-badge--stale i{animation:none}@media(prefers-reduced-motion:reduce){.sk-badge i{animation:none}}@keyframes sk-pulse{50%{opacity:.35}}.sk-pause{flex:none;width:max(34px,3.25em);height:max(34px,3.25em);display:inline-grid;place-items:center;font-size:.65rem;color:var(--k-ink2);background:var(--k-card);border:1px solid var(--k-line2);border-radius:50%;cursor:pointer}.sk-pause:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-pause:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-geo{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:var(--k-gap);align-items:start}@media(max-width:1000px){.sk-geo{grid-template-columns:minmax(0,1fr)}}.sk-page{container:sk-stats / inline-size}@container sk-stats (max-width: 40rem){.sk-geo{grid-template-columns:minmax(0,1fr)}}.sk-map-card{display:grid;gap:.75rem}.sk-map-card__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.5rem 1rem}.sk-legend{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.25rem .5rem;max-width:100%;font-size:.76rem;font-weight:var(--k-w-label);color:var(--k-ink2)}.sk-legend i{width:clamp(32px,20vw,96px);height:10px;border-radius:5px;background:linear-gradient(90deg,var(--k-map-lo),var(--k-map-hi))}.sk-funnel{display:grid;gap:1rem;margin:.75rem 0 0;padding:0;list-style:none}.sk-funnel li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.25rem .75rem;align-items:baseline;font-size:.875rem}.sk-funnel__label{min-width:0;font-weight:var(--k-w-label);overflow-wrap:anywhere}.sk-funnel__val{min-width:0;text-align:right;overflow-wrap:anywhere}.sk-funnel__val b{font-size:1.05rem;font-variant-numeric:tabular-nums}.sk-funnel small{display:block;color:var(--k-muted);font-size:.76rem;font-weight:var(--k-w-row)}.sk-funnel__bar{grid-column:1 / -1;position:relative;height:10px;border-radius:5px;background:var(--k-track);overflow:hidden}.sk-funnel__bar:after{content:\"\";position:absolute;inset:0 auto 0 0;width:var(--w);border-radius:5px;background:var(--k-c1)}.sk-hint{margin-top:.75rem;font-size:.78rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sessions{overflow-x:auto}.sk-sessions table{width:100%;border-collapse:collapse;font-size:.875rem;margin-top:.75rem}.sk-sessions th,.sk-sessions td{padding:.5rem;text-align:left;border-bottom:1px solid var(--k-line);overflow-wrap:anywhere}.sk-sessions thead th{font-size:.76rem;color:var(--k-muted)}.sk-sessions .sk-num{text-align:right;font-variant-numeric:tabular-nums}.sk-sessions tbody tr:last-child>*{border-bottom:0}@media(max-width:700px){.sk-sessions thead{display:none}.sk-sessions tr{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:.5rem 0;border-bottom:1px solid var(--k-line)}.sk-sessions td{border:0;padding:.1rem 0}.sk-sessions td[data-label]:before{content:attr(data-label) \" \";color:var(--k-muted);font-size:.76rem}.sk-sessions .sk-num{text-align:left}}@media(max-width:760px){.sk-pause{width:max(48px,3.25em);height:max(48px,3.25em)}}@media print{.sk-geo,.sk-twin{break-inside:avoid}.sk-funnel__bar,.sk-funnel__bar:after{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"
		],
		dependencies: [
			{
				kind: "component",
				type: SkTileGroups,
				selector: "sk-tile-groups",
				inputs: ["tiles"]
			},
			{
				kind: "component",
				type: SkMetricTable,
				selector: "sk-metric-table",
				inputs: [
					"texts",
					"title",
					"sub",
					"head",
					"rows",
					"cols",
					"limit",
					"empty",
					"exportName"
				]
			},
			{
				kind: "component",
				type: SkTrendChart,
				selector: "sk-trend-chart",
				inputs: [
					"texts",
					"title",
					"barLabel",
					"lineLabel",
					"foot",
					"slots",
					"unit",
					"bar",
					"line",
					"prev"
				]
			},
			{
				kind: "component",
				type: SkWorldMap,
				selector: "sk-world-map",
				inputs: [
					"texts",
					"countries",
					"worldUrl",
					"apiUrl",
					"label",
					"low",
					"high"
				]
			},
			{
				kind: "component",
				type: SkHeatmap,
				selector: "sk-heatmap",
				inputs: [
					"texts",
					"grid",
					"summary"
				]
			}
		],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkStatistics,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-statistics, sk-statistiques",
			imports: [
				SkTileGroups,
				SkMetricTable,
				SkTrendChart,
				SkWorldMap,
				SkHeatmap
			],
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: { "[attr.data-sk-mode]": "mode()" },
			template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().stats.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().stats.title }}</h2> }
        }
        @if (level() !== 'none' && T().stats.lead) { <p class="sk-lead">{{ T().stats.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-group">
            <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
              @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="!custom() && days() === p" (click)="choose(p)">{{ p === 1 ? T().periods.h24 : fill(T().periods.days, { n: p }) }}</button> }
              <button type="button" [attr.aria-pressed]="custom()" (click)="openCustom()">{{ T().periods.custom }}</button>
            </div>
            @if (custom()) {
              <span class="sk-group">
                <label class="sk-field">{{ T().periods.from }} <input type="date" [value]="from()" [max]="today" (change)="from.set($any($event.target).value)" /></label>
                <label class="sk-field">{{ T().periods.to }} <input type="date" [value]="to()" [max]="today" (change)="to.set($any($event.target).value)" /></label>
                <button type="button" class="sk-btn sk-btn--primary" (click)="run()" [disabled]="!from()">{{ T().periods.apply }}</button>
              </span>
            }
          </div>
          @if (data(); as d) {
            <div class="sk-group">
              @if (d.dashboardUrl) { <a class="sk-btn" [href]="d.dashboardUrl" target="_blank" rel="noopener">{{ T().stats.openDashboard }}</a> }
              <button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button>
              <button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button>
              @if (report()) {
                <button type="button" class="sk-btn" (click)="previewReport()" [disabled]="reporting()">{{ T().stats.previewReport }}</button>
                <button type="button" class="sk-btn" (click)="sendReport()" [disabled]="reporting()">{{ T().stats.sendReport }}</button>
              }
            </div>
          }
        </div>
      </header>

      @if (message(); as m) { <p class="sk-status" [class.sk-status--ok]="m.ok" [class.sk-status--err]="!m.ok" role="status">{{ m.text }}</p> }

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.notConfiguredTitle }}</b>{{ T().stats.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().stats.errorTitle }}</b>{{ T().stats.errorHelp }}</div><button type="button" class="sk-btn" (click)="run()">{{ T().common.retry }}</button></div>
        }

        @if (ok()) {
          <div class="sk-toolbar">
            <div class="sk-live">
              @if (stale()) {
                <span class="sk-badge sk-badge--stale" [title]="T().stats.liveStaleHelp"><i></i>{{ T().stats.liveStale }}</span>
              } @else {
                <span class="sk-badge" aria-live="polite"><i></i>{{ plural(T(), active() ?? 0, T().stats.liveOne, T().stats.liveOther) }}</span>
              }
              <button type="button" class="sk-pause sk-noprint" (click)="auto.set(!auto())" [attr.aria-label]="auto() ? T().stats.pause : T().stats.resume" [attr.aria-pressed]="!auto()" [title]="auto() ? T().stats.pause : T().stats.resume">{{ auto() ? '❚❚' : '▶' }}</button>
              <span class="sk-small">{{ updated() }} · {{ range() }}</span>
            </div>
            <nav class="sk-jump" [attr.aria-label]="T().common.jumpTo">
              <a href="#sk-pages" (click)="jump($event, 'sk-pages')">{{ T().stats.sectionPages }}</a>
              <a href="#sk-sources" (click)="jump($event, 'sk-sources')">{{ T().stats.sectionSources }}</a>
              <a href="#sk-audience" (click)="jump($event, 'sk-audience')">{{ T().stats.sectionAudience }}</a>
              <a href="#sk-actions" (click)="jump($event, 'sk-actions')">{{ T().stats.sectionActions }}</a>
              <a href="#sk-sessions" (click)="jump($event, 'sk-sessions')">{{ T().stats.sectionSessions }}</a>
            </nav>
          </div>
        }

        @if (tiles().length) { <sk-tile-groups [tiles]="tiles()" /> }

        @if (ok()) {
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="d.series.unit === 'hour' ? T().stats.trafficHourly : T().stats.trafficDaily" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors"
              [slots]="d.series.slots" [unit]="d.series.unit" [bar]="d.series.pageviews" [line]="d.series.visitors" [prev]="d.series.previousPageviews ?? []" [foot]="bestDay()" />
            <section class="sk-card">
              <h2>{{ T().stats.funnelTitle }}</h2>
              <p class="sk-sub">{{ T().stats.funnelSub }}</p>
              <ol class="sk-funnel">
                @for (s of funnel(); track s.label) {
                  <li [style.--w]="s.w"><span class="sk-funnel__label">{{ s.label }}</span><span class="sk-funnel__val"><b>{{ s.value }}</b>@if (s.note) { <small>{{ s.note }}</small> }</span><span class="sk-funnel__bar" aria-hidden="true"></span></li>
                }
              </ol>
              @if (d.totals.visitors < 30) { <p class="sk-hint">{{ T().stats.fewVisitors }}</p> }
            </section>
          </div>

          <div class="sk-geo">
            <section class="sk-card sk-map-card">
              <div class="sk-map-card__head">
                <h2>{{ T().stats.mapTitle }}</h2>
                @if (mapMax()) { <span class="sk-legend" aria-hidden="true"><span>1</span><i></i><span>{{ fill(T().stats.mapLegend, { n: fmt(mapMax()) }) }}</span></span> }
              </div>
              <sk-world-map [texts]="T()" [countries]="d.breakdowns.countries" [apiUrl]="base()" [worldUrl]="worldUrl()" />
            </section>
            <sk-metric-table [texts]="T()" [title]="T().stats.countriesTitle" [head]="T().stats.colCountry" [rows]="countryRows()" [cols]="visitsDelta()" [limit]="12" />
          </div>

          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().stats.last24h" [barLabel]="T().stats.pageviews" [lineLabel]="T().stats.visitors" [slots]="d.last24h.slots" unit="hour"
              [bar]="d.last24h.pageviews" [line]="d.last24h.visitors" [foot]="fill(T().stats.last24hFoot, { n: fmt(sum(d.last24h.pageviews)) })" />
            <section class="sk-card">
              <h2>{{ T().stats.heatTitle }}</h2>
              <p class="sk-sub">{{ slotText() }} · {{ fill(T().stats.heatSub, { tz: d.range.timeZone }) }}</p>
              <sk-heatmap [texts]="T()" [grid]="d.heatmap" [summary]="slotText()" style="margin-top:.6rem" />
            </section>
          </div>

          <p class="sk-small">{{ T().stats.tablesHint }}</p>
        }

        @for (s of sections(); track s.id) {
          @if (s.blocks.length) {
            <section class="sk-section" [id]="'sk-' + s.id">
              <h2>{{ s.title }} <small>{{ s.sub }}</small></h2>
              <div class="sk-grid">@for (b of s.blocks; track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub ?? ''" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="b.limit ?? 10" /> }</div>
            </section>
          }
        }

        @if (ok()) {
          <section class="sk-card sk-sessions" id="sk-sessions">
            <h2>{{ T().stats.sessionsTitle }}</h2>
            <p class="sk-sub">{{ T().stats.sessionsSub }}</p>
            @if (sessionRows().length) {
              <table>
                <thead><tr><th scope="col">{{ T().stats.sessionsPlace }}</th><th scope="col">{{ T().stats.sessionsDevice }}</th><th scope="col" class="sk-num">{{ T().stats.sessionsPages }}</th><th scope="col">{{ T().stats.sessionsWhen }}</th></tr></thead>
                <tbody>@for (x of sessionRows(); track $index) { <tr><td>{{ x.place }}</td><td [attr.data-label]="colon(T().stats.sessionsDevice)">{{ x.tech }}</td><td class="sk-num" [attr.data-label]="colon(T().stats.sessionsPages)">{{ x.views }}</td><td [attr.data-label]="colon(T().stats.sessionsWhen)">{{ x.when }}</td></tr> }</tbody>
              </table>
            } @else {
              <div class="sk-empty"><b>{{ T().stats.sessionsEmptyTitle }}</b>{{ T().stats.sessionsEmpty }}</div>
            }
          </section>
        }
      }
    </div>
  `,
			styles: [
				":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
				":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
				".sk-live{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem}.sk-badge{display:inline-flex;align-items:center;gap:.45rem;max-width:100%;overflow-wrap:anywhere;padding:.25rem .7rem;border-radius:999px;font-size:.82rem;font-weight:var(--k-w-label);background:var(--k-up-soft);color:var(--k-up)}.sk-badge i{flex:none;width:8px;height:8px;border-radius:50%;background:currentColor;animation:sk-pulse 2s ease-in-out infinite}.sk-badge--stale{background:var(--k-warn-soft);color:var(--k-warn)}.sk-badge--stale i{animation:none}@media(prefers-reduced-motion:reduce){.sk-badge i{animation:none}}@keyframes sk-pulse{50%{opacity:.35}}.sk-pause{flex:none;width:max(34px,3.25em);height:max(34px,3.25em);display:inline-grid;place-items:center;font-size:.65rem;color:var(--k-ink2);background:var(--k-card);border:1px solid var(--k-line2);border-radius:50%;cursor:pointer}.sk-pause:hover{color:var(--k-brand);border-color:var(--k-brand)}.sk-pause:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-geo{display:grid;grid-template-columns:minmax(0,1.6fr) minmax(300px,1fr);gap:var(--k-gap);align-items:start}@media(max-width:1000px){.sk-geo{grid-template-columns:minmax(0,1fr)}}.sk-page{container:sk-stats / inline-size}@container sk-stats (max-width: 40rem){.sk-geo{grid-template-columns:minmax(0,1fr)}}.sk-map-card{display:grid;gap:.75rem}.sk-map-card__head{display:flex;flex-wrap:wrap;align-items:baseline;justify-content:space-between;gap:.5rem 1rem}.sk-legend{display:inline-flex;flex-wrap:wrap;align-items:center;gap:.25rem .5rem;max-width:100%;font-size:.76rem;font-weight:var(--k-w-label);color:var(--k-ink2)}.sk-legend i{width:clamp(32px,20vw,96px);height:10px;border-radius:5px;background:linear-gradient(90deg,var(--k-map-lo),var(--k-map-hi))}.sk-funnel{display:grid;gap:1rem;margin:.75rem 0 0;padding:0;list-style:none}.sk-funnel li{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.25rem .75rem;align-items:baseline;font-size:.875rem}.sk-funnel__label{min-width:0;font-weight:var(--k-w-label);overflow-wrap:anywhere}.sk-funnel__val{min-width:0;text-align:right;overflow-wrap:anywhere}.sk-funnel__val b{font-size:1.05rem;font-variant-numeric:tabular-nums}.sk-funnel small{display:block;color:var(--k-muted);font-size:.76rem;font-weight:var(--k-w-row)}.sk-funnel__bar{grid-column:1 / -1;position:relative;height:10px;border-radius:5px;background:var(--k-track);overflow:hidden}.sk-funnel__bar:after{content:\"\";position:absolute;inset:0 auto 0 0;width:var(--w);border-radius:5px;background:var(--k-c1)}.sk-hint{margin-top:.75rem;font-size:.78rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sessions{overflow-x:auto}.sk-sessions table{width:100%;border-collapse:collapse;font-size:.875rem;margin-top:.75rem}.sk-sessions th,.sk-sessions td{padding:.5rem;text-align:left;border-bottom:1px solid var(--k-line);overflow-wrap:anywhere}.sk-sessions thead th{font-size:.76rem;color:var(--k-muted)}.sk-sessions .sk-num{text-align:right;font-variant-numeric:tabular-nums}.sk-sessions tbody tr:last-child>*{border-bottom:0}@media(max-width:700px){.sk-sessions thead{display:none}.sk-sessions tr{display:grid;grid-template-columns:minmax(0,1fr) auto;padding:.5rem 0;border-bottom:1px solid var(--k-line)}.sk-sessions td{border:0;padding:.1rem 0}.sk-sessions td[data-label]:before{content:attr(data-label) \" \";color:var(--k-muted);font-size:.76rem}.sk-sessions .sk-num{text-align:left}}@media(max-width:760px){.sk-pause{width:max(48px,3.25em);height:max(48px,3.25em)}}@media print{.sk-geo,.sk-twin{break-inside:avoid}.sk-funnel__bar,.sk-funnel__bar:after{-webkit-print-color-adjust:exact;print-color-adjust:exact}}\n"
			]
		}]
	}],
	ctorParameters: () => [],
	propDecorators: {
		apiUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "apiUrl",
				required: false
			}]
		}],
		locale: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "locale",
				required: false
			}]
		}],
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		presets: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "presets",
				required: false
			}]
		}],
		initialDays: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "initialDays",
				required: false
			}]
		}],
		report: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "report",
				required: false
			}]
		}],
		theme: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "theme",
				required: false
			}]
		}],
		liveMs: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "liveMs",
				required: false
			}]
		}],
		refreshMs: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "refreshMs",
				required: false
			}]
		}],
		worldUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "worldUrl",
				required: false
			}]
		}],
		heading: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "heading",
				required: false
			}]
		}]
	}
});
const SkStatistiques = SkStatistics;
var SkSearchConsole = class SkSearchConsole {
	api = inject(StatsKitApi);
	doc = inject(DOCUMENT);
	options = injectOptions();
	apiUrl = input(null, ...ngDevMode ? [{ debugName: "apiUrl" }] : /* istanbul ignore next */ []);
	locale = input(null, ...ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []);
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	presets = input([
		7,
		28,
		90,
		365
	], ...ngDevMode ? [{ debugName: "presets" }] : /* istanbul ignore next */ []);
	initialDays = input(28, ...ngDevMode ? [{ debugName: "initialDays" }] : /* istanbul ignore next */ []);
	theme = input("auto", ...ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []);
	heading = input(null, ...ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []);
	mode = resolvedMode(this.theme);
	T = computed(() => resolveTexts(this.options, this.locale(), this.texts()), ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	fill = fill;
	base = computed(() => this.apiUrl() || this.options.apiUrl, ...ngDevMode ? [{ debugName: "base" }] : /* istanbul ignore next */ []);
	level = computed(() => this.heading() ?? this.options.heading ?? "h1", ...ngDevMode ? [{ debugName: "level" }] : /* istanbul ignore next */ []);
	days = signal(28, ...ngDevMode ? [{ debugName: "days" }] : /* istanbul ignore next */ []);
	loading = signal(true, ...ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []);
	failed = signal(false, ...ngDevMode ? [{ debugName: "failed" }] : /* istanbul ignore next */ []);
	data = signal(null, ...ngDevMode ? [{ debugName: "data" }] : /* istanbul ignore next */ []);
	indexation = signal(null, ...ngDevMode ? [{ debugName: "indexation" }] : /* istanbul ignore next */ []);
	checking = signal(false, ...ngDevMode ? [{ debugName: "checking" }] : /* istanbul ignore next */ []);
	scope = signal("all", ...ngDevMode ? [{ debugName: "scope" }] : /* istanbul ignore next */ []);
	constructor() {
		loadOnSource(this.base, (first) => {
			if (first) this.days.set(this.initialDays());
			else this.data.set(null), this.indexation.set(null);
			this.load();
		});
	}
	ok = computed(() => this.data()?.status === "ok", ...ngDevMode ? [{ debugName: "ok" }] : /* istanbul ignore next */ []);
	date(v, withYear = false) {
		return shortDate(this.T(), v, "UTC", withYear);
	}
	fmt(v, d = 0) {
		return formatNumber(this.T(), v, d);
	}
	choose(days) {
		this.days.set(days);
		this.load();
	}
	async load() {
		const base = this.base();
		this.loading.set(true);
		this.failed.set(false);
		try {
			const d = await this.api.get(base, "/search", { days: this.days() });
			if (base !== this.base()) return;
			this.data.set(d);
		} catch {
			if (base !== this.base()) return;
			this.data.set(null);
			this.failed.set(true);
		}
		this.loading.set(false);
	}
	async checkIndexation() {
		this.checking.set(true);
		try {
			this.indexation.set(await this.api.get(this.base(), "/search/indexation"));
		} catch {
			this.indexation.set({
				version: 1,
				status: "error",
				error: null,
				checkedAt: (/* @__PURE__ */ new Date()).toISOString(),
				total: 0,
				indexed: 0,
				pages: []
			});
		}
		this.checking.set(false);
	}
	print() {
		this.doc.defaultView?.print();
	}
	slots = computed(() => (this.data()?.series ?? []).map((x) => x.date), ...ngDevMode ? [{ debugName: "slots" }] : /* istanbul ignore next */ []);
	series(k) {
		return (this.data()?.series ?? []).map((x) => x[k]);
	}
	previous(k) {
		return (this.data()?.previousSeries ?? []).map((x) => x[k]);
	}
	tiles = computed(() => {
		const d = this.data();
		if (!d || d.status !== "ok") return [];
		const T = this.T(), G = T.search;
		const t = d.totals, b = d.previous;
		const line = (k) => sparkPath(d.series.map((x) => x[k]));
		const visible = d.queries.filter((q) => q.impressions > 0);
		const brand = d.brandTerms.length ? d.queries.filter((q) => isBrand(q.key, d.brandTerms)).reduce((n, q) => n + q.clicks, 0) : null;
		const last7 = d.series.slice(-7), before7 = d.series.slice(-14, -7);
		const s7 = (rows, k) => rows.reduce((n, x) => n + x[k], 0);
		const C = G.groupClicks, V = G.groupVisibility;
		const out = [
			{
				id: "clicks",
				group: C,
				label: G.clicks,
				value: this.fmt(t.clicks),
				change: delta(T, t.clicks, b.clicks),
				sub: fill(T.common.perDay, { n: this.fmt(t.clicks / Math.max(1, d.days), 1) }),
				spark: line("clicks")
			},
			{
				id: "ctr",
				group: C,
				label: G.ctr,
				value: formatPercent(T, t.ctr),
				change: b.impressions ? gap(T, t.ctr * 100, b.ctr * 100, false, 1, "points") : null,
				sub: "",
				spark: line("ctr")
			},
			{
				id: "impressions",
				group: V,
				label: G.impressions,
				value: this.fmt(t.impressions),
				change: delta(T, t.impressions, b.impressions),
				sub: fill(T.common.perDay, { n: this.fmt(t.impressions / Math.max(1, d.days), 1) }),
				spark: line("impressions")
			},
			{
				id: "position",
				group: V,
				label: G.position,
				value: t.impressions ? this.fmt(t.position, 1) : "—",
				change: t.impressions && b.impressions ? gap(T, t.position, b.position, true, 1) : null,
				sub: T.common.lowerIsBetter,
				spark: ""
			},
			{
				id: "queries",
				group: V,
				label: G.queriesCount,
				value: this.fmt(visible.length),
				change: delta(T, visible.length, d.previousQueries.filter((q) => q.impressions > 0).length),
				sub: fill(G.firstPage, { n: this.fmt(visible.filter((q) => q.position <= 10).length) }),
				spark: ""
			},
			{
				id: "pages",
				group: V,
				label: G.visiblePages,
				value: this.fmt(d.pages.filter((x) => x.impressions > 0).length),
				change: delta(T, d.pages.length, d.previousPages.length),
				sub: "",
				spark: ""
			}
		];
		if (brand !== null) {
			out.push({
				id: "brand",
				group: C,
				label: G.brandClicks,
				value: t.clicks ? formatPercent(T, brand / t.clicks, 0) : "—",
				change: null,
				sub: fill(G.brandClicksSub, { n: this.fmt(brand) }),
				spark: ""
			});
			out.push({
				id: "nonbrand",
				group: C,
				label: G.nonBrandClicks,
				value: this.fmt(Math.max(0, t.clicks - brand)),
				change: null,
				sub: G.nonBrandSub,
				spark: ""
			});
		}
		if (before7.length === 7) {
			out.push({
				id: "last7c",
				group: G.groupRecent,
				label: G.last7Clicks,
				value: this.fmt(s7(last7, "clicks")),
				change: delta(T, s7(last7, "clicks"), s7(before7, "clicks")),
				sub: G.vsPrevious7,
				spark: ""
			});
			out.push({
				id: "last7i",
				group: G.groupRecent,
				label: G.last7Impressions,
				value: this.fmt(s7(last7, "impressions")),
				change: delta(T, s7(last7, "impressions"), s7(before7, "impressions")),
				sub: G.vsPrevious7,
				spark: ""
			});
		}
		const maps = d.sitemaps ?? [];
		if (maps.length) out.push({
			id: "sitemap",
			group: G.groupIndex,
			label: G.sitemapPages,
			value: this.fmt(maps.reduce((n, m) => n + m.submitted, 0)),
			change: null,
			sub: fill(G.sitemapSub, { n: maps.reduce((n, m) => n + m.errors, 0) }),
			spark: ""
		});
		const ix = this.indexation();
		if (ix?.status === "ok") out.push({
			id: "indexed",
			group: G.groupIndex,
			label: G.indexedPages,
			value: `${this.fmt(ix.indexed)} / ${this.fmt(ix.total)}`,
			change: null,
			sub: ix.total ? fill(G.indexedSub, { p: formatPercent(T, ix.indexed / ix.total, 0) }) : "",
			spark: ""
		});
		return out;
	}, ...ngDevMode ? [{ debugName: "tiles" }] : /* istanbul ignore next */ []);
	perfCols = computed(() => {
		const G = this.T().search;
		return [
			{
				key: "clicks",
				label: G.colClicks,
				delta: true
			},
			{
				key: "impressions",
				label: G.colImpressions,
				delta: true
			},
			{
				key: "ctr",
				label: G.colCtr,
				kind: "pct",
				delta: true
			},
			{
				key: "position",
				label: G.colPosition,
				kind: "pos",
				delta: true,
				lowerBetter: true
			}
		];
	}, ...ngDevMode ? [{ debugName: "perfCols" }] : /* istanbul ignore next */ []);
	plainCols = computed(() => this.perfCols().map((c) => ({
		...c,
		delta: false
	})), ...ngDevMode ? [{ debugName: "plainCols" }] : /* istanbul ignore next */ []);
	sitemapCols = computed(() => {
		const G = this.T().search;
		return [
			{
				key: "submitted",
				label: G.colSubmitted
			},
			{
				key: "indexed",
				label: G.colIndexed
			},
			{
				key: "problems",
				label: G.colProblems
			},
			{
				key: "read",
				label: G.colRead,
				kind: "text"
			}
		];
	}, ...ngDevMode ? [{ debugName: "sitemapCols" }] : /* istanbul ignore next */ []);
	indexCols = computed(() => [{
		key: "state",
		label: this.T().search.colState,
		kind: "text"
	}, {
		key: "crawl",
		label: this.T().search.colCrawl,
		kind: "text"
	}], ...ngDevMode ? [{ debugName: "indexCols" }] : /* istanbul ignore next */ []);
	label(key, kind) {
		if (kind === "page") return {
			label: pathOf(key),
			href: key
		};
		if (kind === "country") return { label: countryName(this.T(), key) };
		if (kind === "device") return { label: this.T().searchDevices[key] ?? key };
		return { label: key };
	}
	rows(list, prev, kind = null) {
		const before = prev ? byKey(prev) : null;
		return list.map((r) => {
			const p = before?.get(r.key);
			return {
				...this.label(r.key, kind),
				values: {
					clicks: r.clicks,
					impressions: r.impressions,
					ctr: r.ctr,
					position: r.impressions ? r.position : null
				},
				prev: before ? p ? {
					clicks: p.clicks,
					impressions: p.impressions,
					ctr: p.ctr,
					position: p.position
				} : {
					clicks: 0,
					impressions: 0
				} : void 0
			};
		});
	}
	scoped = computed(() => {
		const d = this.data();
		const s = this.scope();
		const keep = (q) => s === "all" || s === "brand" === isBrand(q.key, d?.brandTerms ?? []);
		return {
			queries: (d?.queries ?? []).filter(keep),
			previous: (d?.previousQueries ?? []).filter(keep)
		};
	}, ...ngDevMode ? [{ debugName: "scoped" }] : /* istanbul ignore next */ []);
	queryRows = computed(() => this.rows(this.scoped().queries, this.scoped().previous, "query"), ...ngDevMode ? [{ debugName: "queryRows" }] : /* istanbul ignore next */ []);
	queryPageRows = computed(() => (this.data()?.queryPages ?? []).filter((r) => this.scope() === "all" || this.scope() === "brand" === isBrand(r.query, this.data().brandTerms)).map((r) => ({
		label: r.query,
		sub: pathOf(r.page),
		values: {
			clicks: r.clicks,
			impressions: r.impressions,
			ctr: r.ctr,
			position: r.position
		}
	})), ...ngDevMode ? [{ debugName: "queryPageRows" }] : /* istanbul ignore next */ []);
	pageRows = computed(() => this.rows(this.data()?.pages ?? [], this.data()?.previousPages ?? [], "page"), ...ngDevMode ? [{ debugName: "pageRows" }] : /* istanbul ignore next */ []);
	countryRows = computed(() => this.rows(this.data()?.countries ?? [], this.data()?.previousCountries ?? [], "country"), ...ngDevMode ? [{ debugName: "countryRows" }] : /* istanbul ignore next */ []);
	deviceRows = computed(() => this.rows(this.data()?.devices ?? [], this.data()?.previousDevices ?? [], "device"), ...ngDevMode ? [{ debugName: "deviceRows" }] : /* istanbul ignore next */ []);
	sitemapRows = computed(() => (this.data()?.sitemaps ?? []).map((m) => ({
		label: pathOf(m.path),
		href: m.path,
		values: {
			submitted: m.submitted,
			indexed: m.indexed,
			problems: m.errors + m.warnings,
			read: m.lastDownloaded ? this.date(m.lastDownloaded, true) : "—"
		}
	})), ...ngDevMode ? [{ debugName: "sitemapRows" }] : /* istanbul ignore next */ []);
	indexRows = computed(() => (this.indexation()?.pages ?? []).map((p) => ({
		label: pathOf(p.url),
		href: p.url,
		values: {
			state: p.state,
			crawl: p.lastCrawl ? this.date(p.lastCrawl, true) : "—"
		}
	})), ...ngDevMode ? [{ debugName: "indexRows" }] : /* istanbul ignore next */ []);
	opportunities = computed(() => {
		const d = this.data();
		if (!d) return [];
		const G = this.T().search;
		const q = this.scoped();
		const pos = {
			key: "position",
			label: G.colPosition,
			kind: "pos"
		};
		const moverCols = [
			{
				key: "impressions",
				label: G.colImpressions
			},
			{
				key: "before",
				label: G.colBefore
			},
			{
				key: "diff",
				label: G.colDiff
			},
			pos
		];
		const m = (dir) => movers(q.queries, q.previous, dir).map((r) => ({
			label: r.key,
			values: {
				impressions: r.impressions,
				before: r.before,
				diff: r.diff,
				position: r.impressions ? r.position : null
			}
		}));
		return [
			{
				id: "potential",
				title: G.potentialTitle,
				sub: G.potentialSub,
				head: G.colQuery,
				cols: [
					{
						key: "impressions",
						label: G.colImpressions
					},
					pos,
					{
						key: "clicks",
						label: G.colClicks
					},
					{
						key: "gain",
						label: G.colGain,
						tip: G.colGainTip
					}
				],
				rows: potential(q.queries).map((r) => ({
					label: r.key,
					values: {
						impressions: r.impressions,
						position: r.position,
						clicks: r.clicks,
						gain: r.gain
					}
				}))
			},
			{
				id: "up",
				title: G.upTitle,
				sub: G.upSub,
				head: G.colQuery,
				cols: moverCols,
				rows: m("up")
			},
			{
				id: "down",
				title: G.downTitle,
				sub: G.downSub,
				head: G.colQuery,
				cols: moverCols,
				rows: m("down")
			},
			{
				id: "new",
				title: G.newTitle,
				sub: G.newSub,
				head: G.colQuery,
				cols: this.plainCols(),
				rows: this.rows(newQueries(q.queries, q.previous), null, "query")
			},
			{
				id: "low-ctr",
				title: G.lowCtrTitle,
				sub: G.lowCtrSub,
				head: G.colPage,
				cols: this.plainCols(),
				rows: this.rows(lowCtrPages(d.pages), null, "page")
			},
			{
				id: "lost",
				title: G.lostTitle,
				sub: G.lostSub,
				head: G.colPage,
				cols: [
					{
						key: "before",
						label: G.colClicksBefore
					},
					{
						key: "impressions",
						label: G.colImpressions
					},
					pos
				],
				rows: lostPages(d.pages, d.previousPages).map((r) => ({
					label: pathOf(r.key),
					href: r.key,
					values: {
						before: r.before,
						impressions: r.impressions,
						position: r.impressions ? r.position : null
					}
				}))
			},
			{
				id: "cannibal",
				title: G.cannibalTitle,
				sub: G.cannibalSub,
				head: G.colQuery,
				cols: [
					{
						key: "pages",
						label: G.colPages
					},
					{
						key: "impressions",
						label: G.colImpressions
					},
					{
						key: "clicks",
						label: G.colClicks
					}
				],
				rows: cannibalization(d.queryPages).map((r) => ({
					label: r.key,
					sub: r.urls.map(pathOf).join(" · "),
					values: {
						pages: r.pages,
						impressions: r.impressions,
						clicks: r.clicks
					}
				}))
			}
		];
	}, ...ngDevMode ? [{ debugName: "opportunities" }] : /* istanbul ignore next */ []);
	csvRows() {
		const G = this.T().search;
		const out = [[
			this.T().stats.csvSection,
			this.T().stats.csvLabel,
			G.colClicks,
			G.colImpressions,
			G.colCtr,
			G.colPosition
		]];
		const d = this.data();
		const add = (section, list) => list.forEach((r) => out.push([
			section,
			r.key,
			r.clicks,
			r.impressions,
			r.ctr,
			r.position
		]));
		add(this.T().common.total, [{
			key: fill(this.T().periods.short, {
				from: d.start,
				to: d.end
			}),
			...d.totals
		}]);
		add(G.barImpressions, d.series.map((x) => ({
			key: x.date,
			...x
		})));
		add(G.queriesTitle, d.queries);
		add(G.pagesTitle, d.pages);
		add(G.countriesTitle, d.countries);
		add(G.devicesTitle, d.devices);
		return out;
	}
	exportCsv() {
		download(this.doc, `${fill(this.T().search.csvFile, { days: this.days() })}.csv`, toCsv(this.csvRows(), csvSeparator(this.T())));
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkSearchConsole,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkSearchConsole,
		isStandalone: true,
		selector: "sk-search-console",
		inputs: {
			apiUrl: {
				classPropertyName: "apiUrl",
				publicName: "apiUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			locale: {
				classPropertyName: "locale",
				publicName: "locale",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			presets: {
				classPropertyName: "presets",
				publicName: "presets",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			initialDays: {
				classPropertyName: "initialDays",
				publicName: "initialDays",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			theme: {
				classPropertyName: "theme",
				publicName: "theme",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			heading: {
				classPropertyName: "heading",
				publicName: "heading",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: { properties: { "attr.data-sk-mode": "mode()" } },
		ngImport: i0,
		template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().search.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().search.title }}</h2> }
        }
        @if (level() !== 'none') { <p class="sk-lead">{{ T().search.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (ok()) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button><button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().search.notConfiguredTitle }}</b>{{ T().search.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().search.errorTitle }}</b>{{ d.error }}
            @if (d.serviceAccount && d.property) { <p class="sk-help">{{ fill(T().search.serviceAccountHelp, { property: d.property, account: d.serviceAccount }) }}</p> }</div>
            <button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        } @else {
          <p class="sk-small">{{ fill(T().search.period, { from: date(d.start), to: date(d.end) }) }}</p>
          <sk-tile-groups [tiles]="tiles()" />
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().search.impressionsChart" [barLabel]="T().search.barImpressions" [slots]="slots()" [bar]="series('impressions')" [prev]="previous('impressions')" />
            <sk-trend-chart [texts]="T()" [title]="T().search.clicksChart" [barLabel]="T().search.barClicks" [slots]="slots()" [bar]="series('clicks')" [prev]="previous('clicks')" />
          </div>

          <section class="sk-section" id="sk-queries">
            <h2>{{ T().search.sectionQueries }} <small>{{ T().search.sectionQueriesSub }}</small></h2>
            @if (d.brandTerms.length) {
              <div class="sk-seg" role="group" [attr.aria-label]="T().search.scope">
                <button type="button" [attr.aria-pressed]="scope() === 'all'" (click)="scope.set('all')">{{ T().search.scopeAll }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'brand'" (click)="scope.set('brand')">{{ T().search.scopeBrand }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'nonbrand'" (click)="scope.set('nonbrand')">{{ T().search.scopeNonBrand }}</button>
              </div>
            }
            <div class="sk-grid">
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queriesTitle" [sub]="T().search.queriesSub" [head]="T().search.colQuery" [rows]="queryRows()" [cols]="perfCols()" [limit]="15" />
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queryPagesTitle" [sub]="T().search.queryPagesSub" [head]="T().search.colQuery" [rows]="queryPageRows()" [cols]="plainCols()" [limit]="12" />
            </div>
          </section>

          <section class="sk-section" id="sk-opportunities">
            <h2>{{ T().search.sectionOpportunities }} <small>{{ T().search.sectionOpportunitiesSub }}</small></h2>
            <div class="sk-grid">
              @for (b of opportunities(); track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="8" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-gpages">
            <h2>{{ T().search.sectionPages }} <small>{{ T().search.sectionPagesSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().search.pagesTitle" [head]="T().search.colPage" [rows]="pageRows()" [cols]="perfCols()" [limit]="15" />
          </section>

          <section class="sk-section" id="sk-gaudience">
            <h2>{{ T().search.sectionAudience }} <small>{{ T().search.sectionAudienceSub }}</small></h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.countriesTitle" [head]="T().search.colCountry" [rows]="countryRows()" [cols]="perfCols()" [limit]="10" />
              <sk-metric-table [texts]="T()" [title]="T().search.devicesTitle" [head]="T().search.colDevice" [rows]="deviceRows()" [cols]="perfCols()" />
              @if (d.appearance.length) { <sk-metric-table [texts]="T()" [title]="T().search.appearanceTitle" [sub]="T().search.appearanceSub" [head]="T().search.colType" [rows]="rows(d.appearance, null)" [cols]="plainCols()" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-index">
            <h2>{{ T().search.sectionIndex }}</h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.sitemapsTitle" [sub]="T().search.sitemapsSub" [head]="T().search.colFile" [rows]="sitemapRows()" [cols]="sitemapCols()" [limit]="5" [empty]="T().search.sitemapsEmpty" />
              @if (indexation(); as ix) {
                @if (ix.status === 'ok') {
                  <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.indexationTitle" [sub]="fill(T().search.indexationSub, { indexed: ix.indexed, total: ix.total, when: date(ix.checkedAt, true) })" [head]="T().search.colPage" [rows]="indexRows()" [cols]="indexCols()" [limit]="10" />
                } @else {
                  <div class="sk-status sk-status--err" role="alert">{{ T().search.indexationError }}</div>
                }
              } @else {
                <section class="sk-card">
                  <h2>{{ T().search.indexationTitle }}</h2>
                  <p class="sk-sub">{{ T().search.indexationHelp }}</p>
                  <p style="margin-top:.75rem"><button type="button" class="sk-btn" (click)="checkIndexation()" [disabled]="checking()">{{ checking() ? T().search.indexationRunning : T().search.indexationRun }}</button></p>
                </section>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
		isInline: true,
		styles: [
			":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
			":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
			".sk-help{margin-top:.4rem;font-size:.85rem;overflow-wrap:anywhere}.sk-help code{font-size:.85em}\n"
		],
		dependencies: [
			{
				kind: "component",
				type: SkTileGroups,
				selector: "sk-tile-groups",
				inputs: ["tiles"]
			},
			{
				kind: "component",
				type: SkMetricTable,
				selector: "sk-metric-table",
				inputs: [
					"texts",
					"title",
					"sub",
					"head",
					"rows",
					"cols",
					"limit",
					"empty",
					"exportName"
				]
			},
			{
				kind: "component",
				type: SkTrendChart,
				selector: "sk-trend-chart",
				inputs: [
					"texts",
					"title",
					"barLabel",
					"lineLabel",
					"foot",
					"slots",
					"unit",
					"bar",
					"line",
					"prev"
				]
			}
		],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkSearchConsole,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-search-console",
			imports: [
				SkTileGroups,
				SkMetricTable,
				SkTrendChart
			],
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: { "[attr.data-sk-mode]": "mode()" },
			template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().search.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().search.title }}</h2> }
        }
        @if (level() !== 'none') { <p class="sk-lead">{{ T().search.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (ok()) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button><button type="button" class="sk-btn" (click)="print()">{{ T().common.print }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().search.notConfiguredTitle }}</b>{{ T().search.notConfiguredHelp }}</div></div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().search.errorTitle }}</b>{{ d.error }}
            @if (d.serviceAccount && d.property) { <p class="sk-help">{{ fill(T().search.serviceAccountHelp, { property: d.property, account: d.serviceAccount }) }}</p> }</div>
            <button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        } @else {
          <p class="sk-small">{{ fill(T().search.period, { from: date(d.start), to: date(d.end) }) }}</p>
          <sk-tile-groups [tiles]="tiles()" />
          <div class="sk-twin">
            <sk-trend-chart [texts]="T()" [title]="T().search.impressionsChart" [barLabel]="T().search.barImpressions" [slots]="slots()" [bar]="series('impressions')" [prev]="previous('impressions')" />
            <sk-trend-chart [texts]="T()" [title]="T().search.clicksChart" [barLabel]="T().search.barClicks" [slots]="slots()" [bar]="series('clicks')" [prev]="previous('clicks')" />
          </div>

          <section class="sk-section" id="sk-queries">
            <h2>{{ T().search.sectionQueries }} <small>{{ T().search.sectionQueriesSub }}</small></h2>
            @if (d.brandTerms.length) {
              <div class="sk-seg" role="group" [attr.aria-label]="T().search.scope">
                <button type="button" [attr.aria-pressed]="scope() === 'all'" (click)="scope.set('all')">{{ T().search.scopeAll }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'brand'" (click)="scope.set('brand')">{{ T().search.scopeBrand }}</button>
                <button type="button" [attr.aria-pressed]="scope() === 'nonbrand'" (click)="scope.set('nonbrand')">{{ T().search.scopeNonBrand }}</button>
              </div>
            }
            <div class="sk-grid">
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queriesTitle" [sub]="T().search.queriesSub" [head]="T().search.colQuery" [rows]="queryRows()" [cols]="perfCols()" [limit]="15" />
              <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.queryPagesTitle" [sub]="T().search.queryPagesSub" [head]="T().search.colQuery" [rows]="queryPageRows()" [cols]="plainCols()" [limit]="12" />
            </div>
          </section>

          <section class="sk-section" id="sk-opportunities">
            <h2>{{ T().search.sectionOpportunities }} <small>{{ T().search.sectionOpportunitiesSub }}</small></h2>
            <div class="sk-grid">
              @for (b of opportunities(); track b.id) { <sk-metric-table [texts]="T()" [title]="b.title" [sub]="b.sub" [head]="b.head" [rows]="b.rows" [cols]="b.cols" [limit]="8" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-gpages">
            <h2>{{ T().search.sectionPages }} <small>{{ T().search.sectionPagesSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().search.pagesTitle" [head]="T().search.colPage" [rows]="pageRows()" [cols]="perfCols()" [limit]="15" />
          </section>

          <section class="sk-section" id="sk-gaudience">
            <h2>{{ T().search.sectionAudience }} <small>{{ T().search.sectionAudienceSub }}</small></h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.countriesTitle" [head]="T().search.colCountry" [rows]="countryRows()" [cols]="perfCols()" [limit]="10" />
              <sk-metric-table [texts]="T()" [title]="T().search.devicesTitle" [head]="T().search.colDevice" [rows]="deviceRows()" [cols]="perfCols()" />
              @if (d.appearance.length) { <sk-metric-table [texts]="T()" [title]="T().search.appearanceTitle" [sub]="T().search.appearanceSub" [head]="T().search.colType" [rows]="rows(d.appearance, null)" [cols]="plainCols()" /> }
            </div>
          </section>

          <section class="sk-section" id="sk-index">
            <h2>{{ T().search.sectionIndex }}</h2>
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().search.sitemapsTitle" [sub]="T().search.sitemapsSub" [head]="T().search.colFile" [rows]="sitemapRows()" [cols]="sitemapCols()" [limit]="5" [empty]="T().search.sitemapsEmpty" />
              @if (indexation(); as ix) {
                @if (ix.status === 'ok') {
                  <sk-metric-table class="sk-wide" [texts]="T()" [title]="T().search.indexationTitle" [sub]="fill(T().search.indexationSub, { indexed: ix.indexed, total: ix.total, when: date(ix.checkedAt, true) })" [head]="T().search.colPage" [rows]="indexRows()" [cols]="indexCols()" [limit]="10" />
                } @else {
                  <div class="sk-status sk-status--err" role="alert">{{ T().search.indexationError }}</div>
                }
              } @else {
                <section class="sk-card">
                  <h2>{{ T().search.indexationTitle }}</h2>
                  <p class="sk-sub">{{ T().search.indexationHelp }}</p>
                  <p style="margin-top:.75rem"><button type="button" class="sk-btn" (click)="checkIndexation()" [disabled]="checking()">{{ checking() ? T().search.indexationRunning : T().search.indexationRun }}</button></p>
                </section>
              }
            </div>
          </section>
        }
      }
    </div>
  `,
			styles: [
				":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
				":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
				".sk-help{margin-top:.4rem;font-size:.85rem;overflow-wrap:anywhere}.sk-help code{font-size:.85em}\n"
			]
		}]
	}],
	ctorParameters: () => [],
	propDecorators: {
		apiUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "apiUrl",
				required: false
			}]
		}],
		locale: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "locale",
				required: false
			}]
		}],
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		presets: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "presets",
				required: false
			}]
		}],
		initialDays: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "initialDays",
				required: false
			}]
		}],
		theme: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "theme",
				required: false
			}]
		}],
		heading: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "heading",
				required: false
			}]
		}]
	}
});
var SkYoutube = class SkYoutube {
	api = inject(StatsKitApi);
	doc = inject(DOCUMENT);
	options = injectOptions();
	apiUrl = input(null, ...ngDevMode ? [{ debugName: "apiUrl" }] : /* istanbul ignore next */ []);
	locale = input(null, ...ngDevMode ? [{ debugName: "locale" }] : /* istanbul ignore next */ []);
	texts = input(null, ...ngDevMode ? [{ debugName: "texts" }] : /* istanbul ignore next */ []);
	presets = input([
		7,
		28,
		90
	], ...ngDevMode ? [{ debugName: "presets" }] : /* istanbul ignore next */ []);
	initialDays = input(28, ...ngDevMode ? [{ debugName: "initialDays" }] : /* istanbul ignore next */ []);
	theme = input("auto", ...ngDevMode ? [{ debugName: "theme" }] : /* istanbul ignore next */ []);
	heading = input(null, ...ngDevMode ? [{ debugName: "heading" }] : /* istanbul ignore next */ []);
	mode = resolvedMode(this.theme);
	T = computed(() => resolveTexts(this.options, this.locale(), this.texts()), ...ngDevMode ? [{ debugName: "T" }] : /* istanbul ignore next */ []);
	fill = fill;
	base = computed(() => this.apiUrl() || this.options.apiUrl, ...ngDevMode ? [{ debugName: "base" }] : /* istanbul ignore next */ []);
	level = computed(() => this.heading() ?? this.options.heading ?? "h1", ...ngDevMode ? [{ debugName: "level" }] : /* istanbul ignore next */ []);
	days = signal(28, ...ngDevMode ? [{ debugName: "days" }] : /* istanbul ignore next */ []);
	loading = signal(true, ...ngDevMode ? [{ debugName: "loading" }] : /* istanbul ignore next */ []);
	failed = signal(false, ...ngDevMode ? [{ debugName: "failed" }] : /* istanbul ignore next */ []);
	data = signal(null, ...ngDevMode ? [{ debugName: "data" }] : /* istanbul ignore next */ []);
	constructor() {
		loadOnSource(this.base, (first) => {
			if (first) this.days.set(this.initialDays());
			else this.data.set(null);
			this.load();
		});
	}
	choose(days) {
		this.days.set(days);
		this.load();
	}
	async load() {
		const base = this.base();
		this.loading.set(true);
		this.failed.set(false);
		try {
			const d = await this.api.get(base, "/youtube", { days: this.days() });
			if (base !== this.base()) return;
			this.data.set(d);
		} catch {
			if (base !== this.base()) return;
			this.data.set(null);
			this.failed.set(true);
		}
		this.loading.set(false);
	}
	fmt(v, d = 0) {
		return formatNumber(this.T(), v, d);
	}
	dateOf = (d) => d.date;
	period = computed(() => lastDays(this.data()?.series ?? [], this.data()?.days ?? this.days()), ...ngDevMode ? [{ debugName: "period" }] : /* istanbul ignore next */ []);
	bars(k) {
		return this.period().current.map((x) => x[k]);
	}
	prevBars(k) {
		return this.period().before.map((x) => x[k]);
	}
	tiles = computed(() => {
		const d = this.data(), c = d?.channel;
		if (!d || !c) return [];
		const T = this.T(), Y = T.youtube;
		const t = d.totals, b = d.previous;
		const C = Y.groupChannel, P = Y.groupPeriod;
		const spark = (k) => sparkPath(this.bars(k));
		return [
			{
				id: "subs",
				group: C,
				label: Y.subscribers,
				value: c.subscribers === null ? T.common.hidden : this.fmt(c.subscribers),
				change: null,
				sub: Y.subscribersSub,
				spark: ""
			},
			{
				id: "total",
				group: C,
				label: Y.totalViews,
				value: this.fmt(c.views),
				change: null,
				sub: Y.sinceCreation,
				spark: ""
			},
			{
				id: "videos",
				group: C,
				label: Y.videos,
				value: this.fmt(d.videos.length),
				change: null,
				sub: Y.videosSub,
				spark: ""
			},
			{
				id: "views",
				group: P,
				label: Y.views,
				value: this.fmt(t.views),
				change: delta(T, t.views, b.views),
				sub: fill(T.common.perDay, { n: this.fmt(t.views / Math.max(1, d.days), 1) }),
				spark: spark("views")
			},
			{
				id: "minutes",
				group: P,
				label: Y.minutes,
				value: this.fmt(t.minutes),
				change: delta(T, t.minutes, b.minutes),
				sub: fill(Y.hoursSub, { n: this.fmt(t.minutes / 60, 1) }),
				spark: spark("minutes")
			},
			{
				id: "avg",
				group: P,
				label: Y.avgView,
				value: formatDuration(T, t.averageViewDuration),
				change: b.views ? gap(T, t.averageViewDuration, b.averageViewDuration, false, 0, "seconds") : null,
				sub: Y.perView,
				spark: ""
			},
			{
				id: "gained",
				group: P,
				label: Y.gained,
				value: this.fmt(t.gained),
				change: delta(T, t.gained, b.gained),
				sub: fill(Y.gainedSub, {
					lost: this.fmt(t.lost),
					balance: formatNumber(T, t.gained - t.lost, 0, true)
				}),
				spark: ""
			}
		];
	}, ...ngDevMode ? [{ debugName: "tiles" }] : /* istanbul ignore next */ []);
	siteTiles = computed(() => {
		const s = this.data()?.site;
		if (!s) return [];
		const T = this.T(), Y = T.youtube, G = "";
		const n = (v) => v === null ? "—" : this.fmt(v);
		const out = [
			{
				id: "visits",
				group: G,
				label: Y.siteVisits,
				value: n(s.visits),
				change: s.visits === null ? null : delta(T, s.visits, s.previousVisits),
				sub: Y.siteVisitsSub,
				spark: ""
			},
			{
				id: "visitors",
				group: G,
				label: Y.siteVisitors,
				value: n(s.visitors),
				change: null,
				sub: Y.siteVisitorsSub,
				spark: ""
			},
			{
				id: "referred",
				group: G,
				label: Y.referred,
				value: n(s.referred),
				change: null,
				sub: Y.referredSub,
				spark: ""
			}
		];
		if (s.requests !== null) out.push({
			id: "requests",
			group: G,
			label: Y.requests,
			value: this.fmt(s.requests),
			change: delta(T, s.requests, s.previousRequests),
			sub: Y.requestsSub,
			spark: ""
		});
		return out;
	}, ...ngDevMode ? [{ debugName: "siteTiles" }] : /* istanbul ignore next */ []);
	viewCols = computed(() => [{
		key: "v",
		label: this.T().youtube.colViews
	}], ...ngDevMode ? [{ debugName: "viewCols" }] : /* istanbul ignore next */ []);
	requestCols = computed(() => [{
		key: "v",
		label: this.T().youtube.colRequests
	}], ...ngDevMode ? [{ debugName: "requestCols" }] : /* istanbul ignore next */ []);
	trafficCols = computed(() => [{
		key: "views",
		label: this.T().youtube.colViews
	}, {
		key: "minutes",
		label: this.T().youtube.colMinutes
	}], ...ngDevMode ? [{ debugName: "trafficCols" }] : /* istanbul ignore next */ []);
	videoCols = computed(() => {
		const Y = this.T().youtube;
		return [
			{
				key: "views",
				label: Y.colViews
			},
			{
				key: "minutes",
				label: Y.colMinutes
			},
			{
				key: "pct",
				label: Y.colAvgPct,
				kind: "pct"
			},
			{
				key: "duration",
				label: Y.colDuration,
				kind: "dur"
			},
			{
				key: "likes",
				label: Y.colLikes
			},
			{
				key: "comments",
				label: Y.colComments
			},
			{
				key: "published",
				label: Y.colPublished,
				kind: "text"
			}
		];
	}, ...ngDevMode ? [{ debugName: "videoCols" }] : /* istanbul ignore next */ []);
	landingRows = computed(() => (this.data()?.site?.landing ?? []).map((i) => ({
		label: i.label ?? i.key,
		values: { v: i.value }
	})), ...ngDevMode ? [{ debugName: "landingRows" }] : /* istanbul ignore next */ []);
	subjectRows = computed(() => (this.data()?.site?.requestsBySubject ?? []).map((i) => ({
		label: i.label ?? (i.key || this.T().common.notSpecified),
		values: { v: i.value }
	})), ...ngDevMode ? [{ debugName: "subjectRows" }] : /* istanbul ignore next */ []);
	trafficRows = computed(() => (this.data()?.traffic ?? []).map((t) => ({
		label: this.T().youtubeTraffic[t.source] ?? t.source,
		values: {
			views: t.views,
			minutes: t.minutes
		}
	})), ...ngDevMode ? [{ debugName: "trafficRows" }] : /* istanbul ignore next */ []);
	videoRows = computed(() => (this.data()?.videos ?? []).map((v) => ({
		label: v.label ?? v.title,
		sub: [v.label ? v.title : "", v.visibility !== "public" ? this.T().youtube.visibility[v.visibility] ?? v.visibility : ""].filter(Boolean).join(" · ") || void 0,
		href: v.url,
		values: {
			views: v.views,
			minutes: v.minutes,
			pct: v.averageViewPercentage === null ? null : v.averageViewPercentage / 100,
			duration: v.duration,
			likes: v.likes,
			comments: v.comments,
			published: v.publishedAt ? shortDate(this.T(), v.publishedAt, "UTC", true) : "—"
		}
	})), ...ngDevMode ? [{ debugName: "videoRows" }] : /* istanbul ignore next */ []);
	csvRows() {
		const Y = this.T().youtube;
		const d = this.data();
		return [
			[
				Y.colVideo,
				Y.colViews,
				Y.colMinutes,
				Y.colAvgPct,
				Y.colDuration,
				Y.colLikes,
				Y.colComments,
				Y.colPublished
			],
			...d.videos.map((v) => [
				v.title,
				v.views,
				v.minutes,
				v.averageViewPercentage,
				v.duration,
				v.likes,
				v.comments,
				v.publishedAt
			]),
			[],
			[
				Y.colDate,
				Y.views,
				Y.minutes,
				Y.gained,
				Y.colLost
			],
			...d.series.map((x) => [
				x.date,
				x.views,
				x.minutes,
				x.gained,
				x.lost
			])
		];
	}
	exportCsv() {
		download(this.doc, `${fill(this.T().youtube.csvFile, { days: this.days() })}.csv`, toCsv(this.csvRows(), csvSeparator(this.T())));
	}
	static ɵfac = i0.ɵɵngDeclareFactory({
		minVersion: "12.0.0",
		version: "22.3.0",
		ngImport: i0,
		type: SkYoutube,
		deps: [],
		target: i0.ɵɵFactoryTarget.Component
	});
	static ɵcmp = i0.ɵɵngDeclareComponent({
		minVersion: "17.0.0",
		version: "22.3.0",
		type: SkYoutube,
		isStandalone: true,
		selector: "sk-youtube",
		inputs: {
			apiUrl: {
				classPropertyName: "apiUrl",
				publicName: "apiUrl",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			locale: {
				classPropertyName: "locale",
				publicName: "locale",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			texts: {
				classPropertyName: "texts",
				publicName: "texts",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			presets: {
				classPropertyName: "presets",
				publicName: "presets",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			initialDays: {
				classPropertyName: "initialDays",
				publicName: "initialDays",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			theme: {
				classPropertyName: "theme",
				publicName: "theme",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			},
			heading: {
				classPropertyName: "heading",
				publicName: "heading",
				isSignal: true,
				isRequired: false,
				transformFunction: null
			}
		},
		host: { properties: { "attr.data-sk-mode": "mode()" } },
		ngImport: i0,
		template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().youtube.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().youtube.title }}</h2> }
        }
        @if (level() !== 'none') { <p class="sk-lead">{{ T().youtube.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (data()?.channel) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().youtube.notConfiguredTitle }}</b>{{ T().youtube.notConfiguredHelp }}</div>@if (d.channelUrl) { <a class="sk-btn" [href]="d.channelUrl" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a> }</div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().youtube.errorTitle }}</b>{{ d.error }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        }
        @if (d.channel; as c) {
          <section class="sk-card sk-channel">
            @if (c.thumbnail) { <img [src]="c.thumbnail" alt="" /> }
            <div><h2>{{ c.title }}</h2>@if (c.handle) { <p class="sk-sub">{{ c.handle }}</p> }</div>
            <div class="sk-group">
              <a class="sk-btn" [href]="c.url" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a>
              <a class="sk-btn" [href]="c.studioUrl" target="_blank" rel="noopener">{{ T().youtube.openStudio }}</a>
            </div>
          </section>
          @if (d.analyticsError) { <p class="sk-status sk-status--warn" role="status">{{ fill(T().youtube.analyticsError, { error: d.analyticsError }) }}</p> }
          <sk-tile-groups [tiles]="tiles()" />
        }
        @if (d.site) {
          <section class="sk-section" id="sk-yt-site">
            <h2>{{ T().youtube.sectionSite }} <small>{{ T().youtube.sectionSiteSub }}</small></h2>
            <sk-tile-groups [tiles]="siteTiles()" />
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().youtube.landingTitle" [sub]="T().youtube.landingSub" [head]="T().youtube.colPage" [rows]="landingRows()" [cols]="viewCols()" [limit]="8" [empty]="T().youtube.landingEmpty" />
              @if (d.site.requests !== null) { <sk-metric-table [texts]="T()" [title]="T().youtube.subjectsTitle" [head]="T().youtube.colSubject" [rows]="subjectRows()" [cols]="requestCols()" [limit]="8" [empty]="T().youtube.subjectsEmpty" /> }
            </div>
          </section>
        }
        @if (d.channel) {
          <section class="sk-section" id="sk-yt-trend">
            <h2>{{ T().youtube.sectionTrend }} <small>{{ T().youtube.sectionTrendSub }}</small></h2>
            <div class="sk-twin">
              <sk-trend-chart [texts]="T()" [title]="T().youtube.viewsChart" [barLabel]="T().youtube.views" [slots]="period().current.map(dateOf)" [bar]="bars('views')" [prev]="prevBars('views')" />
              <sk-trend-chart [texts]="T()" [title]="T().youtube.minutesChart" [barLabel]="T().youtube.minutes" [slots]="period().current.map(dateOf)" [bar]="bars('minutes')" [prev]="prevBars('minutes')" />
            </div>
            <sk-metric-table [texts]="T()" [title]="T().youtube.trafficTitle" [sub]="T().youtube.trafficSub" [head]="T().youtube.colSource" [rows]="trafficRows()" [cols]="trafficCols()" />
          </section>
          <section class="sk-section" id="sk-yt-videos">
            <h2>{{ T().youtube.sectionVideos }} <small>{{ T().youtube.sectionVideosSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().youtube.videos" [head]="T().youtube.colVideo" [rows]="videoRows()" [cols]="videoCols()" [limit]="20" [empty]="T().youtube.videosEmpty" />
          </section>
        }
      }
    </div>
  `,
		isInline: true,
		styles: [
			":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
			":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
			".sk-channel{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem}.sk-channel img{width:56px;height:56px;border-radius:50%;object-fit:cover;background:var(--k-badge)}.sk-channel h2{font-size:1.15rem}.sk-channel>div{min-width:0}.sk-channel .sk-group{margin-left:auto}\n"
		],
		dependencies: [
			{
				kind: "component",
				type: SkTileGroups,
				selector: "sk-tile-groups",
				inputs: ["tiles"]
			},
			{
				kind: "component",
				type: SkMetricTable,
				selector: "sk-metric-table",
				inputs: [
					"texts",
					"title",
					"sub",
					"head",
					"rows",
					"cols",
					"limit",
					"empty",
					"exportName"
				]
			},
			{
				kind: "component",
				type: SkTrendChart,
				selector: "sk-trend-chart",
				inputs: [
					"texts",
					"title",
					"barLabel",
					"lineLabel",
					"foot",
					"slots",
					"unit",
					"bar",
					"line",
					"prev"
				]
			}
		],
		changeDetection: i0.ChangeDetectionStrategy.OnPush
	});
};
i0.ɵɵngDeclareClassMetadata({
	minVersion: "12.0.0",
	version: "22.3.0",
	ngImport: i0,
	type: SkYoutube,
	decorators: [{
		type: Component,
		args: [{
			selector: "sk-youtube",
			imports: [
				SkTileGroups,
				SkMetricTable,
				SkTrendChart
			],
			changeDetection: ChangeDetectionStrategy.OnPush,
			host: { "[attr.data-sk-mode]": "mode()" },
			template: `
    <div class="sk-page">
      <header class="sk-head">
        @switch (level()) {
          @case ('h1') { <h1 class="sk-title">{{ T().youtube.title }}</h1> }
          @case ('h2') { <h2 class="sk-title">{{ T().youtube.title }}</h2> }
        }
        @if (level() !== 'none') { <p class="sk-lead">{{ T().youtube.lead }}</p> }
        <div class="sk-toolbar">
          <div class="sk-seg" role="group" [attr.aria-label]="T().periods.label">
            @for (p of presets(); track p) { <button type="button" [attr.aria-pressed]="days() === p" (click)="choose(p)">{{ fill(T().periods.days, { n: p }) }}</button> }
          </div>
          @if (data()?.channel) { <div class="sk-group"><button type="button" class="sk-btn" (click)="exportCsv()">{{ T().common.exportCsv }}</button></div> }
        </div>
      </header>

      @if (loading()) {
        <p class="sk-card sk-empty" role="status">{{ T().common.loading }}</p>
      } @else if (failed()) {
        <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().stats.unreachableTitle }}</b>{{ T().stats.unreachableHelp }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
      } @else if (data(); as d) {
        @if (d.status === 'not-configured') {
          <div class="sk-status sk-status--warn" role="alert"><div><b>{{ T().youtube.notConfiguredTitle }}</b>{{ T().youtube.notConfiguredHelp }}</div>@if (d.channelUrl) { <a class="sk-btn" [href]="d.channelUrl" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a> }</div>
        } @else if (d.status === 'error') {
          <div class="sk-status sk-status--err" role="alert"><div><b>{{ T().youtube.errorTitle }}</b>{{ d.error }}</div><button type="button" class="sk-btn" (click)="load()">{{ T().common.retry }}</button></div>
        }
        @if (d.channel; as c) {
          <section class="sk-card sk-channel">
            @if (c.thumbnail) { <img [src]="c.thumbnail" alt="" /> }
            <div><h2>{{ c.title }}</h2>@if (c.handle) { <p class="sk-sub">{{ c.handle }}</p> }</div>
            <div class="sk-group">
              <a class="sk-btn" [href]="c.url" target="_blank" rel="noopener">{{ T().youtube.openChannel }}</a>
              <a class="sk-btn" [href]="c.studioUrl" target="_blank" rel="noopener">{{ T().youtube.openStudio }}</a>
            </div>
          </section>
          @if (d.analyticsError) { <p class="sk-status sk-status--warn" role="status">{{ fill(T().youtube.analyticsError, { error: d.analyticsError }) }}</p> }
          <sk-tile-groups [tiles]="tiles()" />
        }
        @if (d.site) {
          <section class="sk-section" id="sk-yt-site">
            <h2>{{ T().youtube.sectionSite }} <small>{{ T().youtube.sectionSiteSub }}</small></h2>
            <sk-tile-groups [tiles]="siteTiles()" />
            <div class="sk-grid">
              <sk-metric-table [texts]="T()" [title]="T().youtube.landingTitle" [sub]="T().youtube.landingSub" [head]="T().youtube.colPage" [rows]="landingRows()" [cols]="viewCols()" [limit]="8" [empty]="T().youtube.landingEmpty" />
              @if (d.site.requests !== null) { <sk-metric-table [texts]="T()" [title]="T().youtube.subjectsTitle" [head]="T().youtube.colSubject" [rows]="subjectRows()" [cols]="requestCols()" [limit]="8" [empty]="T().youtube.subjectsEmpty" /> }
            </div>
          </section>
        }
        @if (d.channel) {
          <section class="sk-section" id="sk-yt-trend">
            <h2>{{ T().youtube.sectionTrend }} <small>{{ T().youtube.sectionTrendSub }}</small></h2>
            <div class="sk-twin">
              <sk-trend-chart [texts]="T()" [title]="T().youtube.viewsChart" [barLabel]="T().youtube.views" [slots]="period().current.map(dateOf)" [bar]="bars('views')" [prev]="prevBars('views')" />
              <sk-trend-chart [texts]="T()" [title]="T().youtube.minutesChart" [barLabel]="T().youtube.minutes" [slots]="period().current.map(dateOf)" [bar]="bars('minutes')" [prev]="prevBars('minutes')" />
            </div>
            <sk-metric-table [texts]="T()" [title]="T().youtube.trafficTitle" [sub]="T().youtube.trafficSub" [head]="T().youtube.colSource" [rows]="trafficRows()" [cols]="trafficCols()" />
          </section>
          <section class="sk-section" id="sk-yt-videos">
            <h2>{{ T().youtube.sectionVideos }} <small>{{ T().youtube.sectionVideosSub }}</small></h2>
            <sk-metric-table [texts]="T()" [title]="T().youtube.videos" [head]="T().youtube.colVideo" [rows]="videoRows()" [cols]="videoCols()" [limit]="20" [empty]="T().youtube.videosEmpty" />
          </section>
        }
      }
    </div>
  `,
			styles: [
				":host{--_card:#ffffff;--_bg:transparent;--_ink:#141a2a;--_ink2:#343c50;--_muted:#566073;--_line:#e1e5ee;--_line2:#c3c9d6;--_brand:#2f5bd3;--_brand-ink:#ffffff;--_c1:#2f5bd3;--_c1h:#1f43a8;--_c2:#c2410c;--_c3:#7c8598;--_up:#0a6e53;--_up-soft:#e2f3ec;--_down:#b3261e;--_down-soft:#fbe8e6;--_warn:#7c5100;--_warn-soft:#fff2d4;--_hover:#f3f5fa;--_track:#e8ebf2;--_input:#ffffff;--_badge:#eef1f6;--_map-sea:#f3f5fa;--_map-land:#dde2ec;--_map-border:#ffffff;--_map-lo:#bccaf2;--_map-hi:#1d3c9c;--_shadow:0 1px 2px rgb(20 26 42 / 6%), 0 4px 14px -6px rgb(20 26 42 / 10%);color-scheme:light;--k-card: var(--sk-card, var(--_card));--k-bg: var(--sk-bg, var(--_bg));--k-ink: var(--sk-ink, var(--_ink));--k-ink2: var(--sk-ink-2, var(--_ink2));--k-muted: var(--sk-muted, var(--_muted));--k-line: var(--sk-line, var(--_line));--k-line2: var(--sk-line-strong, var(--_line2));--k-brand: var(--sk-brand, var(--_brand));--k-brand-ink: var(--sk-on-brand, var(--_brand-ink));--k-c1: var(--sk-chart-1, var(--_c1));--k-c1h: var(--sk-chart-1-hover, var(--_c1h));--k-c2: var(--sk-chart-2, var(--_c2));--k-c3: var(--sk-chart-3, var(--_c3));--k-up: var(--sk-up, var(--_up));--k-up-soft: var(--sk-up-soft, var(--_up-soft));--k-down: var(--sk-down, var(--_down));--k-down-soft: var(--sk-down-soft, var(--_down-soft));--k-warn: var(--sk-warn, var(--_warn));--k-warn-soft: var(--sk-warn-soft, var(--_warn-soft));--k-hover: var(--sk-hover, var(--_hover));--k-track: var(--sk-bar-track, var(--_track));--k-input: var(--sk-input, var(--_input));--k-badge: var(--sk-badge, var(--_badge));--k-map-sea: var(--sk-map-sea, var(--_map-sea));--k-map-land: var(--sk-map-land, var(--_map-land));--k-map-border: var(--sk-map-border, var(--_map-border));--k-map-lo: var(--sk-map-lo, var(--_map-lo));--k-map-hi: var(--sk-map-hi, var(--_map-hi));--k-shadow: var(--sk-shadow, var(--_shadow));--k-radius: var(--sk-radius, 12px);--k-gap: var(--sk-gap, 12px);--k-font: var(--sk-font, inherit);--k-w-strong: var(--sk-weight-strong, 700);--k-w-label: var(--sk-weight-label, 600);--k-w-control: var(--sk-weight-control, 600);--k-w-row: var(--sk-weight-row, 500)}:host-context([data-sk-mode=dark]){--_card:#171c27;--_ink:#e9ecf4;--_ink2:#c8cedb;--_muted:#a5adbf;--_line:#2b3242;--_line2:#414a5e;--_brand:#8fb0ff;--_brand-ink:#0e1424;--_c1:#7d9ef7;--_c1h:#a9c0ff;--_c2:#ff9b62;--_c3:#8d96aa;--_up:#6fdcb1;--_up-soft:#143a2e;--_down:#ff9f95;--_down-soft:#43201d;--_warn:#ffd27a;--_warn-soft:#3d3014;--_hover:#1f2634;--_track:#283042;--_input:#11151e;--_badge:#252c3b;--_map-sea:#121722;--_map-land:#2a3140;--_map-border:#171c27;--_map-lo:#2c437f;--_map-hi:#9ab6ff;--_shadow:0 1px 2px rgb(0 0 0 / 30%);color-scheme:dark}\n",
				":host{display:block;width:100%;min-width:0;font-family:var(--k-font);color:var(--k-ink);background:var(--k-bg);line-height:1.45}*{box-sizing:border-box}h1,h2,h3,p{margin:0}h1,h2,h3{overflow-wrap:anywhere;font-weight:var(--k-w-strong)}b,strong{font-weight:var(--k-w-strong)}.sk-page{display:grid;gap:calc(var(--k-gap) * 1.33);min-width:0}.sk-head{display:grid;gap:.5rem}.sk-head .sk-title{font-size:1.6rem;line-height:1.2;letter-spacing:-.01em}.sk-lead{color:var(--k-muted);font-size:.95rem;max-width:70ch;overflow-wrap:anywhere}.sk-toolbar{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.5rem .75rem}.sk-group{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem}.sk-card{min-width:0;background:var(--k-card);border:1px solid var(--k-line);border-radius:var(--k-radius);box-shadow:var(--k-shadow);padding:min(1rem,16px)}.sk-card h2{font-size:1rem}.sk-sub{margin-top:.2rem;font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-btn{display:inline-flex;align-items:center;justify-content:center;gap:.4rem;max-width:100%;min-height:36px;padding:.35rem min(.8rem,13px);text-align:center;overflow-wrap:anywhere;font:inherit;font-size:.875rem;font-weight:var(--k-w-control);color:var(--k-ink);background:var(--k-card);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px);cursor:pointer;text-decoration:none}.sk-btn:hover{border-color:var(--k-brand);color:var(--k-brand)}.sk-btn:disabled{opacity:.6;cursor:default}.sk-btn--primary{background:var(--k-brand);border-color:var(--k-brand);color:var(--k-brand-ink)}.sk-btn--primary:hover{color:var(--k-brand-ink);filter:brightness(1.08)}.sk-btn:focus-visible,.sk-seg button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--k-brand);outline-offset:2px}.sk-seg{display:inline-flex;flex-wrap:wrap;max-width:100%;padding:3px;gap:2px;background:var(--k-badge);border-radius:calc(var(--sk-radius-control, 8px) + 2px)}.sk-seg button{max-width:100%;min-height:32px;padding:.25rem min(.75rem,12px);overflow-wrap:anywhere;font:inherit;font-size:.85rem;font-weight:var(--k-w-control);color:var(--k-ink2);background:transparent;border:0;border-radius:var(--sk-radius-control, 8px);cursor:pointer}.sk-seg button[aria-pressed=true]{background:var(--k-card);color:var(--k-ink);box-shadow:0 1px 2px #00000026}.sk-field{display:inline-flex;align-items:center;gap:.35rem;font-size:.85rem;color:var(--k-ink2)}.sk-field input,.sk-field select{min-height:34px;padding:.2rem .45rem;font:inherit;color:var(--k-ink);background:var(--k-input);border:1px solid var(--k-line2);border-radius:var(--sk-radius-control, 8px)}.sk-status{display:flex;flex-wrap:wrap;gap:.6rem;align-items:flex-start;padding:min(.75rem,12px) min(1rem,16px);overflow-wrap:anywhere;border-radius:var(--k-radius);font-size:.9rem;border:1px solid var(--k-line);background:var(--k-card)}.sk-status--warn{background:var(--k-warn-soft);color:var(--k-warn);border-color:transparent}.sk-status--err{background:var(--k-down-soft);color:var(--k-down);border-color:transparent}.sk-status--ok{background:var(--k-up-soft);color:var(--k-up);border-color:transparent}.sk-status>div{flex:1 1 12rem;min-width:0}.sk-status b{display:block}.sk-empty{padding:min(1.5rem,24px) min(1rem,16px);overflow-wrap:anywhere;text-align:center;color:var(--k-muted)}.sk-empty b{display:block;color:var(--k-ink);margin-bottom:.25rem}.sk-section{display:grid;gap:var(--k-gap);scroll-margin-top:1rem}.sk-section>h2{font-size:1.15rem;display:flex;flex-wrap:wrap;align-items:baseline;gap:.25rem .6rem}.sk-section>h2 small{font-size:.8rem;font-weight:400;color:var(--k-muted)}.sk-grid{container-type:inline-size;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(26rem,100%),1fr));gap:var(--k-gap);align-items:start;grid-auto-flow:dense}@container (min-width: 53rem){.sk-grid>.sk-wide{grid-column:span 2}}.sk-twin{display:grid;grid-template-columns:minmax(0,1.7fr) minmax(0,1fr);gap:var(--k-gap);align-items:stretch}@media(max-width:1100px){.sk-twin{grid-template-columns:minmax(0,1fr)}}.sk-jump{display:flex;flex-wrap:wrap;gap:.25rem .9rem;font-size:.85rem}.sk-jump a{color:var(--k-brand);font-weight:var(--k-w-control);text-decoration:none;padding:.35rem 0}.sk-jump a:hover{text-decoration:underline}.sk-small{font-size:.8rem;color:var(--k-muted);overflow-wrap:anywhere}.sk-sr{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}.sk-field{flex-wrap:wrap;max-width:100%}.sk-field input,.sk-field select{max-width:100%}@media(max-width:700px){.sk-head .sk-title{font-size:1.35rem}}@media(max-width:760px){.sk-btn,.sk-seg button,.sk-field input,.sk-field select,.sk-pause{min-width:48px;min-height:48px}.sk-jump a{display:inline-flex;align-items:center;min-height:48px;min-width:48px;padding-block:0}}@media print{.sk-toolbar,.sk-jump,.sk-noprint{display:none!important}.sk-card{box-shadow:none;break-inside:avoid}}\n",
				".sk-channel{display:flex;flex-wrap:wrap;align-items:center;gap:.75rem 1rem}.sk-channel img{width:56px;height:56px;border-radius:50%;object-fit:cover;background:var(--k-badge)}.sk-channel h2{font-size:1.15rem}.sk-channel>div{min-width:0}.sk-channel .sk-group{margin-left:auto}\n"
			]
		}]
	}],
	ctorParameters: () => [],
	propDecorators: {
		apiUrl: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "apiUrl",
				required: false
			}]
		}],
		locale: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "locale",
				required: false
			}]
		}],
		texts: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "texts",
				required: false
			}]
		}],
		presets: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "presets",
				required: false
			}]
		}],
		initialDays: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "initialDays",
				required: false
			}]
		}],
		theme: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "theme",
				required: false
			}]
		}],
		heading: [{
			type: i0.Input,
			args: [{
				isSignal: true,
				alias: "heading",
				required: false
			}]
		}]
	}
});
export { LAYOUT, STATS_KIT_OPTIONS, SkHeatmap, SkMetricTable, SkSearchConsole, SkStatistics, SkStatistiques, SkTile, SkTileGroups, SkTrendChart, SkWorldMap, SkYoutube, StatsKitApi, TOKENS, formatCell, provideStatsKit, resolveTexts };

//# sourceMappingURL=stats-kit-angular.mjs.map