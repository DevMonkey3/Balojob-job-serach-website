"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2Icon, GraduationCapIcon, MenuIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

// The header's menu on phones (the inline links are hidden below md). A plain
// toggle and a panel under the header — no dialog library, so the public
// pages ship no extra JavaScript for it. Closes on a link, Escape, or a
// click elsewhere.

const links = [
  { href: "/#jobs", label: "求人を探す", en: "Find jobs", icon: SearchIcon },
  { href: "/#schools", label: "学校を探す", en: "Find schools", icon: GraduationCapIcon },
  { href: "/#companies", label: "企業・学校の方へ", en: "For companies & schools", icon: Building2Icon },
];
// Register / log in / My Page / log out stay in the header itself (HeaderAuth),
// which knows who is signed in; this panel is the same for everyone.

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div ref={root} className="md:hidden">
      <Button
        variant="ghost"
        size="icon-lg"
        aria-label={open ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </Button>
      {open && (
        <nav
          id="site-menu"
          aria-label="メニュー"
          className="absolute inset-x-0 top-full border-b bg-background shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <ul className="mx-auto flex max-w-6xl flex-col px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-base hover:bg-muted"
                >
                  <l.icon className="size-5 text-primary" aria-hidden />
                  <span className="flex flex-col">
                    <span>{l.label}</span>
                    <span className="text-xs text-muted-foreground">{l.en}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
