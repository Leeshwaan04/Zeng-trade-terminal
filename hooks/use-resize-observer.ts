import { useEffect, useRef, useState } from 'react';

export function useResizeObserver(ref: React.RefObject<HTMLElement | null>) {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    const observer = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (!ref.current) return;

        observer.current = new ResizeObserver((entries) => {
            const { width, height } = entries[0].contentRect;
            setDimensions({ width, height });
        });

        observer.current.observe(ref.current);

        return () => {
            if (observer.current) {
                observer.current.disconnect();
            }
        };
    }, [ref]);

    return dimensions;
}
