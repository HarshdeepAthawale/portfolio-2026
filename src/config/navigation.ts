// Primary links in the header (the logo goes home).
export const headerNav = [
  { label: "About", href: "/about" },
  { label: "Work", href: "/work" },
  { label: "Projects", href: "/projects" },
  { label: "Blog", href: "/blog" },
] as const;

// Secondary pages, under "More" on desktop.
export const moreNav = [
  { label: "Resume", href: "/resume", note: "PDF and highlights" },
  { label: "Honors & Awards", href: "/achievements", note: "Wins, judging, badges" },
  { label: "Favourites", href: "/favourites", note: "Books, films, series" },
] as const;

export const footerNav = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Projects", href: "/projects" },
  { label: "Work", href: "/work" },
  { label: "Blog", href: "/blog" },
  { label: "Resume", href: "/resume" },
  { label: "Honors & Awards", href: "/achievements" },
  { label: "Favourites", href: "/favourites" },
] as const;

export const commandItems = [
  ...footerNav.map((item) => ({ label: item.label, href: item.href })),
  { label: "GitHub", href: "https://github.com/HarshdeepAthawale", external: true },
  { label: "LinkedIn", href: "https://www.linkedin.com/in/harshdeepathawale/", external: true },
  { label: "Medium", href: "https://medium.com/@harshdeepathawale", external: true },
  { label: "Email", href: "mailto:athawaleharshdeep@gmail.com", external: true },
];
