import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';

interface PopoutWindowProps {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}

export const PopoutWindow = ({ title, onClose, children }: PopoutWindowProps) => {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const windowRef = useRef<Window | null>(null);

    useEffect(() => {
        // Open a new window
        const win = window.open('', '_blank', 'width=600,height=400,menubar=no,toolbar=no,location=no,status=no,directories=no,resizable=yes,scrollbars=yes');

        if (!win) {
            console.error("Popup blocked! Please allow popups.");
            onClose();
            return;
        }

        windowRef.current = win;
        win.document.title = title;

        // 1. Sync Root Classes (e.g., 'dark')
        const rootClasses = document.documentElement.className;
        win.document.documentElement.className = rootClasses;

        // 2. Sync Inline Root Styles (CSS Variables)
        win.document.documentElement.style.cssText = document.documentElement.style.cssText;

        // 3. Create Root Container
        const div = win.document.createElement('div');
        div.id = 'popout-root';
        div.className = document.body.className; // Copy body classes (fonts, bg, text color)
        div.style.height = '100%';
        div.style.display = 'flex';
        div.style.flexDirection = 'column';

        // Ensure the popout body has the correct background (using the variable)
        win.document.body.style.margin = '0';
        win.document.body.style.padding = '0';
        win.document.body.style.backgroundColor = getComputedStyle(document.body).backgroundColor;
        win.document.body.style.overflow = 'hidden';

        win.document.body.appendChild(div);

        // 4. Copy External Stylesheets (<link rel="stylesheet">)
        Array.from(document.querySelectorAll('link[rel="stylesheet"]')).forEach((link) => {
            const newLink = link.cloneNode(true);
            win.document.head.appendChild(newLink);
        });

        // 5. Copy Internal Styles (<style>)
        // Include a slight delay or observation if styles are injected dynamically, 
        // but for now, copying existing ones is usually sufficient for Next.js
        Array.from(document.querySelectorAll('style')).forEach((style) => {
            const newStyle = style.cloneNode(true);
            win.document.head.appendChild(newStyle);
        });

        setContainer(div);

        // 6. Sync Theme Changes (Live)
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    win.document.documentElement.className = document.documentElement.className;
                    // Also re-sync CSS variables if needed, though they usually cascade from :root if styles are linked
                    win.document.documentElement.style.cssText = document.documentElement.style.cssText;
                }
            });
        });
        observer.observe(document.documentElement, { attributes: true });

        // 7. Close Handling
        // Poll for window closure as 'beforeunload' is sometimes unreliable for popups
        const timer = setInterval(() => {
            if (win.closed) {
                clearInterval(timer);
                observer.disconnect();
                onClose();
            }
        }, 500);

        const handleBeforeUnload = () => {
            observer.disconnect();
            onClose();
        };
        win.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            clearInterval(timer);
            observer.disconnect();
            win.removeEventListener('beforeunload', handleBeforeUnload);
            // We usually don't close the window on unmount if we want it to persist,
            // but for this specific "Popout" component lifecycle, unmount = close.
            win.close();
        };
    }, []);

    if (!container) return null;

    return createPortal(children, container);
};
