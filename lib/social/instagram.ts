export async function publishToInstagram(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const accessToken = process.env.META_ACCESS_TOKEN;
  const igUserId = process.env.INSTAGRAM_BUSINESS_ID;

  if (!accessToken || !igUserId) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  try {
    // Step 1: Create media container
    const containerRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image_url: imageUrl, caption, access_token: accessToken }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error) {
      return { success: false, error: containerData.error?.message || 'Failed to create Instagram container' };
    }

    const creationId = containerData.id;

    // Step 2: Poll until ready (max 30s)
    let ready = false;
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const statusRes = await fetch(
        `https://graph.facebook.com/v20.0/${creationId}?fields=status_code&access_token=${accessToken}`
      );
      const statusData = await statusRes.json();
      if (statusData.status_code === 'FINISHED') { ready = true; break; }
      if (statusData.status_code === 'ERROR') {
        return { success: false, error: 'Media processing failed on Instagram' };
      }
    }

    if (!ready) return { success: false, error: 'Instagram media processing timeout' };

    // Step 3: Publish
    const publishRes = await fetch(`https://graph.facebook.com/v20.0/${igUserId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
    });

    const publishData = await publishRes.json();
    if (!publishRes.ok || publishData.error) {
      return { success: false, error: publishData.error?.message || 'Failed to publish on Instagram' };
    }

    return { success: true, postId: publishData.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
