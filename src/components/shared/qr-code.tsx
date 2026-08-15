"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 120 }: { value: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#065f46", // emerald-800
        light: "#ffffff",
      },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(""));
  }, [value, size]);

  if (!dataUrl) return null;

  return (
    <div className="inline-block rounded-lg border-2 border-emerald-600/20 bg-white p-2">
      <img
        src={dataUrl}
        alt="QR code for certificate verification"
        width={size}
        height={size}
        className="rounded"
      />
    </div>
  );
}
