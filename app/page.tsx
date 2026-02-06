"use client";

import { useRouter } from "next/navigation";

const accounts = [
  { id: 1, name: "Nafizur", initials: "NR" },
  { id: 2, name: "Braden", initials: "BR" },
];

export default function AccountSelection() {
  const router = useRouter();

  function selectAccount(id: number) {
    document.cookie = `readndr_account_id=${id};path=/;max-age=${60 * 60 * 24 * 365}`;
    router.push("/search");
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-forest p-6">
      <h1 className="mb-2 text-4xl font-bold text-cream md:text-5xl">
        Readndr
      </h1>
      <p className="mb-12 font-avenir text-sm text-cream/70">
        Doomscroll through research papers
      </p>

      <div className="flex w-full max-w-md flex-col gap-5 sm:flex-row">
        {accounts.map((account) => (
          <button
            key={account.id}
            onClick={() => selectAccount(account.id)}
            className="group flex flex-1 flex-col items-center gap-4 rounded-2xl bg-cream p-8 shadow-lg transition-all duration-200 hover:scale-[1.03] hover:shadow-xl active:scale-[0.98]"
          >
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest text-2xl font-bold text-cream transition-colors group-hover:bg-orange">
              {account.initials}
            </div>
            <span className="font-bodoni text-xl font-semibold text-forest">
              {account.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
