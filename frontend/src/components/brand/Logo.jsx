import { Link } from "react-router-dom";
import { IMAGES } from "@/lib/brand";

export const Logo = ({ to = "/", testId = "brand-logo" }) => (
  <Link to={to} data-testid={testId} className="group flex items-center gap-2.5">
    <span className="relative h-9 w-9 overflow-hidden rounded-full">
      <img src={IMAGES.ribbon} alt="Leverage 8 symbol" className="lwm-screen h-full w-full scale-[1.9] object-cover transition-transform duration-500 group-hover:scale-[2.05]" />
    </span>
    <span className="font-display text-[15px] font-medium tracking-tight text-slate-100">
      Leverage <span className="text-slate-400">What Matters</span>
    </span>
  </Link>
);
