"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { revertToConfirmedAction } from "@/server/actions/participants";
import { useToast } from "@/components/ui/Toast";

export function RevertToConfirmedButton({ meetingId }: { meetingId: string }) {
  const router = useRouter();
  const { showToast } = useToast();
  const [isPending, setIsPending] = useState(false);

  return (
    <button
      type="button"
      className="btn btn-secondary"
      disabled={isPending}
      style={{ marginBottom: 10 }}
      onClick={() => {
        setIsPending(true);
        (async () => {
          const result = await revertToConfirmedAction(meetingId);
          setIsPending(false);
          if (result.ok) {
            showToast("참석으로 변경했어요");
            router.refresh();
          }
        })();
      }}
    >
      참석으로 변경
    </button>
  );
}
