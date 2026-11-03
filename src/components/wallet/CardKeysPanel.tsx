import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Nfc } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { pairMyPhysicalKey, listMyPhysicalKeys, setMyPhysicalKeyStatus } from "@/lib/wallet/wallet.functions";
import { readHardwareId } from "@/lib/wallet/card-pairing";

type Keys = Awaited<ReturnType<typeof listMyPhysicalKeys>>;

type NdefReading = { serialNumber: string; message: { records: { recordType: string; data?: DataView; encoding?: string }[] } };
type NdefReaderLike = { scan: (o?: { signal?: AbortSignal }) => Promise<void>; onreading: ((e: NdefReading) => void) | null; onreadingerror: (() => void) | null };

/**
 * Physical ROUT keys: link a chip by tapping it (WebNFC on Android Chrome) or
 * by entering its factory hardware ID. The separate activation code proves
 * possession; the public NDEF tag never contains key material.
 */
export function CardKeysPanel({ space }: { space?: "root" | "alias" }) {
  const list = useServerFn(listMyPhysicalKeys);
  const pair = useServerFn(pairMyPhysicalKey);
  const setStatus = useServerFn(setMyPhysicalKeyStatus);
  const [keys, setKeys] = useState<Keys | null>(null);
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState("");
  const [activation, setActivation] = useState("");
  const [pairing, setPairing] = useState(false);
  const [nfc, setNfc] = useState(false);

  const refresh = useCallback(() => {
    list().then(setKeys).catch(() => setKeys({ keys: [], available: false }));
  }, [list]);

  useEffect(() => {
    setNfc("NDEFReader" in window);
    refresh();
  }, [refresh]);

  const link = async () => {
    setPairing(true);
    try {
      const r = await pair({ data: { space, hardwareId: manual.trim(), activationCode: activation.trim() } });
      if (r.ok) {
        toast.success("Fabriekskaart gekoppeld en geactiveerd.");
        setActivation(""); setManual(""); refresh();
      } else toast.error(r.error === "unavailable" ? "Fabriekskaarten zijn nog niet ingesteld." : "Kaart of activatiecode ongeldig, al gekoppeld of ingetrokken.");
    } catch { toast.error("Kaart koppelen lukt nu niet."); }
    finally { setPairing(false); }
  };

  const scan = async () => {
    const Reader = (window as unknown as { NDEFReader?: new () => NdefReaderLike }).NDEFReader;
    if (!Reader) return;
    const ctrl = new AbortController();
    setScanning(true);
    const stop = setTimeout(() => ctrl.abort(), 30_000);
    ctrl.signal.addEventListener("abort", () => { clearTimeout(stop); setScanning(false); }, { once: true });
    try {
      const reader = new Reader();
      reader.onreading = (e) => {
        ctrl.abort();
        let hardwareId: string | null = null;
        for (const rec of e.message.records) {
          if (rec.recordType !== "text" || !rec.data) continue;
          hardwareId = readHardwareId(new TextDecoder(rec.encoding || "utf-8").decode(rec.data));
          if (hardwareId) break;
        }
        if (hardwareId) setManual(hardwareId);
        else toast.error("Geen geldige ROUT hardware-ID op deze kaart.");
      };
      reader.onreadingerror = () => toast.error("Kon de chip niet lezen. Houd de kaart stil tegen de achterkant van je telefoon.");
      await reader.scan({ signal: ctrl.signal });
    } catch {
      toast.error("NFC-toegang geweigerd of niet beschikbaar.");
      setScanning(false);
      ctrl.abort();
    }
  };

  const change = async (hardwareId: string, status: "active" | "frozen" | "revoked") => {
    if (status === "revoked" && !window.confirm("Definitief intrekken? Deze kaart kan daarna nooit meer gebruikt worden.")) return;
    const r = await setStatus({ data: { hardwareId, status } }).catch(() => ({ ok: false }));
    if (!r.ok) toast.error(status === "active" ? "Alleen een chip met beveiligde sleutel kan actief worden." : "Wijzigen lukt nu niet.");
    refresh();
  };

  return (
    <section className="grid gap-3 rounded-2xl border border-border p-3" aria-labelledby="rout-keys-title">
      <div className="flex items-center justify-between gap-2">
        <h3 id="rout-keys-title" className="flex items-center gap-1.5 text-sm font-semibold"><Nfc className="h-4 w-4" aria-hidden /> Fysieke kaarten</h3>
        {nfc && (
          <Button type="button" size="sm" variant="outline" onClick={() => void scan()} disabled={scanning || keys?.available === false}>
            {scanning ? <><Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Tik je kaart…</> : "Nieuwe ROUT Card koppelen"}
          </Button>
        )}
      </div>
      {keys?.available === false && <p className="text-xs text-muted-foreground">Fysieke kaarten zijn nog niet ingesteld in de database.</p>}
      {keys?.available !== false && (
        <form
          className="grid gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            void link();
          }}
        >
          <label htmlFor="rout-chip-uid" className="text-xs text-muted-foreground">Hardware-ID</label>
          <div className="flex gap-2">
            <Input id="rout-chip-uid" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" className="h-9 min-w-0 font-mono text-xs" autoComplete="off" spellCheck={false} />
          </div>
          <label htmlFor="rout-activation" className="text-xs text-muted-foreground">Activatiecode uit je kaartverpakking</label>
          <Input id="rout-activation" type="password" value={activation} onChange={(e) => setActivation(e.target.value)} autoComplete="off" maxLength={128} />
          <Button type="submit" size="sm" variant="outline" disabled={pairing || manual.trim().length !== 36 || activation.trim().length < 20}>{pairing ? "Koppelen…" : "Koppel en activeer"}</Button>
        </form>
      )}
      {keys === null ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Laden" />
      ) : keys.keys.length > 0 ? (
        <ul className="grid gap-2">
          {keys.keys.map((k) => (
            <li key={k.hardware_id} className="flex items-center justify-between gap-2 rounded-xl border border-border p-2 text-xs">
              <span className="grid">
                <span className="font-mono">{k.nfc_uid ?? "—"}</span>
                <span className={cn("text-[11px]", k.status === "active" ? "text-primary" : k.status === "pending" ? "text-muted-foreground" : "text-destructive")}>
                  {{ pending: "Wacht op activatie", active: "Actief", frozen: "Bevroren", revoked: "Ingetrokken" }[k.status]}
                  {k.has_key ? ` · ${k.key_alg}` : " · geen sleutel"}
                </span>
              </span>
              {k.status !== "revoked" && (
                <span className="flex gap-1">
                  {k.status !== "active" && k.has_key && <Button type="button" size="sm" variant="outline" onClick={() => void change(k.hardware_id, "active")}>Activeer</Button>}
                  {k.status === "active" && <Button type="button" size="sm" variant="outline" onClick={() => void change(k.hardware_id, "frozen")}>Bevries</Button>}
                  <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={() => void change(k.hardware_id, "revoked")}>Intrekken</Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : (
        keys.available && <p className="text-xs text-muted-foreground">Nog geen fysieke kaart gekoppeld.</p>
      )}
    </section>
  );
}
