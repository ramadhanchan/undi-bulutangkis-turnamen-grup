export function absoluteUrl(path: string): string {
  return typeof window === "undefined"
    ? path
    : `${window.location.origin}${path}`;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
