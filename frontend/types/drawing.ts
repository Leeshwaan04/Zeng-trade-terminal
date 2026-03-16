export type DrawingToolType = "CURSOR" | "TRENDLINE" | "RECTANGLE" | "FIB_RETRACEMENT";

export interface Point {
    price: number;
    index: number; // Candle index (float allowed for interpolation)
    time?: number; // Optional fallback
}

export interface Drawing {
    id: string;
    type: DrawingToolType;
    points: Point[];
    style: {
        color: string;
        lineWidth: number;
        lineStyle?: "solid" | "dashed" | "dotted";
        fillColor?: string; // For shapes
    };
    locked?: boolean;
}
