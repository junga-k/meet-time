import { StatusBar } from "@/components/ui/StatusBar";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="safe-area-shell">
      <StatusBar />
      {children}
    </div>
  );
}
