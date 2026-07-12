/** 휴대폰번호 자동 하이픈 포맷 — 010-1234-5678(3-4-4) / 10자리 구번호는 3-3-4 */
export function formatMobilePhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length < 4) return d;
  if (d.length < 8) return `${d.slice(0, 3)}-${d.slice(3)}`;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7, 11)}`;
}

/** 집전화(내선번호) 자동 하이픈 포맷 — 서울(02, 2자리 지역번호)과 그 외 지역(0XX, 3자리 지역번호)을 구분 */
export function formatLandlinePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  const isSeoul = digits.startsWith("02");
  const areaCodeLen = isSeoul ? 2 : 3;

  const areaCode = digits.slice(0, areaCodeLen);
  const rest = digits.slice(areaCodeLen);

  if (rest.length === 0) return areaCode;
  if (rest.length <= 4) return `${areaCode}-${rest}`;
  return `${areaCode}-${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
}
