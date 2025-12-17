import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";

export const metadata: Metadata = {
  title: "Climate Insight | 기후 변화 대시보드",
  description: "매일 아침 AI가 분석하는 기후변화 뉴스 브리핑 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased noise">
        <Navigation />
        {children}
      </body>
    </html>
  );
}
