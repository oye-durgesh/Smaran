"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pill, Plus } from "lucide-react";
import { useStore } from "@/lib/store/store";
import { confirmManually, setReminderPaused, skipReminderOccurrence, snoozeReminder } from "@/lib/store/actions";
import { medicineReminders, memberById, reminderStatusOn, todayOf } from "@/lib/selectors";
import { formatTime } from "@/lib/dates";
import { Screen } from "@/components/shell/screen";
import { EmptyState, MemberAvatar, PageHeader, SectionLabel, StatusBadge, Surface } from "@/components/smaran/primitives";
import { SmaranSpeakBox } from "@/components/smaran/smaran-speak-box";
import { Button } from "@/components/ui/button";
import type { Reminder, ReminderDayStatus } from "@/lib/types";

type Filter = "today" | "upcoming" | "completed" | "missed" | "paused" | "all";

export function MedicinesScreen() {
  const { state, update } = useStore();
  const today = todayOf(state);
  const [filter, setFilter] = useState<Filter>("today");
  const items = medicineReminders(state);

  const rows = useMemo(() => {
    return items.filter((r) => {
      const status = reminderStatusOn(r, today, state);
      if (filter === "all") return true;
      if (filter === "paused") return r.status === "paused";
      if (filter === "completed") return status === "confirmed";
      if (filter === "missed") return status === "missed";
      if (filter === "today") return status === "waiting" || status === "upcoming" || status === "confirmed";
      if (filter === "upcoming") return status === "upcoming" || status === "waiting";
      return true;
    });
  }, [items, filter, state, today]);

  return (
    <Screen
      aside={
        <>
          <SmaranSpeakBox context="general" />
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Taken is a family-entered event, not proof the medicine was swallowed. Pickup tasks stay on Today — they are not listed here.
          </p>
        </>
      }
    >
      <PageHeader
        title="Medicine reminders"
        subtitle="Take-medicine tasks only. Pickup from a pharmacy is a separate task."
        actions={
          <Link href="/new?kind=medicine" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-peach px-3.5 text-[13px] font-bold text-ink-strong">
            <Plus className="size-4" aria-hidden /> Add medicine reminder
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Medicine filters">
        {(["today", "upcoming", "completed", "missed", "paused", "all"] as Filter[]).map((f) => (
          <button
            key={f}
            type="button"
            role="tab"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`h-10 rounded-full px-3 text-[13px] font-bold capitalize ${filter === f ? "bg-peach text-ink-strong" : "border border-line-strong bg-surface-raised text-ink"}`}
          >
            {f}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <EmptyState icon={<Pill className="size-6" />} title="No medicine reminders in this view." body="Add one from speech or the button above. SMARAN will not invent a drug name." action={{ label: "Add medicine reminder", href: "/new?kind=medicine" }} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <MedicineRow reminder={r} status={reminderStatusOn(r, today, state)} onTaken={() => update((s) => confirmManually(s, r.id))} onSnooze={() => update((s) => snoozeReminder(s, r.id))} onSkip={() => update((s) => skipReminderOccurrence(s, r.id))} onPause={() => update((s) => setReminderPaused(s, r.id, r.status === "active"))} />
            </li>
          ))}
        </ul>
      )}
      <section className="mt-8">
        <SectionLabel>Pickup tasks</SectionLabel>
        <p className="text-[14px] text-ink-muted">Pharmacy pickups are listed on Today when their kind is pickup — they never appear as “take medicine.”</p>
      </section>
    </Screen>
  );
}

function MedicineRow({
  reminder,
  status,
  onTaken,
  onSnooze,
  onSkip,
  onPause,
}: {
  reminder: Reminder;
  status: ReminderDayStatus;
  onTaken: () => void;
  onSnooze: () => void;
  onSkip: () => void;
  onPause: () => void;
}) {
  const { state } = useStore();
  const member = memberById(state, reminder.familyMemberId);
  return (
    <Surface className="p-4">
      <div className="flex items-start gap-3">
        <MemberAvatar member={member} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[16px] font-extrabold text-ink-strong">{reminder.title}</p>
            <StatusBadge status={status} />
          </div>
          <p className="text-[13px] text-ink-muted">
            {member?.name} · {formatTime(reminder.time)} · {reminder.frequency}
            {reminder.source === "sample" ? " · sample family note" : ` · ${reminder.source}`}
          </p>
          <p className="mt-1 text-[12.5px] text-ink-muted">Marking taken records who confirmed in this browser. It is not ingestion proof or a delivered notification.</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onTaken} disabled={status === "confirmed" || reminder.status === "paused"}>
          Mark taken
        </Button>
        <Button size="sm" variant="outline" onClick={onSnooze}>
          Snooze 10 minutes
        </Button>
        <Button size="sm" variant="outline" onClick={onSkip}>
          Skip this reminder
        </Button>
        <Button size="sm" variant="ghost" onClick={onPause}>
          {reminder.status === "paused" ? "Resume" : "Pause"}
        </Button>
        <Link href={`/reminders/${reminder.id}`} className="inline-flex h-9 items-center rounded-[12px] px-3 text-[13px] font-bold text-peach-deep hover:underline">
          View details
        </Link>
      </div>
    </Surface>
  );
}
