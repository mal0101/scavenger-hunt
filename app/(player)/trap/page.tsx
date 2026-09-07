import type { Metadata } from "next";
import TrapClientPage from "./trap-client";

export const metadata: Metadata = {
  title: "Trap Challenge",
};

export default function TrapRoute() {
  return <TrapClientPage />;
}