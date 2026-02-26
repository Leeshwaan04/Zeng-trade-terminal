"use client";

import { useEffect, useRef } from 'react';
import { useLayoutStore } from '@/hooks/useLayoutStore';

export const useLayoutSwipe = () => {
    const { cycleLayout } = useLayoutStore();
    const touchStartX = useRef<number | null>(null);
    const touchStartY = useRef<number | null>(null);

    // Thresholds
    const MIN_SWIPE_DISTANCE = 50;
    const MAX_VERTICAL_VARIANCE = 30; // Limit vertical movement to ensure meaningful horizontal swipe

    useEffect(() => {
        const handleTouchStart = (e: TouchEvent) => {
            touchStartX.current = e.touches[0].clientX;
            touchStartY.current = e.touches[0].clientY;
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (!touchStartX.current || !touchStartY.current) return;

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const deltaX = touchStartX.current - touchEndX;
            const deltaY = Math.abs(touchStartY.current - touchEndY);

            // Check if it's a valid horizontal swipe
            if (Math.abs(deltaX) > MIN_SWIPE_DISTANCE && deltaY < MAX_VERTICAL_VARIANCE) {
                if (deltaX > 0) {
                    // Swipe Left -> Next Layout
                    cycleLayout('next');
                } else {
                    // Swipe Right -> Prev Layout
                    cycleLayout('prev');
                }
            }

            // Reset
            touchStartX.current = null;
            touchStartY.current = null;
        };

        // Trackpad 'wheel' event for horizontal swipes
        let wheelTimeout: NodeJS.Timeout;
        const handleWheel = (e: WheelEvent) => {
            // Check for significant horizontal scroll and minimal vertical scroll
            if (Math.abs(e.deltaX) > 30 && Math.abs(e.deltaY) < 10) {
                e.preventDefault(); // Prevent browser back/forward navigation if possible

                // Debounce to prevent rapid cycling
                clearTimeout(wheelTimeout);
                wheelTimeout = setTimeout(() => {
                    if (e.deltaX > 0) {
                        cycleLayout('next');
                    } else {
                        cycleLayout('prev');
                    }
                }, 100);
            }
        };

        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchend', handleTouchEnd);
        window.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
            window.removeEventListener('wheel', handleWheel);
            clearTimeout(wheelTimeout);
        };
    }, [cycleLayout]);
};
