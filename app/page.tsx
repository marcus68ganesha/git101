import { redirect } from "next/navigation";

// The root route has nothing of its own to show — proxy.ts already sends
// unauthenticated visitors to /login, so anyone landing here is signed in
// and just needs to be sent on to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
