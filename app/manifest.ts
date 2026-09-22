import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "kaustlog",
    short_name: "kaustlog",
    description: "学習記録アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      {
        src: "/icons/icon.png",
        sizes: "256x256",
        type: "image/png",
      },
    ],
  };
}