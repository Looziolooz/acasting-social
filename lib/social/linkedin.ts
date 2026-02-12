export async function publishToLinkedIn(
  imageUrl: string,
  caption: string
): Promise<{ success: boolean; postId?: string; error?: string }> {
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const orgId = process.env.LINKEDIN_ORGANIZATION_ID; // e.g. "123456789"

  if (!accessToken || !orgId) {
    return { success: false, error: 'LinkedIn credentials not configured' };
  }

  const author = `urn:li:organization:${orgId}`;

  try {
    // Step 1: Register image upload
    const registerRes = await fetch(
      'https://api.linkedin.com/v2/assets?action=registerUpload',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify({
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: author,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        }),
      }
    );

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      return { success: false, error: `LinkedIn register error: ${JSON.stringify(registerData)}` };
    }

    const uploadUrl =
      registerData.value?.uploadMechanism?.[
        'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
      ]?.uploadUrl;
    const assetId = registerData.value?.asset;

    if (!uploadUrl || !assetId) {
      return { success: false, error: 'Could not get LinkedIn upload URL' };
    }

    // Step 2: Download image and re-upload to LinkedIn
    const imageRes = await fetch(imageUrl);
    const imageBuffer = await imageRes.arrayBuffer();

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'image/jpeg',
      },
      body: imageBuffer,
    });

    if (!uploadRes.ok) {
      return { success: false, error: 'Failed to upload image to LinkedIn' };
    }

    // Step 3: Create the post
    const postRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: { text: caption },
            shareMediaCategory: 'IMAGE',
            media: [
              {
                status: 'READY',
                description: { text: caption.slice(0, 200) },
                media: assetId,
                title: { text: 'Casting Annons' },
              },
            ],
          },
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
      }),
    });

    const postData = await postRes.json();

    if (!postRes.ok) {
      return { success: false, error: `LinkedIn post error: ${JSON.stringify(postData)}` };
    }

    return { success: true, postId: postData.id };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}
