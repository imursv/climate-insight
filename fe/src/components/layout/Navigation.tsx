"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "대시보드", icon: "◈" },
  { href: "/briefing", label: "AI 브리핑", icon: "◉" },
  { href: "/archive", label: "아카이브", icon: "◊" },
];

export default function Navigation() {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-br from-[#ff4d4d] to-[#4dc3ff] rounded-lg opacity-80 group-hover:opacity-100 transition-opacity" />
              <span className="relative text-white font-bold text-lg">CI</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-xl font-bold tracking-tight">
                Climate Insight
              </span>
              <span className="block text-xs text-[#8888a0] -mt-1">
                기후 변화 모니터링
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

          {/* Desktop Live Indicator */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-[#8888a0]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dff7d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7dff7d]" />
            </span>
            실시간 업데이트
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            aria-label="메뉴 열기"
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

          {/* Mobile Live Indicator */}
          <div className="flex items-center gap-2 text-xs text-[#8888a0] mt-4 px-4 pt-4 border-t border-[#2a2a38]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#7dff7d] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#7dff7d]" />
            </span>
            실시간 업데이트
          </div>
        </div>
      </div>
    </nav>
  );
}
