/*
 * Data contract between the server and the components: what the library routes return (or a server written in another language,
 * .NET for example) and what the components display. Everything is plain JSON: numbers, strings, arrays.
 * The JSON schema (schema/contract.schema.json) is generated from this file; docs/CONTRACT.md describes it field by field.
 *
 * Conventions:
 *  - instants: ISO 8601 strings in UTC ("2026-11-16T08:00:00.000Z");
 *  - days: "YYYY-MM-DD"; hourly slots: "YYYY-MM-DDTHH", always in the time zone of the period (`range.timeZone`);
 *  - durations in seconds; rates between 0 and 1;
 *  - an unknown value is `null` (never missing), an empty list is `[]`.
 */
export {};
