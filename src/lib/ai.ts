import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI 초안 생성이 설정되지 않았어요 — 관리자에게 문의하세요.");
  }
}

/**
 * 작성자가 입력해둔 러프한 메모를 다듬어진 문단으로 재정리한다.
 * 녹음/STT 기반이 아니라 이미 입력된 텍스트를 원본으로 사용 — project_handoff.md "AI 활용 범위" 참고.
 */
export async function generateMeetingNoteDraft(roughNotes: string): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new AiNotConfiguredError();
  }
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 2048,
    system:
      "당신은 회의록 다듬기 도우미입니다. 아래 러프한 메모를 자연스럽고 정돈된 한국어 문단으로 재구성하세요. " +
      "사실을 추가하거나 지어내지 말고, 원문에 있는 내용만 다듬어 정리하세요.",
    messages: [{ role: "user", content: roughNotes }],
  });
  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI 응답에서 텍스트를 찾을 수 없습니다.");
  }
  return textBlock.text;
}
