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
    const initialOrientationRetries: ReturnType<typeof setTimeout>[] = [];

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

    // Bridges browser resize/orientation events into Unity's own
    // OrientationChange.cs (GameObject "OC"), which handles the actual
    // rotate/rescale tween. Nothing in the WebGL build calls this on its
    // own — the only caller in the source is an #if UNITY_EDITOR spacebar
    // shortcut for testing.
    //
    // Verified working on a desktop resize (screenshot-confirmed: the whole
    // UI rotates and rescales correctly). Real device rotation is trickier
    // in two separate ways:
    //   1. Mobile browsers fire `orientationchange` *before* they finish
    //      resizing the viewport (the URL bar collapse/expand animation is
    //      still running), so reading dimensions immediately can send Unity
    //      stale, pre-rotation numbers. `handleOrientationChange` waits
    //      longer than `handleResize` and re-checks once more after the
    //      dimensions actually settle, rather than trusting one early read.
    //   2. `canvas.clientWidth`/`clientHeight` are CSS layout pixels, but
    //      OrientationChange.cs's `Start()` calibrates its scale math
    //      against `Screen.width`/`Screen.height` — Unity's own rendering
    //      *backing-store* resolution, which is `devicePixelRatio` times
    //      larger on any non-1x display. Sending the smaller CSS-pixel
    //      numbers fed a scale calculation calibrated for real device
    //      pixels, which showed up as the whole UI rendering zoomed way out.
    //      `canvas.width`/`canvas.height` (the backing-store attributes
    //      Unity itself maintains, not the CSS box size) are what actually
    //      match `Screen.width`/`Screen.height` — read those instead of
    //      guessing at the devicePixelRatio math ourselves.
    let resizeDebounce: ReturnType<typeof setTimeout> | undefined;
    const notifyOrientation = () => {
      const instance = instanceRef.current;
      const canvas = canvasRef.current;
      if (!instance || !canvas) return;
      instance.SendMessage("OC", "SwitchDisplay", `${canvas.width},${canvas.height}`);
    };
    const handleResize = () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(notifyOrientation, 150);
    };
    const handleOrientationChange = () => {
      clearTimeout(resizeDebounce);
      resizeDebounce = setTimeout(() => {
        const canvas = canvasRef.current;
        const before = canvas ? `${canvas.width}x${canvas.height}` : null;
        notifyOrientation();
        setTimeout(() => {
          const after = canvas ? `${canvas.width}x${canvas.height}` : null;
          if (after !== before) notifyOrientation();
        }, 300);
      }, 400);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleOrientationChange);

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
          // Sync orientation as soon as Unity can receive it — and again a
          // couple of times shortly after, not just once. A single call
          // right here was unreliable specifically when the page first
          // loads already in portrait: subsequent resize/orientationchange
          // events always applied correctly, but the very first paint
          // sometimes didn't, most likely because the canvas's backing
          // store hasn't fully settled to its real post-layout size at the
          // exact instant the loader promise resolves. Retrying a couple of
          // times over the next second costs nothing (notifyOrientation is
          // a no-op if nothing actually changed) and catches that race.
          notifyOrientation();
          initialOrientationRetries.push(setTimeout(notifyOrientation, 300));
          initialOrientationRetries.push(setTimeout(notifyOrientation, 900));
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
      initialOrientationRetries.forEach(clearTimeout);
      clearTimeout(resizeDebounce);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleOrientationChange);
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
