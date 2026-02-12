/**
 * TikTok Content Posting API
 * Requires: TikTok Developer Account + Content Posting API access
 * Docs: https://developers.tiktok.com/doc/content-posting-api-reference-direct-post
 *
 * NOTE: TikTok's API for photo posts uses the "Photo Post" endpoint.
 * This requires the scope: video.publish (used for both video and photo posts)
 */
export async function publishToTikTok(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const accessToken = process.env.TIKTOK_ACCESS_TOKEN;
  const openId = process.env.TIKTOK_OPEN_ID;

  if (!accessToken || !openId) {
    return { success: false, error: 'TikTok credentials not configured' };
  }

  try {
    // Step 1: Initialize photo post
    const initRes = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/content/init/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
        },
        body: JSON.stringify({
          post_info: {
            title: caption.slice(0, 150),
            description: caption.slice(0, 2200),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            photo_cover_index: 0,
            photo_images: [imageUrl],
          },
          post_mode: 'DIRECT_POST',
          media_type: 'PHOTO',
        }),
      }
    );

    const initData = await initRes.json();

    if (!initRes.ok || initData.error?.code !== 'ok') {
      return {
        success: false,
        error: initData.error?.message || 'TikTok init error',
      };
    }

    const publishId = initData.data?.publish_id;
    return { success: true, postId: publishId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
