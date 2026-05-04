import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clashvers | Enter the Arena',
  description: 'Next-generation 1v1 competitive coding platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <Script 
          src="https://cdn.tailwindcss.com?plugins=forms,container-queries" 
          strategy="beforeInteractive"
        />
        <Script id="tailwind-config" strategy="beforeInteractive">
          {`
            tailwind.config = {
              darkMode: "class",
              theme: {
                extend: {
                  colors: {
                    "error-container": "#93000a",
                    "background": "#131315",
                    "surface-container-lowest": "#0e0e10",
                    "surface-tint": "#c2c4e8",
                    "surface-container-high": "#2a2a2c",
                    "inverse-on-surface": "#313032",
                    "outline": "#919098",
                    "surface-container": "#201f22",
                    "on-error-container": "#ffdad6",
                    "inverse-surface": "#e5e1e4",
                    "on-error": "#690005",
                    "secondary-fixed": "#c5eae6",
                    "on-tertiary": "#3c2f08",
                    "on-background": "#e5e1e4",
                    "on-tertiary-fixed-variant": "#54451c",
                    "surface-bright": "#39393b",
                    "on-primary-fixed": "#161935",
                    "error": "#ffb4ab",
                    "tertiary-fixed": "#f8e0aa",
                    "primary-fixed-dim": "#c2c4e8",
                    "tertiary-fixed-dim": "#dbc490",
                    "tertiary-container": "#bfaa78",
                    "surface-dim": "#131315",
                    "on-secondary-fixed": "#00201f",
                    "on-surface-variant": "#c7c5ce",
                    "on-secondary-container": "#98bcb9",
                    "surface-container-highest": "#353437",
                    "primary-fixed": "#dfe0ff",
                    "on-primary-container": "#3b3e5b",
                    "on-surface": "#e5e1e4",
                    "primary-container": "#a7a9cc",
                    "secondary": "#a9ceca",
                    "on-secondary": "#123634",
                    "outline-variant": "#46464d",
                    "surface": "#131315",
                    "secondary-fixed-dim": "#a9ceca",
                    "secondary-container": "#2a4d4a",
                    "tertiary": "#dcc591",
                    "on-tertiary-fixed": "#241a00",
                    "surface-container-low": "#1c1b1d",
                    "on-secondary-fixed-variant": "#2a4d4a",
                    "on-tertiary-container": "#4d3e16",
                    "on-primary-fixed-variant": "#424562",
                    "primary": "#c2c4e8",
                    "surface-variant": "#353437",
                    "on-primary": "#2b2e4b",
                    "inverse-primary": "#595c7b"
                  },
                  borderRadius: {
                    DEFAULT: "0.25rem",
                    lg: "0.5rem",
                    xl: "0.75rem",
                    full: "9999px"
                  },
                  spacing: {
                    unit: "8px",
                    gutter: "24px",
                    "stack-sm": "12px",
                    "container-padding": "32px",
                    "stack-md": "24px",
                    "stack-lg": "48px"
                  },
                  fontFamily: {
                    "headline-md": ["Inter"],
                    "label-sm": ["Inter"],
                    "headline-lg": ["Inter"],
                    "display-xl": ["Inter"],
                    "code-md": ["JetBrains Mono"],
                    "body-md": ["Inter"],
                    "body-lg": ["Inter"],
                    "inter": ["Inter"]
                  },
                  fontSize: {
                    "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "500" }],
                    "label-sm": ["13px", { lineHeight: "1.2", letterSpacing: "0.02em", fontWeight: "500" }],
                    "headline-lg": ["32px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
                    "display-xl": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "600" }],
                    "code-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
                    "body-md": ["16px", { lineHeight: "1.6", fontWeight: "400" }],
                    "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }]
                  }
                }
              }
            };
          `}
        </Script>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
