import { notFound } from "next/navigation";
import MapExplorer from "../../../components/MapExplorer";
import { INDICATORS, INDICATOR_BY_SLUG } from "../../../lib/indicators";

export function generateStaticParams() {
  return INDICATORS.map((item) => ({ slug: item.slug }));
}

export default async function ExplorePage({ params }) {
  const { slug } = await params;
  const indicator = INDICATOR_BY_SLUG[slug];
  if (!indicator) notFound();
  return <MapExplorer indicator={indicator} />;
}
