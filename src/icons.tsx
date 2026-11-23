import type { ReactNode } from "react";

function Svg({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="nav-svg"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconHome = () => (
  <Svg>
    <path d="M3 10.5 12 3l9 7.5" />
    <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    <path d="M9.5 21v-6h5v6" />
  </Svg>
);

export const IconNews = () => (
  <Svg>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 8.5h18" />
    <path d="M7 12.5h5M7 16h10" />
  </Svg>
);

export const IconRobot = () => (
  <Svg>
    <rect x="4.5" y="8" width="15" height="11" rx="2.5" />
    <path d="M12 8V4.8" />
    <circle cx="12" cy="3.8" r="1.1" />
    <path d="M9 12.5v2M15 12.5v2" />
    <path d="M9.5 16.8h5" />
  </Svg>
);

export const IconCheckCircle = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M8 12.4l2.7 2.7L16 9.5" />
  </Svg>
);

export const IconList = () => (
  <Svg>
    <path d="M8.5 6H21M8.5 12H21M8.5 18H21" />
    <path d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" strokeWidth="2.4" />
  </Svg>
);

export const IconFlask = () => (
  <Svg>
    <path d="M9.5 3h5" />
    <path d="M10 3v5.2L4.7 17.6A2 2 0 0 0 6.5 20.5h11a2 2 0 0 0 1.8-2.9L14 8.2V3" />
    <path d="M7.5 14.5h9" />
  </Svg>
);

export const IconBook = () => (
  <Svg>
    <path d="M4 19.2A2.8 2.8 0 0 1 6.8 16.4H20" />
    <path d="M6.8 2.5H20v19H6.8A2.8 2.8 0 0 1 4 18.7V5.3a2.8 2.8 0 0 1 2.8-2.8z" />
  </Svg>
);

export const IconPlug = () => (
  <Svg>
    <path d="M9 3v4M15 3v4" />
    <path d="M7 7h10v3.5a5 5 0 0 1-10 0z" />
    <path d="M12 15.5V21" />
  </Svg>
);

export const IconFile = () => (
  <Svg>
    <path d="M14 2.5H6.5a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8z" />
    <path d="M14 2.5V8h5.5" />
  </Svg>
);

export const IconScale = () => (
  <Svg>
    <path d="M12 3.5v16M8.5 20h7" />
    <path d="M12 6.5 5.5 8.5h13z" />
    <path d="M5.5 8.5 3 13.5a3.2 3.2 0 0 0 5 0z" />
    <path d="M18.5 8.5 21 13.5a3.2 3.2 0 0 1-5 0z" />
  </Svg>
);

export const IconGear = () => (
  <Svg>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 2.5v2.8M12 18.7v2.8M2.5 12h2.8M18.7 12h2.8M5.3 5.3l2 2M16.7 16.7l2 2M18.7 5.3l-2 2M7.3 16.7l-2 2" />
  </Svg>
);

export const IconInfo = () => (
  <Svg>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 7.8h.01" strokeWidth="2.4" />
  </Svg>
);

export const IconLogin = () => (
  <Svg>
    <path d="M14.5 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
    <path d="M10 17l5-5-5-5" />
    <path d="M15 12H3" />
  </Svg>
);

export const IconLogout = () => (
  <Svg>
    <path d="M9.5 21h-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="M16 17l5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const IconPanelCollapse = () => (
  <Svg>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
    <path d="M17 9.5 15 12l2 2.5" />
  </Svg>
);

export const IconPanelExpand = () => (
  <Svg>
    <rect x="3" y="4.5" width="18" height="15" rx="2" />
    <path d="M9.5 4.5v15" />
    <path d="M15 9.5 17 12l-2 2.5" />
  </Svg>
);
