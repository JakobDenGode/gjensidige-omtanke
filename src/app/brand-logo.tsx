import Image from "next/image";

export default function BrandLogo() {
  return <Image src="/gjensidige-logo.png" alt="Gjensidige" width={580} height={160} className="brand-logo" priority />;
}
