import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata={title:"kaustlog",description:"学習記録・目標・復習・成績管理"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="ja"><body>{children}</body></html>}
