import { redirect } from "next/navigation";
import { demoRoom } from "@/lib/seed-data";

export default function DemoPage() {
  redirect(`/rooms/${demoRoom.id}`);
}

