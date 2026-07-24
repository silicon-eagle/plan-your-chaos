export type EventFormData = {
  title: string;
  startsAt: Date;
  endsAt: Date;
  allDay: boolean;
  notes: string | null;
  attendantIds: number[];
  iconId: FormDataEntryValue | null;
};

type ParseEventFormDataResult =
  | { data: EventFormData }
  | { error: string };

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function parseEventFormData(
  formData: FormData,
): ParseEventFormDataResult {
  const title = getString(formData, "title");
  const startsAt = new Date(getString(formData, "startsAt"));
  const endsAt = new Date(getString(formData, "endsAt"));
  const notes = getString(formData, "notes") || null;
  const attendantIds = formData
    .getAll("attendantIds")
    .map((value) => Number(value));

  if (
    !title ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    attendantIds.some((id) => !Number.isInteger(id) || id <= 0)
  ) {
    return {
      error: "Title, start, end, and attendants must be valid.",
    };
  }

  if (startsAt >= endsAt) {
    return { error: "The event must end after it starts." };
  }

  return {
    data: {
      title,
      startsAt,
      endsAt,
      allDay: formData.get("allDay") === "on",
      notes,
      attendantIds: [...new Set(attendantIds)],
      iconId: formData.get("iconId"),
    },
  };
}
