declare module 'wellknown' {
	export function parse(wkt: string): object | null;
	export function stringify(geom: object): string;
}
