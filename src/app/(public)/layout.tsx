import Navbar from "@/components/Navbar";
import AuthGate from "@/components/auth/AuthGate";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      <AuthGate />
      {children}
    </>
  );
}
