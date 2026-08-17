import {
  AddToHomeScreenBanner,
  AddToHomeScreenProvider,
} from "@/components/app/AddToHomeScreen";
import MemberNav from "@/components/app/MemberNav";

export default function MemberAppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AddToHomeScreenProvider>
      <div className="min-h-full bg-surface">
        <MemberNav />
        <div className="mx-auto w-full max-w-site px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
          <AddToHomeScreenBanner />
          {children}
        </div>
      </div>
    </AddToHomeScreenProvider>
  );
}
