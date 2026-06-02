// Anonymous per-browser id, used to allow "one vote per device" without
// making anyone log in. It's clearable (not bulletproof) — just enough
// friction to stop casual double-voting at a festival.
import { uuid } from "./uuid";

const KEY = "shirtqr_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}
