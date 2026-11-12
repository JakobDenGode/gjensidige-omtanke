import Image from "next/image";

export default function BrandLogo() {
  return (
    <span className="brand-lockup">
      <span>Gjensidig Omtanke</span>
      <Image
        src="/gjensidige-symbol.png"
        alt=""
        width={320}
        height={320}
        className="brand-symbol"
        priority
      />
    </span>
  );
}
