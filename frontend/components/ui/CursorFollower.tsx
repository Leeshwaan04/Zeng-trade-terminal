"use client";
import { useEffect, useState } from "react";

export const CursorFollower = () => {
    const [pos, setPos] = useState({ x: -100, y: -100 });
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const move = (e: MouseEvent) => {
            setPos({ x: e.clientX, y: e.clientY });
            setVisible(true);
        };
        const leave = () => setVisible(false);

        window.addEventListener("mousemove", move);
        window.addEventListener("mouseleave", leave);
        return () => {
            window.removeEventListener("mousemove", move);
            window.removeEventListener("mouseleave", leave);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            className="fixed w-8 h-8 rounded-full pointer-events-none z-[9999] mix-blend-screen transition-transform duration-75 ease-out"
            style={{
                left: 0,
                top: 0,
                transform: `translate(${pos.x - 16}px, ${pos.y - 16}px)`,
                background: "radial-gradient(circle, rgba(0, 240, 255, 0.3) 0%, transparent 70%)",
                boxShadow: "0 0 20px rgba(0, 240, 255, 0.2)"
            }}
        />
    );
};
