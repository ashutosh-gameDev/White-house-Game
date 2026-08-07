"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GamePlayer } from "./GamePlayer";
import { ExitOverlay } from "./ExitOverlay";

/**
 * Owns the one "leave this game" action — Unity's own in-game exit/close
 * button, bridged via GamePlayer → UnityPlayer's "OnExit" message. That used
 * to navigate straight away, unmounting UnityPlayer mid-frame; its cleanup
 * then calls the WebGL runtime's Quit(), which frees WASM memory
 * synchronously and can block the main thread for a couple of seconds — from
 * the player's side that looked like the game just froze before eventually
 * recovering. Centralizing it here means the full-page blocker paints first.
 *
 * No top bar on this page on purpose — every game already has its own
 * in-canvas close button (that's what fires "OnExit" above), and a
 * website-chrome bar eats real vertical space in mobile landscape, which is
 * already the tightest dimension this page has to work with.
 */
export function GameShell({
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
  const [exiting, setExiting] = useState(false);

  const handleExit = () => {
    setExiting(true);
    // Two nested rAFs guarantee a real paint happens before the heavy
    // Quit()+navigate work runs, so the player sees the blocker instead of a
    // stuck game frame.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        router.replace("/games");
      });
    });
  };

  return (
    <div className="relative h-screen bg-bg">
      <GamePlayer
        gameSlug={gameSlug}
        gameName={gameName}
        bannerPath={bannerPath}
        unityBuildPath={unityBuildPath}
        token={token}
        onExit={handleExit}
      />
      {exiting && <ExitOverlay />}
    </div>
  );
}
