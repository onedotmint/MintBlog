import { html } from 'satori-html'
import backgroundBase64 from './base64'

import type { BgType } from '~/types'

export const ogImageMarkup = (
  authorOrBrand: string,
  title: string,
  bgType: BgType
) => {
  if (!['plum', 'dot', 'rose', 'particle', 'signal'].includes(bgType))
    throw new Error(
      "The value of 'bgType' must be one of the following: 'plum', 'dot', 'rose', 'particle', 'signal'."
    )

  return html`<div
    tw="relative flex justify-center items-center w-full h-full"
    style="font-family: 'Inter'"
  >
    <img
      tw="absolute inset-0 w-full h-full"
      src="${backgroundBase64[bgType]}"
      alt="open graph"
    />

    <div tw="flex items-center justify-start w-full px-18" style="gap: 20px">
      <div tw="self-start flex justify-center items-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="7.5em"
          height="7.5em"
          viewBox="0 0 64 64"
        >
          <rect width="64" height="64" rx="16" fill="#111614"></rect>
          <g
            fill="none"
            stroke="#b9c4c0"
            stroke-width="2.4"
            stroke-linecap="round"
            opacity=".88"
          >
            <ellipse
              cx="32"
              cy="32"
              rx="21"
              ry="11"
              transform="rotate(-28 32 32)"
            ></ellipse>
            <ellipse
              cx="32"
              cy="32"
              rx="21"
              ry="11"
              transform="rotate(28 32 32)"
            ></ellipse>
          </g>
          <circle cx="32" cy="32" r="6" fill="#83d6b9"></circle>
          <circle cx="32" cy="32" r="2" fill="#10251d"></circle>
        </svg>
      </div>

      <div tw="flex flex-col" style="gap: 10px">
        <div tw="text-[#858585] text-2.1rem">${authorOrBrand}</div>
        <div tw="text-white text-3.1rem leading-relaxed mr-18">${title}</div>
      </div>
    </div>
  </div>`
}
