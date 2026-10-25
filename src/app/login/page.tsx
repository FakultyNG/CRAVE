import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth-flow";
import { BrandLogo } from "@/components/brand-logo";
import { getSession } from "@/lib/auth/session";

export const metadata = { title: "Sign in" };
export const instant = false;

export default async function LoginPage() {
  if (await getSession()) redirect("/account");
  return <main className="grid min-h-svh lg:grid-cols-[.9fr_1.1fr]">
    <section className="relative hidden overflow-hidden bg-crave-red p-12 text-crave-cream lg:flex lg:flex-col lg:justify-between"><BrandLogo inverse className="w-32" /><Image src="/brand/mascot-outline.svg" alt="" width={682} height={409} className="absolute -right-32 top-1/4 w-[42rem] opacity-35" /><div className="relative"><p className="mb-4 text-xs font-bold uppercase tracking-[.2em] text-crave-orange">Crave, remembered</p><h2 className="max-w-xl text-6xl font-semibold leading-[.92]">Your favourites. Your orders. Right where you left them.</h2></div><p className="relative text-sm text-crave-cream/60">Secure phone verification powered through Strowallet.</p></section>
    <section className="flex min-h-svh items-center justify-center px-5 py-10 sm:px-10"><div className="w-full max-w-md"><Link href="/" className="mb-12 inline-block lg:hidden"><BrandLogo className="w-28" /></Link><AuthFlow /><p className="mt-10 text-center text-xs leading-relaxed text-crave-muted">By continuing, you agree to Crave’s terms and acknowledge its privacy policy.</p></div></section>
  </main>;
}
