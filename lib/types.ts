export type BookingStatus =
  | "offen"
  | "layout_ausgewaehlt"
  | "personalisierung_komplett";

export type ProductType =
  | "Fotobox"
  | "Fotospiegel"
  | "360 Video Booth"
  | "Audiogästebuch"
  | "LOVE Buchstaben";

// Aufpreis pro zusätzlichem Layout- bzw. Startbildschirm-Wechsel, nachdem
// die erste (kostenlose) Auswahl bereits individuell vorbereitet wurde.
export const SELECTION_SWITCH_FEE = 25;

export const PRODUCT_TYPES: ProductType[] = [
  "Fotobox",
  "Fotospiegel",
  "360 Video Booth",
  "Audiogästebuch",
  "LOVE Buchstaben",
];

export interface Booking {
  id: string;
  booking_code: string;
  couple_names: string;
  event_date: string;
  product_type: string;
  selected_layout_id: string | null;
  selected_home_screen_id: string | null;
  is_premium_selected: boolean;
  premium_layout_included: boolean;
  event_uploaded: boolean;
  layout_switch_count: number;
  home_screen_switch_count: number;
  extra_wishes: string | null;
  personalization_name: string | null;
  personalization_date: string | null;
  addon_notes: string | null;
  status: BookingStatus;
  extras_confirmed_at: string | null;
  online_gallery_url: string | null;
  online_gallery_clicked_at: string | null;
  google_review_clicked_at: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  delivery_time_window: string | null;
  delivery_contact_name: string | null;
  delivery_contact_phone: string | null;
  pickup_date: string | null;
  pickup_time: string | null;
  pickup_time_window: string | null;
  pickup_contact_name: string | null;
  pickup_contact_phone: string | null;
  access_notes: string | null;
  access_notes_updated_at: string | null;
  custom_login_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogEntry {
  id: string;
  booking_id: string;
  event_type: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

// Anzahl Tage nach dem Event-Datum, ab der die Online-Galerie im
// Kundenbereich freigeschaltet wird.
export const GALLERY_UNLOCK_DAYS = 7;

export function getGalleryUnlockDate(eventDate: string): Date {
  const date = new Date(eventDate + "T00:00:00");
  date.setDate(date.getDate() + GALLERY_UNLOCK_DAYS);
  return date;
}

export interface Layout {
  id: string;
  name: string;
  preview_image_url: string;
  is_premium: boolean;
  extra_price: number;
  sort_order: number;
  category: string | null;
}

export interface HomeScreen {
  id: string;
  product_type: string;
  name: string;
  preview_image_url: string;
  sort_order: number;
}

// Seitenverhältnis des Startbildschirms je Produkt (entspricht der
// tatsächlichen Bildschirmausrichtung am jeweiligen Gerät).
export const HOME_SCREEN_ASPECT: Record<string, { class: string; label: string }> = {
  Fotobox: { class: "aspect-[16/9]", label: "1920 × 1080" },
  Fotospiegel: { class: "aspect-[9/16]", label: "1080 × 1920" },
};

export function getHomeScreenAspect(productType: string) {
  return HOME_SCREEN_ASPECT[productType] ?? { class: "aspect-[9/16]", label: "" };
}

export interface PersonalizedScreenExample {
  id: string;
  product_type: string;
  example_image_url: string;
}

export const LAYOUT_CATEGORIES = [
  "Hochzeit",
  "Geburtstag",
  "Firmenevent",
  "Weihnachtsfeier",
  "Nightlife",
  "Abschluss",
  "Minimalistisch",
] as const;

export interface Extra {
  id: string;
  name: string;
  category: string;
  description: string | null;
  preview_image_url: string | null;
  price: number;
  has_variants: boolean;
  is_active: boolean;
  sort_order: number;
  total_stock: number | null;
}

export interface ExtraVariant {
  id: string;
  extra_id: string;
  name: string;
  description: string | null;
  preview_image_url: string | null;
  price: number;
  features: string | null;
  is_popular: boolean;
  is_available: boolean;
  sort_order: number;
  total_stock: number | null;
}

export interface BookingExtra {
  id: string;
  booking_id: string;
  extra_id: string;
  variant_id: string | null;
  price: number;
  added_by_admin: boolean;
}

export interface AvailabilityBlock {
  id: string;
  extra_id: string | null;
  variant_id: string | null;
  start_date: string;
  end_date: string;
  blocked_quantity: number;
  note: string | null;
  created_at: string;
}

export type LayoutProofStatus =
  | "in_pruefung"
  | "freigegeben"
  | "aenderungen_erforderlich";

export interface LayoutProof {
  id: string;
  booking_id: string;
  layout_name: string;
  version: number;
  file_url: string;
  file_type: "image" | "pdf";
  admin_notes: string | null;
  status: LayoutProofStatus;
  customer_feedback: string | null;
  customer_feedback_at: string | null;
  admin_response: string | null;
  admin_response_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export const LAYOUT_PROOF_STATUS_LABELS: Record<LayoutProofStatus, string> = {
  in_pruefung: "In Prüfung",
  freigegeben: "Freigegeben",
  aenderungen_erforderlich: "Änderungen erforderlich",
};

export interface PersonalizedScreenRequest {
  id: string;
  booking_id: string;
  personalization_name: string | null;
  personalization_date: string | null;
  wish_text: string | null;
  photo_url: string | null;
  updated_at: string;
}

// Nutzt denselben Status-Typ/Label-Satz wie layout_proofs (identischer
// Freigabe-Workflow: in Prüfung -> freigegeben / Änderungen erforderlich).
export interface PersonalizedScreenProof {
  id: string;
  booking_id: string;
  version: number;
  file_url: string;
  admin_notes: string | null;
  status: LayoutProofStatus;
  customer_feedback: string | null;
  customer_feedback_at: string | null;
  admin_response: string | null;
  admin_response_at: string | null;
  approved_at: string | null;
  created_at: string;
}

export interface AudioGuestbookGreeting {
  id: string;
  booking_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

export interface AudioGuestbookRecording {
  id: string;
  booking_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
}

// Anzahl Tage vor dem Event-Datum, bis zu der die Begrüßungsnachricht fürs
// Audiogästebuch spätestens hochgeladen sein sollte.
export const AUDIO_GREETING_DEADLINE_DAYS = 7;

export function getAudioGreetingDeadline(eventDate: string): Date {
  const date = new Date(eventDate + "T00:00:00");
  date.setDate(date.getDate() - AUDIO_GREETING_DEADLINE_DAYS);
  return date;
}

export const AUDIO_UPLOAD_ACCEPT = ".mp3,.wav,.m4a,audio/mpeg,audio/wav,audio/x-wav,audio/mp4,audio/x-m4a";
export const AUDIO_UPLOAD_EXTENSIONS = ["mp3", "wav", "m4a"];
export const AUDIO_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024; // 100 MB je Datei

