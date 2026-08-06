import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

// The proxy (src/proxy.ts) only checks that a session cookie exists. This is
// the layer that actually validates it against the backend — every page
// under this group inherits that check for free.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <>
      <Navbar username={session.user.username} />
      <main className="pt-20">{children}</main>
      <Footer />
    </>
  );
}
