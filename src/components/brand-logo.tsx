import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return <Image src={inverse ? "/brand/crave-logo-cream.png" : "/brand/crave-logo-red.png"} alt="Crave" width={907} height={440} priority className={cn("h-auto w-24 object-contain", className)} />;
}
