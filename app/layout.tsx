import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://agentledger.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "AgentLedger — tamper-evident attestation ledger for AI agents",
  description:
    "Every AI-agent action signed into a hash-chain on Amazon Aurora DSQL (OCC). Verify, detect tamper, prove trust. Built with Vercel v0 + AWS DSQL for H0: Hack the Zero Stack.",
  openGraph: {
    title: "AgentLedger — tamper-evident attestation ledger for AI agents",
    description: "Hash-chain agent receipts on Aurora DSQL (OCC). Verify trust, detect tamper in seconds.",
    type: "website",
    url: siteUrl,
    siteName: "AgentLedger",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgentLedger — tamper-evident attestation ledger for AI agents",
    description: "Hash-chain agent receipts on Aurora DSQL (OCC). Verify trust, detect tamper.",
  },
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
