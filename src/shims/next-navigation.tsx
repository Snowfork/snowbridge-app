// Vite shim for `next/navigation`. The app's components import the Next
// hooks; under Vite these resolve here (via alias in vite.config.ts) and map
// onto React Router. Under the legacy Next build the real module is used.
import {
  useNavigate,
  useLocation,
  useParams as useRouterParams,
  useSearchParams as useRouterSearchParams,
} from "react-router-dom";

// Matches the subset of Next's AppRouterInstance the app actually uses.
export function useRouter() {
  const navigate = useNavigate();
  return {
    push: (href: string) => navigate(href),
    replace: (href: string) => navigate(href, { replace: true }),
    back: () => navigate(-1),
    forward: () => navigate(1),
    refresh: () => {},
    prefetch: () => {},
  };
}

export function usePathname(): string {
  return useLocation().pathname;
}

// Next returns a ReadonlyURLSearchParams; the app only calls `.get()`, which
// React Router's URLSearchParams also provides.
export function useSearchParams(): URLSearchParams {
  const [params] = useRouterSearchParams();
  return params;
}

export function useParams<T = Record<string, string>>(): T {
  return useRouterParams() as T;
}

export type ReadonlyURLSearchParams = URLSearchParams;
