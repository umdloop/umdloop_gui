import { redirect } from "next/navigation";

export default function DeliveryNavigatorRedirect() {
  redirect("/missions/delivery/navigator/main-map");
}
