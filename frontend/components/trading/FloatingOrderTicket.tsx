"use client";

import React, { useState } from "react";
import { DndContext, useDraggable, useSensor, useSensors, PointerSensor, DragEndEvent } from "@dnd-kit/core";
import { ScalperOrderpad } from "./ScalperOrderpad";
import { CSS } from "@dnd-kit/utilities";

interface FloatingOrderTicketProps {
    symbol: string;
}

export const FloatingOrderTicket = ({ symbol }: FloatingOrderTicketProps) => {
    // We lift the position state up to the DndContext level
    // Initially position at bottom right of the chart relative container
    const [position, setPosition] = useState({ x: 0, y: 0 });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { delta } = event;
        setPosition((prev) => ({
            x: prev.x + delta.x,
            y: prev.y + delta.y,
        }));
    };

    return (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <DraggableContent position={position} symbol={symbol} />
        </DndContext>
    );
};

const DraggableContent = ({ position, symbol }: { position: { x: number; y: number }, symbol: string }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'floating-ticket',
    });

    // Use translate3d for hardware acceleration
    // We combine the base position (position state) with the active drag delta (transform)
    const x = position.x + (transform?.x ?? 0);
    const y = position.y + (transform?.y ?? 0);

    const style: React.CSSProperties = {
        transform: `translate3d(${x}px, ${y}px, 0)`,
        position: 'absolute',
        top: '50px', // Initial offset
        right: '20px', // Initial offset
        zIndex: 50,
        touchAction: 'none',
    };

    return (
        <div ref={setNodeRef} style={style}>
            {/* Pass listeners only to the handle prop, not the whole div */}
            <ScalperOrderpad symbol={symbol} dragHandleProps={{ ...listeners, ...attributes }} />
        </div>
    );
};
