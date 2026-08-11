import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { getHomeScreenAspect } from "@/lib/types";

export function SelectedHomeScreenSummary({
  homeScreen,
  productType,
  isPersonalizedBooked,
}: {
  homeScreen: { name: string; preview_image_url: string } | null;
  productType: string;
  isPersonalizedBooked: boolean;
}) {
  if (!homeScreen && !isPersonalizedBooked) {
    return (
      <div className="rounded-2xl border border-dashed border-anthracite-200 bg-white p-4 text-sm text-anthracite-400">
        Der Kunde hat noch keinen Startbildschirm ausgewählt.
      </div>
    );
  }

  const aspect = getHomeScreenAspect(productType);

  return (
    <div className="rounded-2xl border border-anthracite-100 bg-white p-4 shadow-soft">
      <h3 className="mb-3 font-medium text-anthracite-800">Ausgewählter Startbildschirm</h3>
      {homeScreen ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className={`relative w-24 flex-none overflow-hidden rounded-lg bg-anthracite-50 ${aspect.class}`}>
            <Image
              src={homeScreen.preview_image_url}
              alt={homeScreen.name}
              fill
              sizes="96px"
              className="object-cover"
            />
          </div>
          <p className="font-medium text-anthracite-800">{homeScreen.name}</p>
        </div>
      ) : (
        <Badge tone="gold">Personalisierter Startbildschirm gebucht</Badge>
      )}
    </div>
  );
}
