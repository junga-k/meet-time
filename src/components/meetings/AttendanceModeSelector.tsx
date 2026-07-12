import type { AttendanceMode } from "@/lib/enums";

const OPTIONS: { value: AttendanceMode; label: string }[] = [
  { value: "대면", label: "대면만" },
  { value: "온라인", label: "온라인만" },
  { value: "무관", label: "둘 다 가능" },
];

export function AttendanceModeSelector({
  value,
  onChange,
  disabled,
}: {
  value: AttendanceMode | null;
  onChange: (mode: AttendanceMode) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <div className="attendance-label">참석 형태</div>
      <div className="segmented">
        {OPTIONS.map((opt) => (
          <button key={opt.value} type="button" disabled={disabled} onClick={() => onChange(opt.value)} className={value === opt.value ? "active" : ""}>
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
