import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.zengtrade.in"),
  title: {
    default: "ZenG Trade — Professional Trading Terminal for Indian Markets",
    template: "%s · ZenG Trade",
  },
  description:
    "Option chain with live Greeks, strategy payoffs with probability of profit, OI analytics and a one-click risk engine — on top of your own Zerodha account via Kite Connect.",
  keywords: [
    "trading terminal", "options trading India", "option chain Greeks",
    "Zerodha Kite Connect", "NIFTY options", "payoff diagram", "OI analysis",
    "algo trading India",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://www.zengtrade.in",
    siteName: "ZenG Trade",
    title: "ZenG Trade — Professional Trading Terminal for Indian Markets",
    description:
      "Your Zerodha account, a professional cockpit: live Greeks, payoff with POP, OI analytics, panic flatten.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZenG Trade — Professional Trading Terminal for Indian Markets",
    description:
      "Your Zerodha account, a professional cockpit: live Greeks, payoff with POP, OI analytics, panic flatten.",
  },
  robots: { index: true, follow: true },
};

import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import { ThemeProvider } from "@/components/providers/theme-provider";

import { RealtimeProvider } from "@/components/providers/realtime-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "h-full bg-background font-sans antialiased overflow-hidden transition-colors duration-300",
        inter.variable,
        mono.variable
      )} suppressHydrationWarning>
        <ThemeProvider
          disableTransitionOnChange
        >
          <TooltipProvider>
            <RealtimeProvider>
              {children}
            </RealtimeProvider>
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
