"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { AppShell } from "@/components/layout/app-shell";
import { DeveloperView } from "@/components/dashboard/developer-view";
import { AdminView } from "@/components/dashboard/admin-view";
import { LeadView } from "@/components/dashboard/lead-view";
import { Spinner } from "@fluentui/react-components";

function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex h-full items-center justify-center">
          <Spinner label="Loading Workspace..." />
        </div>
      </AppShell>
    );
  }

  // Render the appropriate dashboard based on user role
  let DashboardContent = DeveloperView; // Default to Developer View (Static 1st page)

  if (user?.role === "admin") {
    DashboardContent = AdminView;
  } else if (user?.role === "lead") {
    DashboardContent = LeadView;
  }

  return (
    <AppShell>
      <DashboardContent />
    </AppShell>
  );
}

export default function DashboardRoute() {
  return <DashboardPage />;
}
