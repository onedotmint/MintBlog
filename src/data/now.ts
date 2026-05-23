export interface NowPageData {
  lastUpdated: string
  learningFocus: readonly string[]
  shortTermDirection: readonly string[]
}

export const nowPageData = {
  lastUpdated: '2026-05-23',
  learningFocus: [
    'Backend fundamentals through small Go, Rust, and Linux exercises.',
    'Static publishing pipelines that stay inspectable from content sync to Nginx.',
    'Course notes that turn abstract CS topics into runnable examples.',
  ],
  shortTermDirection: [
    'Keep the blog small enough that each page can be reviewed by hand.',
    'Connect learning notes with projects through tags, series, and concise indexes.',
    'Favor build-time checks over runtime features until the static foundation is stable.',
  ],
} satisfies NowPageData
