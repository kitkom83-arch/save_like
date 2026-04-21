"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  }

  return (
    <button type="button" className="secondary topbar-logout" onClick={handleLogout}>
      Logout
    </button>
  );
}
