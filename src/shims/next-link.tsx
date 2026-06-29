// Vite shim for `next/link`. Maps Next's <Link href> onto React Router's
// <Link to>, passing through the props the app uses.
import { Link as RouterLink } from "react-router-dom";
import React from "react";

interface NextLinkProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  href: string;
  children: React.ReactNode;
  // Accepted and ignored (Next-only hints).
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, NextLinkProps>(
  ({ href, children, prefetch, scroll, replace, ...rest }, ref) => {
    const external = /^(https?:)?\/\//.test(href) || href.startsWith("mailto:");
    if (external) {
      return (
        <a ref={ref} href={href} {...rest}>
          {children}
        </a>
      );
    }
    return (
      <RouterLink ref={ref} to={href} replace={replace} {...rest}>
        {children}
      </RouterLink>
    );
  },
);
Link.displayName = "Link";

export default Link;
