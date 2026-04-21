import type { Metadata } from "next";
import { I18nProvider } from "@/components/i18n-provider";
import LanguageSwitcher from "@/components/language-switcher";
import LogoutButton from "@/components/logout-button";
import { getServerI18n } from "@/lib/i18n/server";
import "./globals.css";

export const metadata: Metadata = {
  title: "Link Shortener",
  description: "Link shortener platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, messages, t } = await getServerI18n();

  return (
    <html lang={locale}>
      <body>
        <I18nProvider locale={locale} messages={messages}>
          <header className="topbar">
            <div className="container topbar-inner">
              <div>
                <div className="topbar-title">{t("app.title", "Link Shortener")}</div>
                <div className="small">{t("app.description", "Link shortener platform")}</div>
              </div>
              <div className="row wrap" style={{ gap: 8 }}>
                <LanguageSwitcher />
                <LogoutButton />
              </div>
            </div>
          </header>
          {children}
        </I18nProvider>
      </body>
    </html>
  );
}
