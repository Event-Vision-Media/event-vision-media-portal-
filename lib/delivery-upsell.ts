import { EXTRAS, PACKAGES, PACKAGE_UPGRADE_PERKS, handoverFor, type DeviceKey } from "@/lib/catalog";

// „Lieber ganz bequem?“ – Lieferung nachträglich dazubuchen, wenn ein Gerät als Selbstabholung
// gebucht ist. Audiogästebuch: Extra „Lieferung & Abholung“; LOVE und 360°: Wechsel auf das Paket
// mit Lieferung. Anfahrt wird beim Buchen wie auf der Website berechnet.

/** Bis so viele Tage vor dem Event kann die Lieferung im Portal gebucht werden (danach per WhatsApp). */
export const DELIVERY_UPSELL_MIN_DAYS = 7;

const PACKAGE_SWITCH: Record<string, string> = {
  "love-abholung": "love-fullservice",
  "360-self": "360-komfort",
};

export interface DeliveryUpsell {
  /** Eindeutiger Schlüssel für die Buchung (Paket-ID des Selbstabholer-Pakets). */
  key: string;
  device: DeviceKey;
  deviceName: string;
  kind: "extra" | "package";
  /** Extra-ID bzw. Ziel-Paket-ID */
  targetId: string;
  targetName: string;
  /** Aufpreis ohne Anfahrt */
  price: number;
  perks: string[];
}

const DEVICE_NAME: Record<DeviceKey, string> = {
  spiegel: "den Fotospiegel",
  fotobox: "die Fotobox",
  "360": "die 360° Video Booth",
  audio: "das Audiogästebuch",
  love: "die LOVE-Buchstaben",
};

export function deliveryUpsells(items: { packages?: { id: string; product: string }[]; extras?: { id: string }[] } | null | undefined): DeliveryUpsell[] {
  const extraIds = new Set((items?.extras ?? []).map((e) => e.id));
  const out: DeliveryUpsell[] = [];
  for (const p of items?.packages ?? []) {
    const device = p.product as DeviceKey;
    if (handoverFor(device, p.id, extraIds) !== "abholung") continue;
    if (device === "audio") {
      const extra = EXTRAS.find((e) => e.id === "audio-lieferung");
      if (extra) out.push({ key: p.id, device, deviceName: DEVICE_NAME[device], kind: "extra", targetId: extra.id, targetName: extra.name, price: extra.price, perks: ["Lieferung zur Location", "Aufbau & kurzer Funktionstest", "Abholung nach dem Event"] });
      continue;
    }
    const to = PACKAGES.find((x) => x.id === PACKAGE_SWITCH[p.id]);
    const from = PACKAGES.find((x) => x.id === p.id);
    if (to && from) out.push({ key: p.id, device, deviceName: DEVICE_NAME[device], kind: "package", targetId: to.id, targetName: to.name, price: to.price - from.price, perks: PACKAGE_UPGRADE_PERKS[to.id] ?? [] });
  }
  return out;
}

/** Paket-Upgrades, die eigentlich ein Wechsel auf Lieferung sind (laufen über die Lieferungs-Karte). */
export const isDeliverySwitch = (fromId: string, toId: string) => PACKAGE_SWITCH[fromId] === toId;
