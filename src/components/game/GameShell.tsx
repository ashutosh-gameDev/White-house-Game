"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GameTopBar } from "./GameTopBar";
import { GamePlayer } from "./GamePlayer";
import { ExitOverlay } from "./ExitOverlay";

/**
 * Owns the one "leave this game" action shared by both exit paths — Unity's
 * own in-game exit/close button (bridged via GamePlayer → UnityPlayer's
 * "OnExit" message) and the top bar's "← Games" link. Both used to
 * navigate straight away, unmounting UnityPlayer mid-frame; its cleanup then
 * calls the WebGL runtime's Quit(), which frees WASM memory synchronously
 * and can block the main thread for a couple of seconds — from the player's
 * side that looked like the game just froze before eventually recovering.
 * Centralizing it here means the full-page blocker paints first no matter
 * which route they exit through.
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
    <div className="flex h-screen flex-col bg-bg">
      <GameTopBar gameName={gameName} onExit={handleExit} />
      {/* min-h-0 overrides the flex item's default `min-height: auto` —
          without it, this container refuses to shrink below the Unity
          canvas's own intrinsic (replaced-element) content size on a
          resize, which showed up as the whole game area — and everything
          inside it, since height:100% just inherits whatever this resolves
          to — ballooning far past the actual viewport instead of properly
          filling it. Confirmed by walking the DOM chain: h-screen parent
          correctly read the real viewport height, this flex-1 child didn't. */}
      <div className="relative min-h-0 flex-1">
        <GamePlayer
          gameSlug={gameSlug}
          gameName={gameName}
          bannerPath={bannerPath}
          unityBuildPath={unityBuildPath}
          token={token}
          onExit={handleExit}
        />
      </div>
      {exiting && <ExitOverlay />}
    </div>
  );
}
