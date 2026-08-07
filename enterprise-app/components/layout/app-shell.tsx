"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Input,
  Text,
  makeStyles,
  tokens,
} from "@fluentui/react-components";
import {
  Board24Regular,
  Branch24Regular,
  ChevronRight16Regular,
  Code24Regular,
  DataHistogram24Regular,
  Document24Regular,
  Folder24Regular,
  Home24Regular,
  Play24Regular,
  Search24Regular,
  Settings24Regular,
  SignOut24Regular,
  WeatherMoon24Regular,
  WeatherSunny24Regular,
} from "@fluentui/react-icons";
import { useAuth } from "@/components/providers/auth-provider";
import { useFluentTheme } from "@/components/providers/fluent-provider";

interface NavGroup {
  groupLabel: string;
  items: {
    href: string;
    label: string;
    hint: string;
    icon: any;
    badge?: string;
  }[];
}

const navGroups: NavGroup[] = [
  {
    groupLabel: "Overview",
    items: [
      { href: "/dashboard", label: "Command Center", hint: "Dashboard & live feed", icon: Home24Regular },
    ],
  },
  {
    groupLabel: "Repos",
    items: [
      { href: "/projects", label: "Files & Repos", hint: "Source repositories", icon: Folder24Regular },
      { href: "/commits", label: "Commits & Diff", hint: "Commit history", icon: Branch24Regular },
    ],
  },
  {
    groupLabel: "Pipelines",
    items: [
      { href: "/reviews", label: "Review Queue", hint: "AI agent findings", icon: Code24Regular, badge: "AI" },
    ],
  },
  {
    groupLabel: "Analytics",
    items: [
      { href: "/leaderboard", label: "Velocity & Quality", hint: "Developer metrics", icon: DataHistogram24Regular },
    ],
  },
];

