import { Notice } from "@/components/notice";

export interface FlashQuery {
  error?: string;
  success?: string;
}

export function FlashNotices({ error, success }: FlashQuery) {
  return (
    <>
      <Notice type="error">{error}</Notice>
      <Notice type="success">{success}</Notice>
    </>
  );
}
