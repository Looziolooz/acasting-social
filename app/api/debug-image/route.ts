import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const contentType = response.headers.get('content-type');
    const contentLength = response.headers.get('content-length');
    const buffer = await response.arrayBuffer();

    return NextResponse.json({
      success: true,
      url,
      contentType,
      contentLength,
      actualSize: buffer.byteLength,
      sizeKB: (buffer.byteLength / 1024).toFixed(2),
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
}
