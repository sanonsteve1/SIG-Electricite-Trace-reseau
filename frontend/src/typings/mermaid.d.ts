declare module 'mermaid' {
	interface MermaidConfig {
		startOnLoad?: boolean;
		securityLevel?: string;
	}
	interface RenderResult {
		svg: string;
		bindFunctions?: (element: HTMLElement) => void;
	}
	function initialize(config: MermaidConfig): void;
	function render(id: string, code: string): Promise<RenderResult>;
	const mermaid: {
		initialize: typeof initialize;
		render: typeof render;
	};
	export default mermaid;
}