const useStyles = makeStyles({
  shellContainer: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--bg)",
    color: "var(--text)",
  },
  topHeader: {
    height: "48px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 16px",
    background: "var(--ado-header-bg)",
    borderBottom: "1px solid var(--border)",
    color: "#ffffff",
    zIndex: 30,
    boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
  },
  mainLayout: {
    display: "flex",
    flex: 1,
    minHeight: "calc(100vh - 48px)",
  },
  sidebar: {
    width: "240px",
    flexShrink: 0,
    background: "var(--ado-sidebar-bg)",
    borderRight: "1px solid var(--border)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "12px 8px",
  },
  contentArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  breadcrumbBar: {
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    background: "var(--surface)",
    borderBottom: "1px solid var(--border)",
  },
  pageBody: {
    flex: 1,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    maxWidth: "1600px",
    width: "100%",
    boxSizing: "border-box",
    margin: "0 auto",
  },
});

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { themeMode, toggleTheme } = useFluentTheme();
  const styles = useStyles();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen(true);
      }
      if (event.key === "Escape") {
        setPaletteOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const getBreadcrumbs = () => {
    if (pathname?.startsWith("/dashboard")) return ["Overview", "Command Center"];
    if (pathname?.startsWith("/projects")) return ["Repos", "Files & Repositories"];
    if (pathname?.startsWith("/commits")) return ["Repos", "Commits & Diffs"];
    if (pathname?.startsWith("/reviews")) return ["Pipelines", "Review Queue"];
    if (pathname?.startsWith("/leaderboard")) return ["Analytics", "Velocity & Quality"];
    return ["Overview", "Console"];
  };

  const [crumbGroup, crumbPage] = getBreadcrumbs();

  return (
    <div className={styles.shellContainer}>
      {/* Top Azure DevOps Header Bar */}
      <header className={styles.topHeader}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {/* ADO Ribbon Brand Icon */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                borderRadius: 4,
                background: "linear-gradient(135deg, #0078D4 0%, #002050 100%)",
                display: "grid",
                placeItems: "center",
                fontWeight: "bold",
                fontSize: 14,
                color: "#fff",
                boxShadow: "0 0 6px rgba(0,120,212,0.6)",
              }}
            >
              ❖
            </div>
            <Text weight="bold" style={{ color: "#ffffff", fontSize: 14, letterSpacing: "0.5px" }}>
              Code Gaurdian
            </Text>
          </div>

          <span style={{ opacity: 0.3, fontSize: 16 }}>|</span>

          {/* Org & Project Selector */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
            <span style={{ fontWeight: 600, color: "#ffffff" }}>AI Friday Org</span>
            <ChevronRight16Regular style={{ opacity: 0.6 }} />
            <span style={{ color: "rgba(255,255,255,0.85)" }}>AI Friday Final</span>
          </div>
        </div>

        {/* Global Search Bar */}
        <div style={{ width: 360 }}>
          <Button
            appearance="subtle"
            onClick={() => setPaletteOpen(true)}
            style={{
              width: "100%",
              justifyContent: "space-between",
              background: "rgba(255,255,255,0.12)",
              color: "#ffffff",
              border: "1px solid rgba(255,255,255,0.15)",
              height: 32,
              borderRadius: 4,
              padding: "0 10px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, opacity: 0.85 }}>
              <Search24Regular style={{ fontSize: 14 }} /> Search repos, commits, work items...
            </span>
            <kbd
              style={{
                background: "rgba(0,0,0,0.3)",
                borderRadius: 3,
                padding: "2px 6px",
                fontSize: 10,
                color: "#ccc",
              }}
            >
              Ctrl+K
            </kbd>
          </Button>
        </div>

        {/* Header Right Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button
            appearance="subtle"
            icon={themeMode === "dark" ? <WeatherSunny24Regular /> : <WeatherMoon24Regular />}
            onClick={toggleTheme}
            style={{ color: "#ffffff", height: 32, width: 32, minWidth: 32, padding: 0 }}
            title="Toggle theme"
          />
          <Button
            appearance="subtle"
            icon={<Settings24Regular />}
            onClick={() => setPaletteOpen(true)}
            style={{ color: "#ffffff", height: 32, width: 32, minWidth: 32, padding: 0 }}
            title="Project settings"
          />
          <span style={{ opacity: 0.3, fontSize: 16 }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingLeft: 4 }}>
            <Avatar name={user?.full_name ?? user?.username ?? "Developer"} size={28} />
            <Text size={200} weight="semibold" style={{ color: "#ffffff" }}>
              {user?.username ?? "developer"}
            </Text>
            <Button
              appearance="subtle"
              icon={<SignOut24Regular />}
              onClick={() => {
                logout();
                router.push("/login");
              }}
              style={{ color: "rgba(255,255,255,0.8)", height: 30, minWidth: 30, padding: 0 }}
              title="Sign out"
            />
          </div>
        </div>
      </header>

      <div className={styles.mainLayout}>
        {/* Left Azure DevOps Hubs Sidebar */}
        <aside className={styles.sidebar}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Project Banner Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "4px 8px" }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 6,
                  background: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: "bold",
                  fontSize: 14,
                  color: "#fff",
                }}
              >
                AF
              </div>
              <div style={{ minWidth: 0 }}>
                <Text weight="semibold" className="truncate" style={{ display: "block", fontSize: 13 }}>
                  AI Friday Final
                </Text>
                <Text size={100} style={{ color: "var(--muted)", display: "block" }}>
                  Private Repository
                </Text>
              </div>
            </div>

            <Divider />

            {/* Navigation Groups */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {navGroups.map((group) => (
                <div key={group.groupLabel} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Text
                    size={100}
                    weight="bold"
                    style={{
                      padding: "0 8px 4px 8px",
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      fontSize: 10,
                    }}
                  >
                    {group.groupLabel}
                  </Text>

                  {group.items.map((item) => {
                    const active = pathname?.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`ado-nav-item ${active ? "active" : ""}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "7px 10px",
                          borderRadius: 4,
                          textDecoration: "none",
                          color: active ? "var(--accent)" : "var(--text)",
                          fontSize: 13,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Icon style={{ fontSize: 18, color: active ? "var(--accent)" : "var(--muted)" }} />
                          <span>{item.label}</span>
                        </div>
                        {item.badge ? (
                          <Badge appearance="filled" color="brand" size="small">
                            {item.badge}
                          </Badge>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar Footer User Card */}
          <div
            style={{
              padding: "10px",
              borderRadius: 6,
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#107C41",
                  boxShadow: "0 0 4px #107C41",
                }}
              />
              <Text size={100} weight="semibold" style={{ color: "var(--muted)" }}>
                Pipeline Active
              </Text>
            </div>
            <Text size={100} style={{ color: "var(--accent)", fontWeight: 600 }}>
              v1.0.4
            </Text>
          </div>
        </aside>

        {/* Content Area with Breadcrumb Header */}
        <div className={styles.contentArea}>
          <div className={styles.breadcrumbBar}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <Text style={{ color: "var(--muted)" }}>AI Friday Final</Text>
              <ChevronRight16Regular style={{ color: "var(--muted)" }} />
              <Text style={{ color: "var(--muted)" }}>{crumbGroup}</Text>
              <ChevronRight16Regular style={{ color: "var(--muted)" }} />
              <Text weight="semibold" style={{ color: "var(--text)" }}>
                {crumbPage}
              </Text>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Badge appearance="tint" color="brand">
                Agent Watcher Active
              </Badge>
            </div>
          </div>

          <main className={styles.pageBody}>{children}</main>
        </div>
      </div>

      {/* Quick Search Palette Modal */}
      {paletteOpen ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm">
          <Card appearance="filled" style={{ width: "100%", maxWidth: 640, padding: 20, borderRadius: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
              <div>
                <Text size={100} weight="semibold" style={{ color: "var(--accent)", textTransform: "uppercase" }}>
                  Azure DevOps Search
                </Text>
                <Text size={500} weight="bold" style={{ display: "block" }}>
                  Quick Hub Navigation
                </Text>
              </div>
              <Button appearance="subtle" onClick={() => setPaletteOpen(false)}>
                Esc
              </Button>
            </div>

            <Divider style={{ marginTop: 12, marginBottom: 16 }} />

            <div style={{ display: "grid", gap: 6 }}>
              {[
                ["Command Center (Dashboard)", "/dashboard"],
                ["Repositories & Source Files", "/projects"],
                ["Commit History & Code Diffs", "/commits"],
                ["AI Review Suggestions Queue", "/reviews"],
                ["Developer Quality Leaderboard", "/leaderboard"],
              ].map(([label, href]) => (
                <Button
                  key={href}
                  as="a"
                  href={href}
                  appearance="subtle"
                  onClick={() => setPaletteOpen(false)}
                  style={{ justifyContent: "flex-start", padding: "10px 14px", textAlign: "left" }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

