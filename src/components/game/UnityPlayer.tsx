"use client";

import { useEffect, useRef } from "react";

type UnityInstance = { Quit: () => Promise<void>; SendMessage: (...args: unknown[]) => void };

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: Record<string, string>,
      onProgress?: (progress: number) => void,
    ) => Promise<UnityInstance>;
    // The bridge every Unity build in this project calls into — see
    // Assets/Plugins/WebGL/CustomJsLib.jslib's `SendPostMessage`. Unity calls
    // this directly (same-window embed, no iframe) whenever it needs
    // something from the host page or wants to report a lifecycle event.
    dispatchReactUnityEvent?: (message: string) => void;
  }
}

// Every Unity WebGL export deployed to game-builds/<slug>/ is expected to use
// this fixed output name ("game") regardless of the Unity project's product
// name — see ARCHITECTURE.md and README for the export convention. This is
// what lets one loader component work for every title.
const BUILD_OUTPUT_NAME = "game";

// Standing compression convention: Compression Format = Brotli, Decompression
// Fallback = ON (Player Settings → Publishing Settings). Fallback means
// Unity's own loader.js decompresses client-side, so a plain static host like
// GitHub Pages works with zero server config — no Content-Encoding header
// needed. That combination is what makes Unity suffix the three heavy assets
// with ".unityweb"; the loader script itself is never compressed.
const COMPRESSED_ASSET_SUFFIX = ".unityweb";

// How long to wait after the engine finishes loading before treating a game
// as "ready" even if it never calls the OnEnter bridge message — keeps this
// component working for a future game that doesn't implement that contract.
const READY_FALLBACK_GRACE_MS = 3000;

interface UnityPlayerProps {
  buildUrl: string; // absolute URL to the game's build root, e.g. http://host/game-builds/zombieland
  gameName: string;
  gameSlug: string;
  token: string;
  socketUrl: string;
  onProgress: (progress: number) => void;
  onReady: () => void;
  onExit: () => void;
  onError: (message: string) => void;
}

export function UnityPlayer({
  buildUrl,
  gameName,
  gameSlug,
  token,
  socketUrl,
  onProgress,
  onReady,
  onExit,
  onError,
}: UnityPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const instanceRef = useRef<UnityInstance | null>(null);
  const readyRef = useRef(false);
  const pendingAuthRequestRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let readyFallbackTimer: ReturnType<typeof setTimeout> | undefined;

    const markReady = () => {
      if (readyRef.current) return;
      readyRef.current = true;
      onReady();
    };

    const sendAuthToken = () => {
      if (!instanceRef.current) {
        // Unity asked before the loader promise resolved (shouldn't normally
        // happen — Unity only starts running scene scripts once loaded — but
        // queue it defensively instead of dropping the request).
        pendingAuthRequestRef.current = true;
        return;
      }
      instanceRef.current.SendMessage(
        "SocketManager",
        "ReceiveAuthToken",
        JSON.stringify({ cookie: token, socketURL: socketUrl, nameSpace: "game", gameSlug }),
      );
    };

    window.dispatchReactUnityEvent = (message: string) => {
      switch (message) {
        case "authToken":
          sendAuthToken();
          break;
        case "OnEnter":
          markReady();
          break;
        case "OnExit":
          onExit();
          break;
        case "session_expired":
          onError("Your session expired. Please log back in.");
          break;
        case "error":
          onError("This game reported an error.");
          break;
      }
    };

    // Note on orientation: this deliberately does NOT bridge resize events
    // into Unity's OrientationChange.cs (GameObject "OC") to make it rotate
    // its UI 90° to fake landscape while the phone is held portrait — that
    // path was built, verified working (screenshot-confirmed), and then
    // dropped in favor of a simpler, more standard approach: the site always
    // presents Unity with a landscape-shaped canvas, and blocks portrait
    // with a "rotate your device" overlay instead (see LandscapeGate in
    // GameShell.tsx). That sidesteps real mobile browsers' `orientationchange`
    // firing before the viewport finishes resizing entirely, rather than
    // working around it with settle-delay heuristics.

    const script = document.createElement("script");
    script.src = `${buildUrl}/Build/${BUILD_OUTPUT_NAME}.loader.js`;

    script.onload = () => {
      if (cancelled || !canvasRef.current || !window.createUnityInstance) return;

      window
        .createUnityInstance(
          canvasRef.current,
          {
            dataUrl: `${buildUrl}/Build/${BUILD_OUTPUT_NAME}.data${COMPRESSED_ASSET_SUFFIX}`,
            frameworkUrl: `${buildUrl}/Build/${BUILD_OUTPUT_NAME}.framework.js${COMPRESSED_ASSET_SUFFIX}`,
            codeUrl: `${buildUrl}/Build/${BUILD_OUTPUT_NAME}.wasm${COMPRESSED_ASSET_SUFFIX}`,
            streamingAssetsUrl: `${buildUrl}/StreamingAssets`,
            companyName: "WhiteHouse Games",
            productName: gameName,
          },
          (progress) => {
            if (!cancelled) onProgress(progress);
          },
        )
        .then((instance) => {
          if (cancelled) {
            instance.Quit();
            return;
          }
          instanceRef.current = instance;
          onProgress(1);
          if (pendingAuthRequestRef.current) {
            pendingAuthRequestRef.current = false;
            sendAuthToken();
          }
          // Most games signal real readiness (data loaded, playable) via the
          // "OnEnter" bridge message above, which can arrive well after the
          // engine itself finishes loading. This is just a safety net for a
          // simpler game that never sends it.
          readyFallbackTimer = setTimeout(markReady, READY_FALLBACK_GRACE_MS);
        })
        .catch(() => {
          if (!cancelled) onError("This game's Unity build failed to start.");
        });
    };

    script.onerror = () => {
      if (!cancelled) onError("This game's Unity build could not be found.");
    };

    document.body.appendChild(script);

    return () => {
      cancelled = true;
      if (readyFallbackTimer) clearTimeout(readyFallbackTimer);
      script.remove();
      delete window.dispatchReactUnityEvent;
      instanceRef.current?.Quit().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildUrl]);

  return (
    <canvas
      ref={canvasRef}
      id="unity-canvas"
      className="h-full w-full bg-black"
      style={{ imageRendering: "pixelated" }}
      aria-label={`${gameName} — Unity WebGL player`}
    />
  );
}
