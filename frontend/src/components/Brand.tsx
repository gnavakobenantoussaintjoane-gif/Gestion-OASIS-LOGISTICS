/** Logo officiel fourni : image intacte, proportions conservées sur tous les supports. */
export function OtlLogo({
  className = "",
  decorative = false,
}: {
  className?: string;
  decorative?: boolean;
}) {
  return (
    <img
      className={`otl-logo ${className}`}
      src={`${import.meta.env.BASE_URL}branding/otl-logo.jpg`}
      alt={decorative ? "" : "OTL — OASIS TRANSPORT LOGISTICS"}
      width={1280}
      height={640}
      decoding="async"
    />
  );
}
export default function Brand() {
  return (
    <div className="brand">
      <OtlLogo />
    </div>
  );
}
