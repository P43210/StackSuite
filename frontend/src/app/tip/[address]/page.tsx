import { TipJar } from "@/components/TipJar";
import { fetchOwnedBnsNames } from "@/lib/api";

const STX_PRINCIPAL_PATTERN = /^S[PT][0-9A-Z]{38,39}$/;

export default async function TipPage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;

  if (!STX_PRINCIPAL_PATTERN.test(address)) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <p className="text-sm font-mono text-ember">Not a valid Stacks address.</p>
      </div>
    );
  }

  // Best-effort - if the BNS lookup fails (backend unreachable, no
  // names owned), the page still works fine showing just the address.
  let name: string | undefined;
  try {
    const owned = await fetchOwnedBnsNames(address);
    name = owned.names[0];
  } catch {
    name = undefined;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="stack-atmosphere" />
      <div className="relative z-10 w-full max-w-md space-y-4">
        <div className="text-center">
          <span className="font-display font-bold text-lg text-chalk">
            Stack<span className="font-medium text-slate-mist">Suite</span>
          </span>
          <p className="text-xs font-mono text-slate-mist mt-1">Send a tip in STX</p>
        </div>
        <TipJar address={address} name={name} />
      </div>
    </div>
  );
}
