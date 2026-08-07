import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getGameBySlug } from "@/lib/data/games";
import { ApiError } from "@/lib/api-error";
import { GameShell } from "@/components/game/GameShell";

export default async function GameDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await getSession();
  if (!session) redirect("/login");

  let game;
  try {
    game = await getGameBySlug(session.token, slug);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  }

  return (
    <GameShell
      gameSlug={game.slug}
      gameName={game.name}
      bannerPath={game.bannerPath}
      unityBuildPath={game.unityBuildPath}
      token={session.token}
    />
  );
}
