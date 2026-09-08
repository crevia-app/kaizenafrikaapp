import { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

// ── Shared canvas capture ──────────────────────────────────────────────────────
const MIN_CAPTURE_W = 794; // A4 at 96 dpi

async function captureBlob(
  el: HTMLDivElement,
  filename: string,
  ignoreElements?: (el: Element) => boolean,
): Promise<{ blob: Blob; pdfName: string }> {
  // Apply A4 capture dimensions temporarily — removed after capture so screen
  // display stays fully responsive.
  const prevMinWidth = el.style.minWidth;
  el.style.minWidth = `${MIN_CAPTURE_W}px`;
  el.classList.add("kaizen-print-capture");

  const captureW = Math.max(el.scrollWidth, MIN_CAPTURE_W);

  let canvas;
  try {
    canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#ffffff",
      logging: false,
      width: captureW,
      height: el.scrollHeight,
      windowWidth: 1024,
      ignoreElements,
      onclone: (clonedDoc: Document) => {
        const printArea =
          clonedDoc.getElementById("invoice-print-area") ||
          clonedDoc.getElementById("receipt-print-area") ||
          (clonedDoc.querySelector(".invoice-print-area") as HTMLElement | null);
        if (printArea instanceof HTMLElement) {
          printArea.style.width = "794px";
          printArea.style.minWidth = "794px";
          printArea.style.transform = "none";
        }
      },
    });
  } finally {
    el.style.minWidth = prevMinWidth;
    el.classList.remove("kaizen-print-capture");
  }

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "px",
    format: [canvas.width / 2, canvas.height / 2],
  });
  pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 2, canvas.height / 2);

  return { blob: pdf.output("blob"), pdfName: `${filename}.pdf` };
}

export function useDownloadPDF(
  filename: string,
  options?: { ignoreElements?: (el: Element) => boolean }
) {
  const ref          = useRef<HTMLDivElement>(null);
  // Cached blob — pre-generated in the background so share() fires instantly
  // on iOS (navigator.share must be called within the gesture window).
  const blobCache    = useRef<{ blob: Blob; pdfName: string } | null>(null);
  const [downloading,  setDownloading]  = useState(false);
  const [sharing,      setSharing]      = useState(false);
  const [pregenerating, setPregenerating] = useState(false);

  // ── Pre-generate PDF blob in the background ───────────────────────────────
  // Call this as soon as the document content is fully painted (e.g. in a
  // useEffect after items + profile data are loaded). The cached blob is then
  // consumed instantly by share() — critical for passing iOS gesture checks.
  const preGenerate = async () => {
    if (!ref.current) return;
    setPregenerating(true);
    try {
      blobCache.current = await captureBlob(ref.current, filename, options?.ignoreElements);
    } catch { /* silently ignore — share() will re-try on demand */ }
    setPregenerating(false);
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const download = async () => {
    if (!ref.current) return;
    setDownloading(true);
    try {
      const { blob, pdfName } =
        blobCache.current ?? await captureBlob(ref.current, filename, options?.ignoreElements);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = pdfName; a.style.display = "none";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
    } finally {
      setDownloading(false);
    }
  };

  // ── triggerDownload — shared helper for blob→file download ─────────────────
  const triggerDownload = (blob: Blob, pdfName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = pdfName; a.style.display = "none";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  // ── shareSync — iOS-safe share with loading-toast fallback ────────────────
  // When blob is pre-cached: navigator.share() fires synchronously within the
  // gesture window (iOS-safe). Desktop browsers without Web Share API fall back
  // to a direct download automatically.
  //
  // When blob isn't cached (pre-gen failed/race): an async generation runs with
  // a loading toast, then downloads the result. On iOS this path loses the
  // gesture token so we cannot call share() — a download is the cleanest UX.
  const shareSync = () => {
    const cached = blobCache.current;

    if (cached) {
      const { blob, pdfName } = cached;
      const pdfFile = new File([blob], pdfName, { type: "application/pdf" });

      // File share — WhatsApp, Gmail, AirDrop, Files, etc.
      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [pdfFile] })) {
        setSharing(true);
        navigator.share({ files: [pdfFile], title: filename })
          .catch((err: any) => {
            if (err?.name === "AbortError") return;
            // File share rejected — download as graceful fallback
            triggerDownload(blob, pdfName);
            toast.success("Saved as PDF!");
          })
          .finally(() => setSharing(false));
        return;
      }

      // Desktop / no Web Share API — download directly
      triggerDownload(blob, pdfName);
      toast.success("Downloaded as PDF!");
      return;
    }

    // Blob not ready — generate async then download (gesture context lost, so
    // download is the only reliable cross-platform action available).
    if (!ref.current) { toast.error("Document not ready yet."); return; }
    setSharing(true);
    const loadId = toast.loading("Preparing PDF…");
    captureBlob(ref.current, filename, options?.ignoreElements)
      .then(({ blob, pdfName }) => {
        blobCache.current = { blob, pdfName };
        const pdfFile = new File([blob], pdfName, { type: "application/pdf" });
        toast.dismiss(loadId);
        if (typeof navigator.share === "function" && navigator.canShare?.({ files: [pdfFile] })) {
          return navigator.share({ files: [pdfFile], title: filename, text: `Here is your ${filename}.` })
            .catch((err: any) => {
              if (err?.name === "AbortError") return;
              triggerDownload(blob, pdfName);
              toast.success("Downloaded as PDF!");
            });
        }
        triggerDownload(blob, pdfName);
        toast.success("PDF ready — downloading!");
      })
      .catch(() => toast.error("Could not generate PDF. Please try again.", { id: loadId }))
      .finally(() => setSharing(false));
  };

  // ── share — async version used by the autoShare (off-screen) path ────────
  const share = async () => {
    const captured =
      blobCache.current ??
      (ref.current ? await captureBlob(ref.current, filename, options?.ignoreElements) : null);

    if (captured) {
      const { blob, pdfName } = captured;
      const pdfFile = new File([blob], pdfName, { type: "application/pdf" });

      if (typeof navigator.share === "function" && navigator.canShare?.({ files: [pdfFile] })) {
        await navigator.share({ files: [pdfFile], title: filename });
        return;
      }
      if (typeof navigator.share === "function") {
        await navigator.share({ title: filename, url: window.location.href });
        return;
      }
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl; a.download = pdfName; a.style.display = "none";
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
      return;
    }

    if (typeof navigator.share === "function") {
      await navigator.share({ title: filename, url: window.location.href });
    } else {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  return { ref, download, downloading, shareSync, share, sharing, preGenerate, pregenerating };
}
