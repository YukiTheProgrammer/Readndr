import NavBar from "@/components/NavBar";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="pb-20">{children}</main>
      <NavBar />
    </>
  );
}
