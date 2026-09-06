import type { Metadata } from "next";
import ScanResultClientPage from "./scan-result-client";

export const metadata: Metadata = {
  title: "Scan Result",
};

export default function ScanResultRoute() {
  return <ScanResultClientPage />;
}