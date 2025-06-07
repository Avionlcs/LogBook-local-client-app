declare module 'quagga' {
    const Quagga: {
        init: (config: any, callback: (err: any) => void) => void;
        start: () => void;
        stop: () => void;
        onDetected: (callback: (result: any) => void) => void;
        onProcessed?: (callback: (result: any) => void) => void;
        canvas?: {
            ctx: {
                overlay: CanvasRenderingContext2D;
            };
            dom: {
                overlay: HTMLCanvasElement;
            };
        };
        ImageDebug?: {
            drawPath: (path: any, coords: any, ctx: CanvasRenderingContext2D, options: any) => void;
        };
    };
    export default Quagga;
}