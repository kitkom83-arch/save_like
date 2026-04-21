"use client";

import dynamic from "next/dynamic";

type LinkFormClientProps = {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    shortCode?: string;
    primaryUrl?: string;
    fallbackUrl?: string;
    status?: "healthy" | "broken" | "paused";
    note?: string | null;
  };
};

const LinkForm = dynamic(() => import("@/components/link-form"), {
  ssr: false,
});

export default function LinkFormClient(props: LinkFormClientProps) {
  return <LinkForm {...props} />;
}
