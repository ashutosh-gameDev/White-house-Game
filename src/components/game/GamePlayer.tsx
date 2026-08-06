"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SplashScreen } from "./SplashScreen";
import { UnityPlayer } from "./UnityPlayer";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:4000";

/**
 * `unityBuildPath` is either a path on RMBackend's own static host
 * (`/game-builds/<slug>`, the original convention) or a full URL to any
 * static host — GitHub Pages, a CDN, wherever a build actually got deployed.
 * The CRM field accepts either; this is the one place that tells them apart.
 */
function resolveBuildUrl(unityBuildPath: string): string {
  const base = /^https?:\/\//i.test(unityBuildPath) ? unityBuildPath : `${BACKEND_URL}${unityBuildPath}`;
  return base.replace(/\/+$/, "");
}

export function GamePlayer({
  gameSlug,
  gameName,
  bannerPath,
  unityBuildPath,
  token,
}: {
  gameSlug: string;
  gameName: string;
  bannerPath: string | null;
  unityBuildPath: string;
  token: string;
}) {
  const router = useRouter();
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full">
      <SplashScreen visible={!ready} gameName={gameName} bannerPath={bannerPath} progress={progress} error={error} />
      {!error && (
        <UnityPlayer
          buildUrl={resolveBuildUrl(unityBuildPath)}
          gameName={gameName}
          gameSlug={gameSlug}
          token={token}
          socketUrl={SOCKET_URL}
          onProgress={setProgress}
          onReady={() => setReady(true)}
          onExit={() => router.replace("/portfolio")}
          onError={setError}
        />
      )}
    </div>
  );
}
