import React from "react";

interface NavItemProps {
  children: React.ReactNode;
}

const NavItem = ({ children }: NavItemProps) => {
  const text = String(children);
  const href = `#${text.toLowerCase().replace(/\s+/g, "-")}`;
  
  return (
    <a
      href={href}
      className="text-sm text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white transition-colors font-medium"
    >
      {children}
    </a>
  );
};

export default React.memo(NavItem);
