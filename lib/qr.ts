import QRCode from "qrcode";

export async function generateQRCode(url: string): Promise<string> {
  if (!url) return "";
  try {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: {
        dark: "#1B2A4A",
        light: "#FDFAF4",
      },
      errorCorrectionLevel: "M",
    });
    return dataUrl;
  } catch {
    return "";
  }
}
