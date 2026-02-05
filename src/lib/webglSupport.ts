
export type WebGLSupportResult = {
	available: boolean;
	webgl2: boolean;
	reason?: string;
};

export function detectWebGLSupport(): WebGLSupportResult {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return { available: false, webgl2: false, reason: 'not_in_browser' };
	}

	try {
		if (typeof (window as any).WebGLRenderingContext === 'undefined') {
			return { available: false, webgl2: false, reason: 'no_WebGLRenderingContext' };
		}

		const canvas = document.createElement('canvas');
		const webgl2 = !!canvas.getContext('webgl2');
		const webgl1 = !!canvas.getContext('webgl');

		if (webgl2 || webgl1) {
			return { available: true, webgl2 };
		}

		return { available: false, webgl2: false, reason: 'context_creation_failed' };
	} catch {
		return { available: false, webgl2: false, reason: 'exception' };
	}
}

