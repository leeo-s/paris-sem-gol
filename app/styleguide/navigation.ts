export interface NavItem {
  name: string
  href: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: "Foundation",
    items: [
      { name: "Design Tokens", href: "/styleguide" },
    ],
  },
  {
    title: "Components",
    items: [
      { name: "Header", href: "/styleguide/components/header" },
      { name: "Navigation", href: "/styleguide/components/navigation" },
      { name: "Mobile Menu", href: "/styleguide/components/mobile-menu" },
      { name: "Avatar", href: "/styleguide/components/avatar" },
      { name: "Table", href: "/styleguide/components/table" },
      { name: "Progress", href: "/styleguide/components/progress" },
    ],
  },
]
