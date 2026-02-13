export async function publishToFacebook(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const pageId = process.env.FACEBOOK_PAGE_ID;

  if (!accessToken || !pageId) {
    return { success: false, error: 'Facebook credentials not configured' };
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v20.0/${pageId}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, caption, access_token: accessToken, published: true }),
    });

    const data = await res.json();
    if (!res.ok || data.error) {
      return { success: false, error: data.error?.message || 'Facebook API error' };
    }

    return { success: true, postId: data.post_id || data.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
