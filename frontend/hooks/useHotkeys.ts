"use client";

import { useEffect } from "react";

type KeyCombo = {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
};

export const useHotkeys = (
    combo: KeyCombo,
    callback: (e: KeyboardEvent) => void,
    deps: any[] = []
) => {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key.toLowerCase() !== combo.key.toLowerCase()) return;
            if (!!combo.ctrl !== e.ctrlKey) return;
            if (!!combo.shift !== e.shiftKey) return;
            if (!!combo.alt !== e.altKey) return;
            if (!!combo.meta !== e.metaKey) return;

            // Ignore if inside an input, unless it's a special command like Escape
            if (
                ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) &&
                e.key !== 'Escape'
            ) {
                return;
            }

            e.preventDefault();
            callback(e);
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [combo.key, combo.ctrl, combo.shift, combo.alt, combo.meta, ...deps]);
};
