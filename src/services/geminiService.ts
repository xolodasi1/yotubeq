export async function generateVideoTitle(description: string, category: string) {
  try {
    const response = await fetch('/api/generate-title', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description, category })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || "Без названия";
  } catch (error) {
    console.error("Error generating title:", error);
    throw error;
  }
}

export async function generateVideoDescription(title: string, category: string) {
  try {
    const response = await fetch('/api/generate-description', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, category })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || "";
  } catch (error) {
    console.error("Error generating description:", error);
    throw error;
  }
}

export async function generateVideoTags(title: string, description: string, category: string) {
  try {
    const response = await fetch('/api/generate-tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, category })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.text || "";
  } catch (error) {
    console.error("Error generating tags:", error);
    throw error;
  }
}

export async function generateImage(prompt: string) {
  try {
    const response = await fetch('/api/generate-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.imageUrl;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}
