export function Brand({ subtitle = 'PLATFORM BISNIS' }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-2.5 font-extrabold tracking-wide">
      <div className="grid h-9 w-9 place-items-center rounded-xl bg-lime font-black text-deep" aria-hidden="true">L</div>
      <div className="leading-tight">
        Lumbra
        <br />
        <small className="font-semibold text-[#b9c9c1]">{subtitle}</small>
      </div>
    </div>
  );
}
