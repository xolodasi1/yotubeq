export async function generateMusic(prompt: string, isFullLength: boolean = false) {
  try {
    const response = await fetch('/api/generate-music', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, isFullLength })
    });
    
    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const { audioBase64, lyrics, mimeType } = data;

    // Decode base64 audio into a playable Blob
    const binary = atob(audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });
    
    return {
      blob,
      lyrics,
      mimeType
    };
  } catch (error) {
    console.error("Error generating music:", error);
    throw error;
  }
}
