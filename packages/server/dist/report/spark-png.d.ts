type RGB = [number, number, number];
/** Size of the images, in pixels (shown at half size: sharp on high-density screens). */
export declare const SPARK_WIDTH = 264;
export declare const SPARK_HEIGHT = 56;
/**
 * Trend of a series: line, light area below it, dot on the last value. `null` with fewer than two values or nothing above
 * zero (no line to draw).
 */
export declare function renderSparkline(values: number[], color: RGB, width?: number, height?: number): Buffer | null;
/**
 * This period against the previous one, for a figure without a series (visits, bounce rate, goals): two rounded bars, the
 * previous period above in `before`, this period below in `now`. `null` if both are zero.
 */
export declare function renderCompare(previous: number, current: number, now: RGB, before: RGB, width?: number, height?: number): Buffer | null;
export {};
