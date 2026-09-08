import { INDICATORS } from "../../../lib/indicators";
import MapExplorer from "../../../components/MapExplorer";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return INDICATORS.map((indicator) => ({
    slug: indicator.slug,
  }));
}

export default async function Page({ params }) {
  const { slug } = await params;
  const indicator = INDICATORS.find((i) => i.slug === slug);

  if (!indicator) {
    notFound();
  }

  return <MapExplorer indicator={indicator} />;
}