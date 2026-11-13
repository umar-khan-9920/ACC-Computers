import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { buildUpiPaymentUri, generateQrMatrix } from '../utils/academyLogic';
import { SafeImage } from './SafeImage';

interface QrCodeDisplayProps {
  upiId: string;
  payeeName: string;
  amount: number;
  customQrUrl?: string;
  size?: number;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  upiId,
  payeeName,
  amount,
  customQrUrl,
  size = 180,
}) => {
  const payload = useMemo(
    () => buildUpiPaymentUri({ upiId, payeeName, amount }),
    [upiId, payeeName, amount]
  );

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const fallbackMatrix = useMemo(() => generateQrMatrix(payload, 21), [payload]);

  useEffect(() => {
    let active = true;
    if (customQrUrl && customQrUrl.trim().length > 0) {
      setQrDataUrl('');
      return;
    }

    QRCode.toDataURL(payload, {
      width: size * 2,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F172A',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });

    return () => {
      active = false;
    };
  }, [payload, size, customQrUrl]);

  if (customQrUrl && customQrUrl.trim().length > 0) {
    return (
      <div
        className="bg-white border border-slate-200 rounded-xl p-3 inline-flex items-center justify-center"
        style={{ width: size + 24, height: size + 24 }}
      >
        <SafeImage
          src={customQrUrl}
          alt={`Payment QR code for ${payeeName}`}
          className="w-full h-full object-contain rounded-lg"
          fallbackLabel="Payment QR"
        />
      </div>
    );
  }

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-3 inline-flex flex-col items-center justify-center"
      aria-label={`UPI QR Code for ${upiId}`}
      data-upi-uri={payload}
    >
      {qrDataUrl ? (
        <img
          src={qrDataUrl}
          alt={`Scannable UPI payment QR for ${payeeName} (${upiId})`}
          width={size}
          height={size}
          className="block rounded"
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 21 21"
          shapeRendering="crispEdges"
          role="img"
          aria-label={`Scannable UPI payment QR for ${payeeName}`}
        >
          <rect width="21" height="21" fill="#FFFFFF" />
          {fallbackMatrix.map((row, r) =>
            row.map((filled, c) =>
              filled ? <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#0F172A" /> : null
            )
          )}
        </svg>
      )}
    </div>
  );
};
