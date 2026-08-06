import { connect, request, isConnected } from "@stacks/connect";

export class TipTransferError extends Error {}

/**
 * Prompts the payer's own wallet to sign and broadcast an STX transfer.
 * Connects first if no wallet session exists yet - this is the payer
 * connecting their own wallet, never the recipient's.
 */
export async function sendTip(
  recipient: string,
  amountMicroStx: string,
  memo?: string,
): Promise<{ txId: string }> {
  if (!isConnected()) {
    const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;
    await connect(projectId ? { walletConnectProjectId: projectId } : undefined);
  }

  try {
    const response = await request("stx_transferStx", {
      amount: amountMicroStx,
      recipient,
      ...(memo ? { memo } : {}),
    });
    if (!response?.txid) {
      throw new TipTransferError("Wallet did not return a transaction ID");
    }
    return { txId: response.txid };
  } catch (err) {
    if (err instanceof TipTransferError) throw err;
    throw new TipTransferError(
      err instanceof Error ? err.message : "The wallet rejected or failed the transfer",
    );
  }
}
