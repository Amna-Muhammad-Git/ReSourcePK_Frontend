import { useEffect, useRef, useState } from "react";

export default function useNavigationDrawer(open, close) {
  const drawerRef = useRef(null);
  const triggerRef = useRef(null);
  const [wide, setWide] = useState(
    () => window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setWide(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!open || wide) return;
    const drawer = drawerRef.current;
    const trigger = triggerRef.current;
    const controls = () =>
      [...drawer.querySelectorAll("button, a[href], select")].filter(
        (element) => !element.disabled && element.getClientRects().length,
      );
    controls()[0]?.focus();
    const keydown = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;
      const items = controls();
      const first = items[0],
        last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    drawer.addEventListener("keydown", keydown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      drawer.removeEventListener("keydown", keydown);
      document.body.style.overflow = previous;
      trigger?.focus();
    };
  }, [open, wide, close]);
  return { drawerRef, triggerRef, wide };
}
