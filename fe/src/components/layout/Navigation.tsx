"use client";

import { useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useTranslations, useLocale } from "next-intl";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const t = useTranslations("nav");

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
  };

  const navItems = [
    { href: "/", label: t("dashboard"), icon: "◈" },
    { href: "/briefing", label: t("briefing"), icon: "◉" },
    { href: "/archive", label: t("archive"), icon: "◊" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex flex-col">
              <span className="font-display text-lg font-bold tracking-tight leading-tight">
                TOH
              </span>
              <span className="text-xs text-[#8888a0] leading-tight hidden sm:block">
                {t("climateMonitoring")}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`
                    relative px-4 py-2 rounded-lg text-sm font-medium
                    transition-all duration-300 ease-out
                    flex items-center gap-2
                    ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-[#8888a0] hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <span className={`text-xs ${isActive ? "text-[#ff4d4d]" : ""}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-gradient-to-r from-[#ff4d4d] to-[#4dc3ff] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop Live Indicator & Language Switcher */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-[#8888a0]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dff7d] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7dff7d]" />
              </span>
              {t("liveUpdate")}
            </div>

            {/* Language Switcher */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => switchLocale("ko")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  locale === "ko"
                    ? "bg-gradient-to-r from-[#ff4d4d] to-[#ff6b6b] text-white"
                    : "text-[#8888a0] hover:text-white hover:bg-white/10"
                }`}
              >
                한국어
              </button>
              <button
                onClick={() => switchLocale("en")}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  locale === "en"
                    ? "bg-gradient-to-r from-[#4dc3ff] to-[#6bd4ff] text-white"
                    : "text-[#8888a0] hover:text-white hover:bg-white/10"
                }`}
              >
                EN
              </button>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            aria-label={t("openMenu")}
          >
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? "rotate-45 translate-y-1" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white my-1 transition-all duration-300 ${mobileMenuOpen ? "opacity-0" : ""}`} />
            <span className={`block w-5 h-0.5 bg-white transition-all duration-300 ${mobileMenuOpen ? "-rotate-45 -translate-y-1" : ""}`} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 glass border-t border-[#2a2a38] transition-all duration-300 overflow-hidden ${
          mobileMenuOpen ? "max-h-[300px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="container-custom py-4">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium
                    transition-all duration-200
                    ${
                      isActive
                        ? "text-white bg-white/10"
                        : "text-[#8888a0] hover:text-white hover:bg-white/5"
                    }
                  `}
                >
                  <span className={`text-lg ${isActive ? "text-[#ff4d4d]" : ""}`}>
                    {item.icon}
                  </span>
                  {item.label}
                  {isActive && (
                    <span className="ml-auto w-2 h-2 bg-[#ff4d4d] rounded-full" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Mobile Live Indicator & Language Switcher */}
          <div className="flex items-center justify-between mt-4 px-4 pt-4 border-t border-[#2a2a38]">
            <div className="flex items-center gap-2 text-xs text-[#8888a0]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dff7d] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7dff7d]" />
              </span>
              {t("liveUpdate")}
            </div>

            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => {
                  switchLocale("ko");
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  locale === "ko"
                    ? "bg-gradient-to-r from-[#ff4d4d] to-[#ff6b6b] text-white"
                    : "text-[#8888a0] hover:text-white hover:bg-white/10"
                }`}
              >
                한국어
              </button>
              <button
                onClick={() => {
                  switchLocale("en");
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                  locale === "en"
                    ? "bg-gradient-to-r from-[#4dc3ff] to-[#6bd4ff] text-white"
                    : "text-[#8888a0] hover:text-white hover:bg-white/10"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
