"use client";

import { useEffect, useRef, useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminNav, type NavGroup } from "@/components/admin/nav";

// The console menu on narrow screens (the sidebar is hidden below lg): a
// toggle and a panel under the header, closing on a link, Escape, or a click
// elsewhere. No dialog library, so every console page stays light.
export function AdminMobileNav({ groups }: { groups: NavGroup[] }) {
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
    <div ref={root} className="lg:hidden">
      <Button
        variant="ghost"
        size="icon"
        aria-label={open ? "管理メニューを閉じる" : "管理メニューを開く"}
        aria-expanded={open}
        aria-controls="admin-menu"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <XIcon className="size-5" /> : <MenuIcon className="size-5" />}
      </Button>
      {open && (
        <div
          id="admin-menu"
          className="absolute inset-x-0 top-full max-h-[80vh] overflow-y-auto border-b bg-background px-4 py-4 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <AdminNav groups={groups} onNavigate={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}
