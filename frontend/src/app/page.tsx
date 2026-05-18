import { Suspense } from "react";
import MagazineFeed from "@/components/MagazineFeed";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <MagazineFeed />
    </Suspense>
  );
}
