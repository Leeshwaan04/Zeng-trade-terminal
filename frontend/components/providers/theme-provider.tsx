"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { useNeuralUI } from "@/hooks/useNeuralUI";

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    useNeuralUI(); // Active Neural Engine
    return (
        <NextThemesProvider
            attribute="class"
            themes={['antigravity', 'groww', 'midnight', 'light']}
            defaultTheme="antigravity"
            enableSystem={false}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
