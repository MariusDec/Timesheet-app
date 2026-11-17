// Monochrome line icons drawn in the text colour, matching the theme toggle.
// They replace colour emoji, which rendered differently per platform and
// clashed with the pastel glass palette.

type IconProps = { size?: number };

function Svg(props: IconProps & { children: any }) {
  const size = props.size ?? 16;
  return (
    <svg
      class="icon"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      {props.children}
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Svg size={props.size}>
      <rect x="3" y="4.5" width="18" height="16.5" rx="3" />
      <line x1="3" y1="9.5" x2="21" y2="9.5" />
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg size={props.size}>
      <circle cx="11" cy="11" r="7" />
      <line x1="20.5" y1="20.5" x2="16" y2="16" />
    </Svg>
  );
}

export function DownloadIcon(props: IconProps) {
  return (
    <Svg size={props.size}>
      <path d="M12 3.5v12" />
      <path d="M7 10.5l5 5 5-5" />
      <path d="M4 20.5h16" />
    </Svg>
  );
}

export function UploadIcon(props: IconProps) {
  return (
    <Svg size={props.size}>
      <path d="M12 15.5v-12" />
      <path d="M7 8.5l5-5 5 5" />
      <path d="M4 20.5h16" />
    </Svg>
  );
}
