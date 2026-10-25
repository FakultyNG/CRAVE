import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { SessionKeeper } from "@/components/session-keeper";
import { CartProvider } from "@/components/cart-provider";
import { appOrigin } from "@/lib/app-url";

export const metadata: Metadata = {
  metadataBase: new URL(appOrigin()),
  title: { default: "Crave — Irresistible cravings, made modern", template: "%s · Crave" },
  description: "Premium food and drinks, prepared in Lagos and made for your next craving.",
  applicationName: "Crave",
  openGraph: { title: "Crave", description: "Irresistible cravings, made modern.", type: "website", locale: "en_NG" },
};

export const viewport: Viewport = { themeColor: "#E4281F", colorScheme: "light" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en-NG"><body><a className="skip-link" href="#page-content">Skip to main content</a><CartProvider><SessionKeeper /><div id="page-content" tabIndex={-1}>{children}</div><MobileBottomNav /></CartProvider></body></html>;
}
